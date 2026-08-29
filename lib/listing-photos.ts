import { supabase } from './supabase';

/**
 * Uploads locally-picked photos (from `pickPhoto`) to the `listing-photos`
 * bucket and returns their public URLs, in order. Path convention matches
 * `lib/avatar.ts`: `{userId}/{timestamp}-{index}.<ext>`, so the storage RLS
 * policy (which checks the first path segment against `auth.uid()`) applies
 * unchanged.
 *
 * Content type comes from the picker's own `mimeType` when available, same
 * as `avatar.ts`'s `uploadToPath` — guessing it from the uri's extension
 * alone fails for a `blob:`/`content:` uri (no `.ext` to find), which is
 * what the picker returns on web and on some Android pickers.
 */
export async function uploadListingPhotos(
  userId: string,
  photos: { uri: string; mimeType: string | null }[]
): Promise<string[]> {
  const timestamp = Date.now();

  const urls = await Promise.all(
    photos.map(async ({ uri, mimeType }, index) => {
      const ext = (uri.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
      const contentType = mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const path = `${userId}/${timestamp}-${index}.${contentType.split('/')[1] ?? ext}`;
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
