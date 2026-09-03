import { supabase } from './supabase';

/**
 * Uploads a single locally-picked photo (from `pickPhoto`) to the
 * `announcement-photos` bucket and returns its public URL. Path is scoped
 * by estate, not uploader — RLS on this bucket checks `(storage.foldername
 * (name))[1] = auth_estate_id()`, since any staff role for an estate can
 * post announcements for it.
 */
export async function uploadAnnouncementPhoto(
  estateId: string,
  photo: { uri: string; mimeType: string | null }
): Promise<string> {
  const { uri, mimeType } = photo;
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
  const contentType = mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const path = `${estateId}/${Date.now()}.${contentType.split('/')[1] ?? ext}`;
  const rawBlob = await fetch(uri).then((r) => r.blob());
  const blob = new Blob([rawBlob], { type: contentType });

  const { error } = await supabase.storage.from('announcement-photos').upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('announcement-photos').getPublicUrl(path);
  return data.publicUrl;
}
