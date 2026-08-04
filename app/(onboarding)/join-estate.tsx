import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { AuthShell } from '../../components/auth/AuthShell';
import { EstatePicker } from '../../components/onboarding/EstatePicker';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import type { Estate, EstateJoinRequest } from '../../types/database';

export default function JoinEstateScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const [estate, setEstate] = useState<Estate | null>(null);
  const [unitNo, setUnitNo] = useState('');
  const [errors, setErrors] = useState<{ estate?: string; unitNo?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [wasRejected, setWasRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('estate_join_requests')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const latest = data as EstateJoinRequest | null;
        setWasRejected(latest?.status === 'rejected');
      });
  }, [profile]);

  async function handleSubmit() {
    if (!profile) return;
    const nextErrors = {
      estate: estate ? undefined : 'Search for and select your estate.',
      unitNo: unitNo.trim() ? undefined : 'Enter your unit or house number.',
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.estate || nextErrors.unitNo) return;

    setSubmitting(true);
    const { error } = await supabase.from('estate_join_requests').insert({
      profile_id: profile.id,
      estate_id: estate!.id,
      unit_no: unitNo.trim(),
    });
    setSubmitting(false);

    if (error) {
      setFormError(
        error.code === '23505'
          ? 'You already have a request in review. No need to submit another.'
          : error.message
      );
      return;
    }
    router.replace('/onboarding');
  }

  return (
    <AuthShell
      title="Join your estate"
      subtitle="Tell us where you live. Your estate admin confirms this against their records before you get access."
    >
      {wasRejected && (
        <Notice
          tone="info"
          message="Your last request wasn’t approved. Double-check the estate and unit number and try again."
        />
      )}
      {formError && <Notice message={formError} />}

      <EstatePicker
        value={estate}
        onChange={(e) => {
          setEstate(e);
          if (errors.estate) setErrors((er) => ({ ...er, estate: undefined }));
        }}
        error={errors.estate}
      />

      <Input
        label="Unit / house number"
        placeholder="e.g. B12"
        autoCapitalize="characters"
        value={unitNo}
        onChangeText={(v) => {
          setUnitNo(v);
          if (errors.unitNo) setErrors((er) => ({ ...er, unitNo: undefined }));
        }}
        error={errors.unitNo}
      />

      <Button label="Request approval" onPress={handleSubmit} loading={submitting} />
    </AuthShell>
  );
}
