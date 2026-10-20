import { useMemo, useRef, useState } from 'react';
import { View, Text, Platform, ScrollView, KeyboardAvoidingView, Keyboard } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { createSupabaseGateApi, performCheckIn } from '../../lib/gate-checkin';
import { useAuthStore } from '../../store/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ScheduledVisitLookup } from '../../components/security/ScheduledVisitLookup';
import { ScanResultModal, type ScanResult } from '../../components/security/ScanResultModal';
import type { VisitorLogMethod } from '../../types/database';

export default function SecurityScanScreen() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const gateApi = useMemo(() => createSupabaseGateApi(supabase), []);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  // CameraView can fire onBarcodeScanned several times for the same code
  // before React re-renders with the prop that would disable it (`scanning`
  // flipping to false only takes effect next render) - a ref is checked and
  // set synchronously, so it blocks every scan after the first one even
  // within the same frame, unlike the `processing` state check below.
  const scanLockRef = useRef(false);
  // Same reason, for "a check-in is already running": state would lag a render.
  const processingRef = useRef(false);

  function closeResult() {
    setResult(null);
    setScanning(true);
    scanLockRef.current = false;
  }

  function refreshLogs() {
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_active', profile?.estate_id] });
    queryClient.invalidateQueries({ queryKey: ['visitor_logs_all', profile?.estate_id] });
  }

  /**
   * Runs one check-in and always ends in a dialog the guard can dismiss. The
   * dialog's close is what releases the scan lock, so every path out of here
   * must show a result: there is no early return and no way to throw past it.
   */
  async function checkInByCode(rawCode: string, via: VisitorLogMethod) {
    // A second tap before the button has re-rendered as "loading". Returning
    // here is safe: it has not touched the scan lock.
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    Keyboard.dismiss();

    let next: ScanResult;
    try {
      if (!profile?.estate_id) {
        next = {
          tone: 'error',
          title: 'No estate assigned',
          message: "This account isn't assigned to an estate, so it can't check anyone in.",
        };
      } else {
        const outcome = await performCheckIn(
          gateApi,
          { estateId: profile.estate_id, securityId: profile.id },
          rawCode,
          via
        );
        next = outcome.result;
        if (outcome.changed) refreshLogs();
        if (outcome.result.tone === 'success') setManualCode('');
      }
    } catch {
      next = {
        tone: 'error',
        title: "Couldn't check this code",
        message: 'Something went wrong. Nobody has been checked in. Try again.',
      };
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
    setResult(next);
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

  // The result dialog is rendered beside the ScrollView, not inside it: Overlay
  // fills its nearest positioned parent, and inside a ScrollView that is the
  // scroll *content*, so on a tall screen (search results, keyboard open) the
  // dialog was centered below the visible area with its button off screen.

  if (!canScan) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <KeyboardAvoidingView
          className="flex-1 bg-white dark:bg-ink-bg"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerClassName="p-lg" keyboardShouldPersistTaps="handled">
            <Text className="mb-lg text-[13px] text-paper-500 dark:text-ink-textMuted">
              QR scanning needs the camera on a phone. On web, enter the visitor&apos;s code manually.
            </Text>
            {manualEntry}
            <ScheduledVisitLookup />
          </ScrollView>
        </KeyboardAvoidingView>
        <ScanResultModal result={result} onClose={closeResult} />
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
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-ink-bg"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerClassName="p-lg" keyboardShouldPersistTaps="handled">
          <View className="h-[320px] overflow-hidden rounded-lg bg-black">
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={
                scanning
                  ? ({ data }) => {
                      // Ignore (without locking) a scan that arrives while a manual
                      // check-in is still running, so the camera is not left disabled
                      // with no dialog to bring it back.
                      if (scanLockRef.current || processingRef.current) return;
                      scanLockRef.current = true;
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
        </ScrollView>
      </KeyboardAvoidingView>
      <ScanResultModal result={result} onClose={closeResult} />
    </View>
  );
}
