const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * File extension for an uploaded image. The picker's mime type is the reliable
 * source: on web the picked image's uri is a `blob:` or `data:` url with no
 * extension at all, and building a storage path from the end of that url
 * (`avatar.blob:http://...`) is rejected by storage. A real file extension in a
 * normal file uri is used next, and `jpg` is the fallback.
 */
export function imageExtension(uri: string, mimeType?: string | null): string {
  const fromMime = mimeType ? MIME_EXTENSIONS[mimeType.toLowerCase()] : undefined;
  if (fromMime) return fromMime;
  if (!/^(blob|data):/i.test(uri)) {
    const match = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(uri);
    if (match) return match[1].toLowerCase();
  }
  return 'jpg';
}
