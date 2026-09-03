import * as ImagePicker from 'expo-image-picker';

type PickPhotoResult = { uri: string; mimeType: string | null } | { cancelled: true } | { error: string };

/**
 * Opens the photo library and returns the picked image's local URI, nothing
 * more. Unlike `lib/avatar.ts`'s pickers, this never uploads anywhere. It
 * exists for the marketplace listing form's photo UI while there's still no
 * `listing_photos` storage bucket or table, so picking multiple photos and
 * removing them can be built and reviewed now, and wired to real uploads
 * later without changing this call site.
 */
export async function pickPhoto(): Promise<PickPhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Photo library access is needed to add photos.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    // Without this, iOS can hand back the original HEIC file for a photo
    // taken on an iPhone — Supabase Storage's allowed_mime_types rejects it
    // outright ("mime type image/heic is not supported"), and even if it
    // didn't, HEIC doesn't render reliably outside Apple's own stack (not in
    // most browsers, not in every Android decoder). "Compatible" has the
    // system hand back a JPEG instead of the original HEIC.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets[0]) return { cancelled: true };

  return { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? null };
}
