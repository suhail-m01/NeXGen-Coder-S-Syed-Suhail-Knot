export async function extractPosterText(file: File, onProgress?: (progress: number) => void) {
  if (!/^image\/(png|jpe?g|webp|bmp)$/i.test(file.type)) throw new Error('Choose a PNG, JPEG, WebP or BMP poster image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose a poster image smaller than 8 MB.');
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ocr`;
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: `${base}/worker.min.js`,
    langPath: `${base}/lang`,
    corePath: `${base}/core`,
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') onProgress?.(message.progress);
    },
  });
  try {
    const result = await worker.recognize(file);
    const text = result.data.text.trim();
    if (text.length < 10) throw new Error('OCR could not find enough readable text. Use a clearer poster or paste the event details.');
    return text;
  } finally { await worker.terminate(); }
}
