// Reduce the bytes sent over the visitor's connection; API validation remains authoritative.
export async function compressImageIfNeeded(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const value = new Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error('Invalid image. Choose a JPEG, PNG or WebP under 40 megapixels.'));
      value.src = objectUrl;
    });
    if (image.naturalWidth * image.naturalHeight > 40000000) {
      throw new Error('Invalid image. Choose a JPEG, PNG or WebP under 40 megapixels.');
    }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return file;
    let best = null;
    for (const maximum of [1280, 960, 720, 540]) {
      const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.65, 0.5]) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (blob && (!best || blob.size < best.size)) best = blob;
        if (best?.size <= 250 * 1024) break;
      }
      if (best?.size <= 250 * 1024) break;
    }
    if (!best || best.size >= file.size) return file;
    const extension = best.type === 'image/webp' ? 'webp' : best.type === 'image/jpeg' ? 'jpg' : 'png';
    return new File([best], file.name.replace(/\.[^.]+$/, '') + '.' + extension, {type: best.type});
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
