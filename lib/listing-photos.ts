import { supabase } from './supabase';

/**
 * Uploads locally-picked photo URIs (from `pickPhoto`) to the `listing-photos`
 * bucket and returns their public URLs, in order. Path convention matches
 * `lib/avatar.ts`: `{userId}/{timestamp}-{index}.<ext>`, so the storage RLS
 * policy (which checks the first path segment against `auth.uid()`) applies
 * unchanged.
 */
export async function uploadListingPhotos(userId: string, localUris: string[]): Promise<string[]> {
  const timestamp = Date.now();

  const urls = await Promise.all(
    localUris.map(async (uri, index) => {
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const path = `${userId}/${timestamp}-${index}.${ext}`;
      const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const blob = await fetch(uri).then((r) => r.blob());

      const { error } = await supabase.storage.from('listing-photos').upload(path, blob, {
        contentType,
        upsert: true,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return urls;
}
