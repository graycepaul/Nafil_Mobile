import { useState } from 'react';
import { View, Text, Platform, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ScheduledVisitLookup } from '../../components/security/ScheduledVisitLookup';
import { ScanResultModal, type ScanResult } from '../../components/security/ScanResultModal';
import type { VisitorPass, HouseholdMember, Profile, VisitorLogMethod } from '../../types/database';

export default function SecurityScanScreen() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  function closeResult() {
    setResult(null);
    setScanning(true);
  }

  function refreshLogs() {
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_active', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_all', profile?.estate_id] });
  }

  async function checkInByCode(rawCode: string, via: VisitorLogMethod) {
    if (!profile?.estate_id || processing) return;
    setProcessing(true);
    const code = rawCode.trim().toUpperCase();

    // Resident e-ID and household/frequent-visitor codes are standing
    // credentials, not single-use passes — there's nothing to "use up" and no
    // gate log entry to write, just an identity check against the estate's
    // own database. That's the actual anti-forgery property: the card's photo
    // and name are for the guard's own eyes, but only a match against this
    // live lookup — not the printed card itself — means anything.
    const { data: residentMatch } = await supabase
      .from('profiles')
      .select('*')
      .eq('resident_code', code)
      .eq('estate_id', profile.estate_id)
      .eq('role', 'resident')
      .maybeSingle<Profile>();

    if (residentMatch) {
      await supabase.from('visitor_logs').insert({
        estate_id: profile.estate_id,
        security_id: profile.id,
        visitor_name: residentMatch.full_name ?? 'Resident',
        method: via,
      });
      refreshLogs();
      setResult({
        tone: 'success',
        title: 'Resident verified',
        rows: [
          { label: 'Name', value: residentMatch.full_name ?? 'Resident' },
          { label: 'Unit', value: residentMatch.unit_no ?? 'N/A' },
        ],
      });
      setManualCode('');
      setProcessing(false);
      return;
    }

    const { data: householdMatch } = await supabase
      .from('household_members')
      .select('*')
      .eq('code', code)
      .eq('estate_id', profile.estate_id)
      .maybeSingle<HouseholdMember>();

    if (householdMatch) {
      if (householdMatch.status === 'revoked') {
        setResult({
          tone: 'error',
          title: 'Access denied',
          message: `${householdMatch.full_name}'s access was revoked by the resident.`,
        });
      } else if (householdMatch.status === 'pending_review') {
        setResult({
          tone: 'error',
          title: 'Needs review',
          message: `${householdMatch.full_name}'s card is due for the resident to review before it can be used again.`,
        });
      } else {
        // Supabase's query/rpc builders are lazy thenables: the request
        // only actually fires once something awaits or .then()s them, so
        // this has to be awaited even though the result itself is ignored.
        // Only records the scan timestamp (a DB trigger turns that into a
        // notification to the resident) — not part of the access decision
        // itself, so a failure here doesn't block or contradict the
        // "Verified" message the guard already sees.
        await supabase.rpc('record_household_member_scan', { member_id: householdMatch.id });
        await supabase.from('visitor_logs').insert({
          estate_id: profile.estate_id,
          security_id: profile.id,
          visitor_name: householdMatch.full_name,
          method: via,
        });
        refreshLogs();
        setResult({
          tone: 'success',
          title: 'Access granted',
          rows: [
            { label: 'Name', value: householdMatch.full_name },
            { label: 'Relationship', value: householdMatch.relationship },
          ],
        });
      }
      setManualCode('');
      setProcessing(false);
      return;
    }

    const { data: pass, error: fetchError } = await supabase
      .from('visitor_passes')
      .select('*')
      .eq('code', code)
      .eq('estate_id', profile.estate_id)
      .maybeSingle<VisitorPass>();

    if (fetchError || !pass) {
      setResult({
        tone: 'error',
        title: 'Not recognized',
        message: "This code doesn't match a resident ID, household card, or visitor pass for your estate.",
      });
      setProcessing(false);
      return;
    }

    if (pass.status !== 'pending') {
      setResult({
        tone: 'error',
        title: 'Invalid pass',
        message: `This pass is already "${pass.status}".`,
      });
      setProcessing(false);
      return;
    }

    // status='pending' only means "not yet used or revoked" — it does NOT mean
    // "still within its validity window." Nothing flips status to 'expired'
    // automatically (that's a scheduled job that isn't deployed), so this check
    // is the actual enforcement, not a redundant one. Without it, a pass whose
    // window lapsed hours ago still reads as valid at the gate.
    const now = Date.now();
    if (new Date(pass.valid_until).getTime() < now) {
      setResult({ tone: 'error', title: 'Pass expired', message: `${pass.visitor_name}'s pass can no longer be used.` });
      setProcessing(false);
      return;
    }
    if (new Date(pass.valid_from).getTime() > now) {
      setResult({ tone: 'error', title: 'Not yet valid', message: `${pass.visitor_name}'s pass isn't valid until later.` });
      setProcessing(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('visitor_passes')
      .update({ status: 'used' })
      .eq('id', pass.id);

    if (!updateError) {
      await supabase.from('visitor_logs').insert({
        estate_id: profile.estate_id,
        pass_id: pass.id,
        security_id: profile.id,
        visitor_name: pass.visitor_name,
        vehicle_plate: pass.vehicle_plate,
        method: via,
      });
      refreshLogs();
      setResult({
        tone: 'success',
        title: 'Checked in',
        rows: [
          { label: 'Name', value: pass.visitor_name },
          ...(pass.vehicle_plate ? [{ label: 'Vehicle', value: pass.vehicle_plate }] : []),
        ],
      });
    } else {
      setResult({ tone: 'error', title: 'Check-in failed', message: updateError.message });
    }

    setManualCode('');
    setProcessing(false);
  }

  // QR scanning needs a real camera + the native barcode detector. On web we go
  // straight to manual entry rather than showing a viewfinder that can't scan.
  const canScan = Platform.OS !== 'web';

  const manualEntry = (
    <>
      <Input
        label={canScan ? undefined : 'Visitor code'}
        value={manualCode}
        onChangeText={setManualCode}
        autoCapitalize="characters"
        placeholder="NAF001"
      />
      <Button
        label="Check in"
        onPress={() => checkInByCode(manualCode, 'manual')}
        loading={processing}
        disabled={!manualCode.trim()}
      />
    </>
  );

  if (!canScan) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-ink-bg" contentContainerClassName="p-lg">
        <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
          QR scanning needs the camera on a phone. On web, enter the visitor&apos;s code manually.
        </Text>
        {manualEntry}
        <ScheduledVisitLookup />
        <ScanResultModal result={result} onClose={closeResult} />
      </ScrollView>
    );
  }

  if (!permission) return <View className="flex-1 bg-white p-lg dark:bg-ink-bg" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-lg dark:bg-ink-bg">
        <Text className="mb-lg text-center text-base text-paper-900 dark:text-ink-text">
          Camera access is needed to scan visitor QR codes.
        </Text>
        <Button label="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-ink-bg" contentContainerClassName="p-lg">
      <View className="h-[320px] overflow-hidden rounded-lg bg-black">
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            scanning
              ? ({ data }) => {
                  setScanning(false);
                  checkInByCode(data, 'qr');
                }
              : undefined
          }
        />
      </View>

      <Text className="my-lg text-center text-[13px] text-paper-500 dark:text-ink-textMuted">
        or enter code manually
      </Text>

      {manualEntry}
      <ScheduledVisitLookup />
      <ScanResultModal result={result} onClose={closeResult} />
    </ScrollView>
  );
}
