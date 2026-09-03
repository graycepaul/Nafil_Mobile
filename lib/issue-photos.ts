import { supabase } from './supabase';

/**
 * Uploads locally-picked photos (from `pickPhoto`) to the `issue-photos`
 * bucket and returns their public URLs, in order. Same path convention and
 * content-type handling as `uploadListingPhotos` — see that file's comment
 * for why the Blob gets re-wrapped before upload.
 */
export async function uploadIssuePhotos(
  userId: string,
  photos: { uri: string; mimeType: string | null }[]
): Promise<string[]> {
  const timestamp = Date.now();

  const urls = await Promise.all(
    photos.map(async ({ uri, mimeType }, index) => {
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const contentType = mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const path = `${userId}/${timestamp}-${index}.${contentType.split('/')[1] ?? ext}`;
      const rawBlob = await fetch(uri).then((r) => r.blob());
      const blob = new Blob([rawBlob], { type: contentType });

      const { error } = await supabase.storage.from('issue-photos').upload(path, blob, {
        contentType,
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('issue-photos').getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return urls;
}
