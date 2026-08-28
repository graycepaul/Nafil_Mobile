import * as ImagePicker from 'expo-image-picker';

type PickPhotoResult = { uri: string } | { cancelled: true } | { error: string };

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
  });
  if (result.canceled || !result.assets[0]) return { cancelled: true };

  return { uri: result.assets[0].uri };
}
