import sharp from 'sharp';

import { IMAGE_MAX_MB } from '@/lib/constants';
import { getStorage } from '@/lib/storage';

interface UploadTyperatingImageData {
  typeratingId: string;
  file: File;
}

export async function uploadTyperatingImage({
  typeratingId,
  file,
}: UploadTyperatingImageData) {
  const maxSize = IMAGE_MAX_MB * 1024 * 1024; // MB
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  if (!allowedMime.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // Convert to WebP
  const buffer = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(buffer).webp({ quality: 90 }).toBuffer();

  // Upload to storage
  const storage = getStorage();
  const key = `typeratings/${typeratingId}-${Date.now()}.webp`;

  const { url } = await storage.put(webp, key, 'image/webp', {
    maxBytes: maxSize,
    allowedMime,
  });

  return url;
}

export async function deleteTyperatingImage(image: string) {
  const storage = getStorage();

  const urlParts = image.split('/');
  const index = urlParts.findIndex((part) => part === 'typeratings');
  if (index !== -1 && index < urlParts.length - 1) {
    const key = `typeratings/${urlParts[index + 1]}`;
    try {
      await storage.delete(key);
    } catch {
      // Silently fail, old image cleanup is not critical
    }
  }
}
