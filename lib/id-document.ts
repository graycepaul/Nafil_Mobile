import { supabase } from './supabase';

const BUCKET = 'resident-id-documents';

/**
 * Uploads a resident's identity document (utility bill, NIN card, or
 * service ID card) to the private id-verification bucket and returns its
 * storage path - not a public URL, this bucket has none. Path is scoped by
 * uploader (not estate): RLS on this bucket checks
 * `(storage.foldername(name))[1] = auth.uid()`, and a resident's estate
 * isn't stable/known yet at the point they're submitting a join request.
 */
export async function uploadIdDocument(
  profileId: string,
  photo: { uri: string; mimeType: string | null }
): Promise<string> {
  const { uri, mimeType } = photo;
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const contentType = mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const path = `${profileId}/${Date.now()}.${contentType.split('/')[1] ?? ext}`;
  const rawBlob = await fetch(uri).then((r) => r.blob());
  const blob = new Blob([rawBlob], { type: contentType });

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  return path;
}

/**
 * Resolves a stored id_document_path to a short-lived signed URL for
 * display - this bucket is private, so there's no public URL to fall back
 * to. Only actually resolves for whoever RLS lets read it: the uploader
 * themselves, or an admin/super_admin reviewing that specific join request
 * (see 0039_resident_id_verification.sql).
 */
export async function getIdDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
