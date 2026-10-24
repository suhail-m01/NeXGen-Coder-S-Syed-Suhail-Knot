import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copies = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'public/ocr/lang/eng.traineddata.gz'],
  ...[
    'tesseract-core.wasm.js',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-relaxedsimd.wasm.js',
    'tesseract-core-relaxedsimd-lstm.wasm.js',
  ].map((file) => [`node_modules/tesseract.js-core/${file}`, `public/ocr/core/${file}`]),
];

await Promise.all(copies.map(async ([source, destination]) => {
  const target = resolve(root, destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, source), target);
}));
console.log(`Prepared ${copies.length} local OCR runtime assets.`);
