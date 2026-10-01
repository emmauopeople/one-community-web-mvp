import sharp from 'sharp';

export const IMAGE_LIMITS = { detail: 250 * 1024, thumbnail: 45 * 1024 };
const options = { limitInputPixels: 40000000, failOn: 'warning' };
export class InvalidImage extends Error {}

async function variant(input, maximum, budget, quality) {
  for (let dimension = maximum; dimension >= 100; dimension = Math.floor(dimension * 0.75)) {
    for (const q of [quality, 60, 45]) {
      const { data, info } = await sharp(input, options)
        .rotate()
        .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: q, effort: 4 })
        .timeout({ seconds: 15 })
        .toBuffer({ resolveWithObject: true });
      if (data.length <= budget) return { buffer: data, width: info.width, height: info.height };
    }
  }
  throw new InvalidImage('Unable to optimize image. Please choose another image.');
}

export async function optimizeImage(input) {
  try {
    const metadata = await sharp(input, options).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) !== 1) {
      throw new InvalidImage('Choose a non-animated JPEG, PNG or WebP image.');
    }
    // Sequential processing bounds peak memory; never keep EXIF/GPS metadata.
    const detail = await variant(input, 1280, IMAGE_LIMITS.detail, 78);
    const thumbnail = await variant(input, 400, IMAGE_LIMITS.thumbnail, 70);
    return { detail, thumbnail };
  } catch (error) {
    if (error instanceof InvalidImage) throw error;
    throw new InvalidImage('Invalid image. Choose a JPEG, PNG or WebP under 40 megapixels.');
  }
}
