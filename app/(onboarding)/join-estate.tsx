import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { pickPhoto } from '../../lib/pick-photo';
import { uploadIdDocument } from '../../lib/id-document';
import { AuthShell } from '../../components/auth/AuthShell';
import { EstatePicker } from '../../components/onboarding/EstatePicker';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Notice } from '../../components/ui/Notice';
import type { Estate, EstateJoinRequest, ResidentCategory } from '../../types/database';

const CATEGORY_OPTIONS: { value: ResidentCategory; label: string; hint: string }[] = [
  { value: 'civilian', label: 'Civilian', hint: 'Utility bill or NIN card' },
  { value: 'personnel', label: 'Personnel', hint: 'Service ID card + service number' },
];

export default function JoinEstateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);

  const [estate, setEstate] = useState<Estate | null>(null);
  const [unitNo, setUnitNo] = useState('');
  const [category, setCategory] = useState<ResidentCategory | null>(null);
  const [serviceNumber, setServiceNumber] = useState('');
  const [idPhoto, setIdPhoto] = useState<{ uri: string; mimeType: string | null }>();
  const [errors, setErrors] = useState<{
    estate?: string;
    unitNo?: string;
    category?: string;
    idPhoto?: string;
    serviceNumber?: string;
  }>({});
  const [formError, setFormError] = useState<string>();
  const [wasRejected, setWasRejected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleCategoryChange(next: ResidentCategory) {
    setCategory(next);
    if (errors.category) setErrors((e) => ({ ...e, category: undefined }));
    if (next === 'civilian' && errors.serviceNumber) {
      setErrors((e) => ({ ...e, serviceNumber: undefined }));
    }
  }

  async function addIdPhoto() {
    const result = await pickPhoto();
    if ('uri' in result) {
      setIdPhoto({ uri: result.uri, mimeType: result.mimeType });
      if (errors.idPhoto) setErrors((e) => ({ ...e, idPhoto: undefined }));
    } else if ('error' in result) {
      setFormError(result.error);
    }
  }

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
      category: category ? undefined : 'Select whether you’re a civilian or personnel resident.',
      idPhoto: idPhoto
        ? undefined
        : category === 'personnel'
          ? 'Add a photo of your service ID card.'
          : 'Add a photo of a utility bill or your NIN card.',
      serviceNumber:
        category === 'personnel' && !serviceNumber.trim() ? 'Enter your service number.' : undefined,
    };
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const idDocumentPath = await uploadIdDocument(profile.id, idPhoto!);
      const { error } = await supabase.from('estate_join_requests').insert({
        profile_id: profile.id,
        estate_id: estate!.id,
        unit_no: unitNo.trim(),
        resident_category: category,
        id_document_path: idDocumentPath,
        service_number: category === 'personnel' ? serviceNumber.trim() : null,
      });
      if (error) throw error;
      router.replace('/onboarding');
    } catch (err) {
      const dbError = err as { code?: string; message?: string };
      setFormError(
        dbError.code === '23505'
          ? 'You already have a request in review. No need to submit another.'
          : (dbError.message ?? 'Could not submit your request. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
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

      <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
        Which best describes you?
      </Text>
      <View className="mb-lg flex-row gap-sm">
        {CATEGORY_OPTIONS.map((option) => {
          const active = category === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleCategoryChange(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              className={`flex-1 rounded-md border p-md ${
                active
                  ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-surface'
                  : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
              }`}
            >
              <View className="flex-row items-center gap-sm">
                <View
                  className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                    active ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300' : 'border-paper-200 dark:border-ink-border'
                  }`}
                >
                  {active && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
                </View>
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {option.label}
                </Text>
              </View>
              <Text className="mt-xs text-[12px] text-paper-500 dark:text-ink-textMuted">{option.hint}</Text>
            </Pressable>
          );
        })}
      </View>
      {errors.category && (
        <Text className="-mt-md mb-lg text-[13px] text-danger">{errors.category}</Text>
      )}

      {category === 'personnel' && (
        <Input
          label="Service number"
          placeholder="e.g. NA/12345"
          autoCapitalize="characters"
          value={serviceNumber}
          onChangeText={(v) => {
            setServiceNumber(v);
            if (errors.serviceNumber) setErrors((e) => ({ ...e, serviceNumber: undefined }));
          }}
          error={errors.serviceNumber}
        />
      )}

      {category && (
        <View className="mb-lg">
          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
            {category === 'personnel' ? 'Service ID card' : 'Utility bill or NIN card'}
          </Text>
          {idPhoto ? (
            <View className="relative self-start">
              <Image source={{ uri: idPhoto.uri }} className="h-28 w-28 rounded-md" />
              <Pressable
                onPress={() => setIdPhoto(undefined)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-danger"
              >
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={addIdPhoto}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              className={`h-28 w-28 items-center justify-center rounded-md border border-dashed ${
                errors.idPhoto ? 'border-danger' : 'border-paper-200 dark:border-ink-border'
              }`}
            >
              <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
            </Pressable>
          )}
          {errors.idPhoto && <Text className="mt-xs text-[13px] text-danger">{errors.idPhoto}</Text>}
          <Text className="mt-sm text-[12px] text-paper-500 dark:text-ink-textMuted">
            Only your estate admin can view this - it’s used to confirm your identity before approval.
          </Text>
        </View>
      )}

      <Button label="Request approval" onPress={handleSubmit} loading={submitting} />
    </AuthShell>
  );
}
