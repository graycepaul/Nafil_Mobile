import { imageExtension } from '../image-ext';

describe('imageExtension (M9)', () => {
  it('uses the picker mime type first', () => {
    expect(imageExtension('file:///tmp/x.bin', 'image/png')).toBe('png');
    expect(imageExtension('file:///tmp/x', 'image/jpeg')).toBe('jpg');
    expect(imageExtension('x', 'IMAGE/WEBP')).toBe('webp');
  });

  it('never builds an extension out of a web blob or data url', () => {
    const blob = 'blob:http://localhost:8090/3f1c2a9e-1b0d-4e0a-9c11-5d6f7a8b9c0d';
    expect(imageExtension(blob, null)).toBe('jpg');
    expect(imageExtension(blob, 'image/png')).toBe('png');
    expect(imageExtension('data:image/jpeg;base64,/9j/4AAQ', undefined)).toBe('jpg');
    for (const uri of [blob, 'data:image/png;base64,iVBOR']) {
      expect(imageExtension(uri, null)).toMatch(/^[a-z0-9]{2,5}$/);
    }
  });

  it('reads a real extension from a file uri, ignoring query strings', () => {
    expect(imageExtension('file:///var/mobile/ImagePicker/ABC.JPG', null)).toBe('jpg');
    expect(imageExtension('file:///cache/photo.png?cache=1', null)).toBe('png');
  });

  it('falls back to jpg when there is nothing to go on', () => {
    expect(imageExtension('content://media/external/images/media/1234', null)).toBe('jpg');
    expect(imageExtension('', null)).toBe('jpg');
  });
});
