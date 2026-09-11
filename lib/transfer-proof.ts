import { supabase } from './supabase';

const BUCKET = 'transfer-proofs';

/**
 * Uploads a single locally-picked photo (from `pickPhoto`) to the private
 * `transfer-proofs` bucket and returns its storage path - not a public URL,
 * this bucket has none (a transfer proof is a bank receipt/account screen,
 * same sensitivity tier as `id-document.ts`). Same path convention and
 * content-type handling as `uploadListingPhotos` in `listing-photos.ts` - see
 * that file's comment for why the Blob gets re-wrapped before upload.
 *
 * The returned path is what gets stored in `transfers.proof_url` - despite
 * the column name, it's a path, resolved to a short-lived signed URL on
 * demand via `getTransferProofSignedUrl` whenever it's actually displayed.
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

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  return path;
}

/**
 * Resolves a stored `transfers.proof_url` (actually a storage path) to a
 * short-lived signed URL for display. Only resolves for whoever RLS lets
 * read it: the uploader themselves, or finance/super_admin reviewing a
 * transfer in their own estate (see 0051_private_transfer_proofs.sql).
 */
export async function getTransferProofSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
