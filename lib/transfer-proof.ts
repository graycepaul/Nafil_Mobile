import { supabase } from './supabase';

/**
 * Uploads a single locally-picked photo (from `pickPhoto`) to the
 * `transfer-proofs` bucket and returns its public URL. Same path convention
 * and content-type handling as `uploadListingPhotos` in `listing-photos.ts`
 * — see that file's comment for why the Blob gets re-wrapped before upload.
 */
export async function uploadTransferProof(
  userId: string,
  photo: { uri: string; mimeType: string | null }
): Promise<string> {
  const ext = (photo.uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const contentType = photo.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const path = `${userId}/${Date.now()}.${contentType.split('/')[1] ?? ext}`;
  const rawBlob = await fetch(photo.uri).then((r) => r.blob());
  const blob = new Blob([rawBlob], { type: contentType });

  const { error } = await supabase.storage.from('transfer-proofs').upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('transfer-proofs').getPublicUrl(path);
  return data.publicUrl;
}
