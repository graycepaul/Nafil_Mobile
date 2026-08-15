import { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import type { VisitorPass, HouseholdMember, Profile } from '../../types/database';

type NoticeTone = 'error' | 'success' | 'info';

export default function SecurityScanScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);

  async function checkInByCode(rawCode: string) {
    if (!profile?.estate_id || processing) return;
    setProcessing(true);
    setNotice(null);
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
      setNotice({
        tone: 'success',
        message: `Resident verified: ${residentMatch.full_name ?? 'Resident'}, Unit ${residentMatch.unit_no ?? 'N/A'}.`,
      });
      setManualCode('');
      setProcessing(false);
      setScanning(true);
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
        setNotice({
          tone: 'error',
          message: `Revoked: ${householdMatch.full_name}'s access was revoked by the resident.`,
        });
      } else {
        setNotice({
          tone: 'success',
          message: `Verified: ${householdMatch.full_name} (${householdMatch.relationship}).`,
        });
      }
      setManualCode('');
      setProcessing(false);
      setScanning(true);
      return;
    }

    const { data: pass, error: fetchError } = await supabase
      .from('visitor_passes')
      .select('*')
      .eq('code', code)
      .eq('estate_id', profile.estate_id)
      .maybeSingle<VisitorPass>();

    if (fetchError || !pass) {
      setNotice({
        tone: 'error',
        message: "Not found: this code doesn't match a resident ID, household card, or visitor pass for your estate.",
      });
      setProcessing(false);
      setScanning(true);
      return;
    }

    if (pass.status !== 'pending') {
      setNotice({ tone: 'error', message: `Invalid pass: this pass is already "${pass.status}".` });
      setProcessing(false);
      setScanning(true);
      return;
    }

    // status='pending' only means "not yet used or revoked" — it does NOT mean
    // "still within its validity window." Nothing flips status to 'expired'
    // automatically (that's a scheduled job that isn't deployed), so this check
    // is the actual enforcement, not a redundant one. Without it, a pass whose
    // window lapsed hours ago still reads as valid at the gate.
    const now = Date.now();
    if (new Date(pass.valid_until).getTime() < now) {
      setNotice({ tone: 'error', message: `Expired: ${pass.visitor_name}'s pass expired and can no longer be used.` });
      setProcessing(false);
      setScanning(true);
      return;
    }
    if (new Date(pass.valid_from).getTime() > now) {
      setNotice({ tone: 'error', message: `Not yet valid: ${pass.visitor_name}'s pass isn't valid until later.` });
      setProcessing(false);
      setScanning(true);
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
        method: 'qr',
      });
      setNotice({ tone: 'success', message: `Checked in: ${pass.visitor_name} has been checked in.` });
    } else {
      setNotice({ tone: 'error', message: updateError.message });
    }

    setManualCode('');
    setProcessing(false);
    setScanning(true);
  }

  // QR scanning needs a real camera + the native barcode detector. On web we go
  // straight to manual entry rather than showing a viewfinder that can't scan.
  const canScan = Platform.OS !== 'web';

  const header = notice ? <Notice tone={notice.tone} message={notice.message} /> : null;

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
        onPress={() => checkInByCode(manualCode)}
        loading={processing}
        disabled={!manualCode.trim()}
      />
    </>
  );

  if (!canScan) {
    return (
      <View className="flex-1 bg-white p-lg dark:bg-ink-bg">
        {header}
        <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
          QR scanning needs the camera on a phone. On web, enter the visitor&apos;s code manually.
        </Text>
        {manualEntry}
      </View>
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
    <View className="flex-1 bg-white p-lg dark:bg-ink-bg">
      {header}
      <View className="h-[320px] overflow-hidden rounded-lg bg-black">
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            scanning
              ? ({ data }) => {
                  setScanning(false);
                  checkInByCode(data);
                }
              : undefined
          }
        />
      </View>

      <Text className="my-lg text-center text-[13px] text-paper-500 dark:text-ink-textMuted">
        or enter code manually
      </Text>

      {manualEntry}
    </View>
  );
}
