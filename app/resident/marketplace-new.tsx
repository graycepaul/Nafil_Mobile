import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { pickPhoto } from '../../lib/pick-photo';
import { uploadListingPhotos } from '../../lib/listing-photos';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import {
  GOOD_CATEGORIES,
  SERVICE_CATEGORIES,
  type ListingCategory,
} from '../../components/resident/marketplace-categories';
import type { Listing, ListingType } from '../../types/database';

const MAX_PHOTOS = 6;

const TYPE_OPTIONS: { value: ListingType; label: string; hint: string }[] = [
  { value: 'good', label: 'Good', hint: 'An item you’re selling or swapping' },
  { value: 'service', label: 'Service', hint: 'Work you or your business offers' },
];

const DESCRIPTION_PLACEHOLDER: Record<ListingType, string> = {
  good: 'Condition, pickup details, anything a buyer should know',
  service: "Scope of work, what's included, anything a customer should know",
};

export default function NewMarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingListing, isLoading: loadingExisting } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Listing;
    },
    enabled: isEditing,
  });

  if (isEditing && loadingExisting) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <CardSkeletonList />
      </View>
    );
  }

  // Keyed by listing id so a fresh mount (and fresh initial state below) happens
  // per listing rather than reusing state across a back-then-edit-another navigation.
  return <MarketplaceForm key={id ?? 'new'} listingId={id} initial={existingListing} />;
}

function MarketplaceForm({ listingId, initial }: { listingId?: string; initial?: Listing }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const isEditing = !!listingId;

  const [type, setType] = useState<ListingType>(initial?.type ?? 'good');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [priceTo, setPriceTo] = useState(initial?.price_max ? String(initial.price_max) : '');
  const [category, setCategory] = useState<ListingCategory>(
    (initial?.category as ListingCategory) ?? GOOD_CATEGORIES[0]
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [photos, setPhotos] = useState<string[]>(initial?.photo_urls ?? []);
  const [photoMimeTypes, setPhotoMimeTypes] = useState<Record<string, string | null>>({});
  const [pickupAvailable, setPickupAvailable] = useState(initial?.pickup ?? true);
  const [pickupAddress, setPickupAddress] = useState(initial?.pickup_address ?? '');
  const [homeDeliveryAvailable, setHomeDeliveryAvailable] = useState(initial?.home_delivery ?? false);
  const [deliveryFee, setDeliveryFee] = useState(initial?.delivery_fee ? String(initial.delivery_fee) : '');
  const [freeDelivery, setFreeDelivery] = useState(
    initial ? initial.home_delivery && initial.delivery_fee === 0 : false
  );
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const categoryOptions = type === 'good' ? GOOD_CATEGORIES : SERVICE_CATEGORIES;

  function handleTypeChange(next: ListingType) {
    setType(next);
    const options = next === 'good' ? GOOD_CATEGORIES : SERVICE_CATEGORIES;
    if (!options.includes(category)) setCategory(options[0]);
  }

  async function addPhoto() {
    if (photos.length >= MAX_PHOTOS) return;
    const result = await pickPhoto();
    if ('uri' in result) {
      setPhotos((prev) => [...prev, result.uri]);
      setPhotoMimeTypes((prev) => ({ ...prev, [result.uri]: result.mimeType }));
    } else if ('error' in result) setError(result.error);
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  const deliveryMethodChosen = type !== 'good' || pickupAvailable || homeDeliveryAvailable;
  const pickupAddressValid = type !== 'good' || !pickupAvailable || pickupAddress.trim().length > 0;
  const deliveryValid = deliveryMethodChosen && pickupAddressValid;
  const whatsappValid = type !== 'service' || whatsapp.trim().length > 0;
  const priceValid = type === 'good' ? Number(price) > 0 : Number(price) > 0 && Number(priceTo) >= Number(price);
  const canSubmit = title.trim() && priceValid && description.trim() && deliveryValid && whatsappValid;

  async function handleSubmit() {
    if (!canSubmit || !profile?.estate_id) return;
    setError(undefined);
    setSubmitting(true);

    try {
      const existingUrls = photos.filter((p) => p.startsWith('http'));
      const newLocalPhotos = photos
        .filter((p) => !p.startsWith('http'))
        .map((uri) => ({ uri, mimeType: photoMimeTypes[uri] ?? null }));
      const uploadedUrls =
        newLocalPhotos.length > 0 ? await uploadListingPhotos(profile.id, newLocalPhotos) : [];
      const photoUrls = [...existingUrls, ...uploadedUrls];

      const fields = {
        type,
        title: title.trim(),
        description: description.trim(),
        category,
        price: Number(price),
        price_max: type === 'service' && priceTo.trim() ? Number(priceTo) : null,
        photo_urls: photoUrls,
        pickup: type === 'good' && pickupAvailable,
        pickup_address: type === 'good' && pickupAvailable ? pickupAddress.trim() : null,
        home_delivery: type === 'good' && homeDeliveryAvailable,
        delivery_fee: type === 'good' && homeDeliveryAvailable && !freeDelivery ? Number(deliveryFee) || 0 : 0,
        whatsapp: type === 'service' ? whatsapp.trim() : null,
      };

      if (isEditing) {
        const { error: updateError } = await supabase.from('listings').update(fields).eq('id', listingId);
        if (updateError) throw updateError;
        await queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      } else {
        const { error: insertError } = await supabase.from('listings').insert({
          estate_id: profile.estate_id,
          seller_id: profile.id,
          ...fields,
        });
        if (insertError) throw insertError;
      }

      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      await queryClient.invalidateQueries({ queryKey: ['store_listings', profile.id] });
      // Not router.back(): this screen is a pushed href:null route reached
      // from either Market (new) or Store (edit), and on web that back-stack
      // hop unreliably lands on the Tabs navigator's initial route (Home)
      // instead of the actual previous screen. Navigate explicitly instead.
      router.replace(isEditing ? '/resident/store' : '/resident/marketplace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish this listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable
          onPress={() => router.replace(isEditing ? '/resident/store' : '/resident/marketplace')}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">
          {isEditing ? 'Edit listing' : 'New listing'}
        </Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        {error && <Notice message={error} />}

        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">What are you listing?</Text>
        <View className="mb-lg flex-row gap-sm">
          {TYPE_OPTIONS.map((option) => {
            const active = type === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleTypeChange(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`flex-1 rounded-md border p-md ${
                  active
                    ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-surface'
                    : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
                }`}
              >
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{option.label}</Text>
                <Text className="mt-0.5 text-[12px] text-paper-500 dark:text-ink-textMuted">{option.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input label="Title" showLabel placeholder="e.g. 3-seater fabric sofa" value={title} onChangeText={setTitle} />

        <View className="flex-row gap-sm">
          <View className="flex-1">
            <Select
              label="Category"
              showLabel
              value={category}
              onChange={setCategory}
              options={categoryOptions.map((c) => ({ value: c, label: c }))}
            />
          </View>
          <View className="flex-1">
            {type === 'good' ? (
              <Input
                label="Price (₦)"
                showLabel
                placeholder="e.g. 25000"
                keyboardType="number-pad"
                value={price}
                onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
              />
            ) : (
              <>
                <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Price range (₦)</Text>
                <View className="flex-row gap-xs">
                  <View className="flex-1">
                    <Input
                      placeholder="From"
                      keyboardType="number-pad"
                      accessibilityLabel="Price from"
                      value={price}
                      onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      placeholder="To"
                      keyboardType="number-pad"
                      accessibilityLabel="Price to"
                      value={priceTo}
                      onChangeText={(v) => setPriceTo(v.replace(/[^0-9]/g, ''))}
                    />
                  </View>
                </View>
                {price.trim() && priceTo.trim() && Number(priceTo) < Number(price) && (
                  <Text className="mb-lg -mt-sm text-[13px] text-danger">
                    &quot;To&quot; must be at least &quot;From&quot;.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        <Input
          label="Description"
          showLabel
          placeholder={DESCRIPTION_PLACEHOLDER[type]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {type === 'good' && (
          <View className="mb-lg">
            <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Delivery method</Text>
            <Pressable
              onPress={() => setPickupAvailable((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: pickupAvailable }}
              className="mb-sm flex-row items-center gap-md rounded-md border border-paper-200 p-md dark:border-ink-border"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                  pickupAvailable ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300' : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                {pickupAvailable && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
              </View>
              <Text className="flex-1 text-base text-paper-900 dark:text-ink-text">Available for pickup</Text>
            </Pressable>

            {pickupAvailable && (
              <View className="pl-lg">
                <Input
                  label="Pickup address"
                  showLabel
                  placeholder="e.g. Block B, Flat 12"
                  hint="Shown to buyers who choose to pick up rather than have it delivered."
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                />
              </View>
            )}

            <Pressable
              onPress={() => setHomeDeliveryAvailable((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: homeDeliveryAvailable }}
              className="flex-row items-center gap-md rounded-md border border-paper-200 p-md dark:border-ink-border"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                  homeDeliveryAvailable ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300' : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                {homeDeliveryAvailable && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
              </View>
              <Text className="flex-1 text-base text-paper-900 dark:text-ink-text">Offer home delivery</Text>
            </Pressable>

            {homeDeliveryAvailable && (
              <View className="mt-sm pl-lg">
                <Input
                  label="Delivery fee (₦)"
                  showLabel
                  placeholder="e.g. 2000"
                  hint="Applies to delivery within the estate only."
                  keyboardType="number-pad"
                  editable={!freeDelivery}
                  value={freeDelivery ? '' : deliveryFee}
                  onChangeText={(v) => setDeliveryFee(v.replace(/[^0-9]/g, ''))}
                />
                <Pressable
                  onPress={() => setFreeDelivery((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: freeDelivery }}
                  className="mb-lg flex-row items-center gap-md"
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded border-[1.5px] ${
                      freeDelivery ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300' : 'border-paper-200 dark:border-ink-border'
                    }`}
                  >
                    {freeDelivery && <Ionicons name="checkmark" size={13} color={colors.onButtonFill} />}
                  </View>
                  <Text className="text-base text-paper-900 dark:text-ink-text">Delivery is free</Text>
                </Pressable>
              </View>
            )}

          </View>
        )}

        {type === 'service' && (
          <Input
            label="WhatsApp number"
            showLabel
            placeholder="e.g. 2348012345678"
            keyboardType="phone-pad"
            hint="Buyers tap “Message on WhatsApp” to reach you directly to book or ask questions."
            value={whatsapp}
            onChangeText={setWhatsapp}
          />
        )}

        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
          Photos ({photos.length}/{MAX_PHOTOS})
        </Text>
        <View className="mb-lg flex-row flex-wrap gap-sm">
          {photos.map((uri) => (
            <View key={uri} className="relative">
              <Image source={{ uri }} className="h-20 w-20 rounded-md" />
              <Pressable
                onPress={() => removePhoto(uri)}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={8}
                className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-danger"
              >
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable
              onPress={addPhoto}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              className="h-20 w-20 items-center justify-center rounded-md border border-dashed border-paper-200 dark:border-ink-border"
            >
              <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Button
          label={isEditing ? 'Save changes' : 'Publish listing'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
        />
      </ScrollView>
    </View>
  );
}
