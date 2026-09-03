import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

interface PickAndUploadResult {
  url?: string;
  cancelled?: boolean;
  error?: string;
}

async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Photo library access is needed to set a profile picture.' } as const;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return { cancelled: true } as const;

  return { asset: result.assets[0] } as const;
}

async function uploadToPath(uri: string, mimeType: string | null | undefined, path: string) {
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const contentType = mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  // @supabase/storage-js ignores the `contentType` option once the body is a
  // Blob — it hands the Blob straight to a FormData, whose part gets its
  // content type from the Blob's own `.type`, not the option — so it has to
  // be re-wrapped here rather than relying on the option below.
  const rawBlob = await fetch(uri).then((r) => r.blob());
  const blob = new Blob([rawBlob], { type: contentType });

  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) return { error: error.message } as const;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so a re-picked photo replaces the old one immediately in any
  // <Image> that already cached the previous URL for this same path.
  return { url: `${data.publicUrl}?t=${Date.now()}` } as const;
}

/**
 * Opens the photo library, uploads the chosen image to the `avatars` bucket at
 * `{userId}/avatar.<ext>`, and returns its public URL. Upserts, so re-picking a
 * photo replaces the old one at the same path rather than accumulating files.
 */
export async function pickAndUploadAvatar(userId: string): Promise<PickAndUploadResult> {
  const picked = await pickImage();
  if ('error' in picked || 'cancelled' in picked) return picked;
  return uploadToPath(picked.asset.uri, picked.asset.mimeType, `${userId}/avatar.${(picked.asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0]}`);
}

/**
 * Same idea, for a staff invite still being accepted — there's no user id yet
 * (no account exists until the confirmation-email step completes), so the
 * upload path is keyed by the invite code instead: `pending/{code}/avatar.<ext>`.
 * A narrow storage policy allows this specific path shape for `anon`, scoped to
 * codes with a live pending invite (see migration 0007). The file stays under
 * that path rather than being moved to the user's own folder once the account
 * exists — the bucket is public either way, so the URL keeps working; it's a
 * minor storage-hygiene tradeoff against not needing a "move file" step.
 */
export async function pickAndUploadPendingInviteAvatar(code: string): Promise<PickAndUploadResult> {
  const picked = await pickImage();
  if ('error' in picked || 'cancelled' in picked) return picked;
  const ext = (picked.asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  return uploadToPath(picked.asset.uri, picked.asset.mimeType, `pending/${code}/avatar.${ext}`);
}

/**
 * A household member has no auth.users row of their own, so there's no
 * `{userId}/avatar.<ext>` to key off. Nesting under the resident's own folder
 * (`{residentId}/household/{memberId}.<ext>`) keeps this within the existing
 * `avatar_insert_own` storage policy — it only checks the top-level folder
 * matches the caller's uid, so no new storage migration is needed.
 *
 * Used for changing an *existing* member's photo (profile.tsx), where a
 * memberId already exists and pick-then-immediately-upload is the right
 * shape. Adding a *new* member picks first and uploads separately — see
 * `pickHouseholdAvatarPhoto`/`uploadHouseholdAvatar` below — since there's no
 * memberId to key the upload path on until the record is created.
 */
export async function pickAndUploadHouseholdAvatar(
  residentId: string,
  memberId: string
): Promise<PickAndUploadResult> {
  const picked = await pickImage();
  if ('error' in picked || 'cancelled' in picked) return picked;
  const ext = (picked.asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  return uploadToPath(picked.asset.uri, picked.asset.mimeType, `${residentId}/household/${memberId}.${ext}`);
}

/**
 * Picks (with the same square-crop UX as every other avatar picker here)
 * without uploading anywhere — for the "add a household member" form, which
 * needs the photo chosen up front, in the form itself, before a memberId
 * exists to key an upload path on. Pair with `uploadHouseholdAvatar` once
 * the record's been created.
 */
export async function pickHouseholdAvatarPhoto() {
  return pickImage();
}

/** Uploads a photo already picked via `pickHouseholdAvatarPhoto`, once a memberId exists to key the path on. */
export async function uploadHouseholdAvatar(
  residentId: string,
  memberId: string,
  asset: { uri: string; mimeType: string | null | undefined }
): Promise<PickAndUploadResult> {
  const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  return uploadToPath(asset.uri, asset.mimeType, `${residentId}/household/${memberId}.${ext}`);
}
