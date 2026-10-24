const DATABASE = 'knot-product-media';
const STORE = 'assets';

interface StoredMedia { id: string; blob: Blob }

function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('This browser does not support persistent local media storage.')); return; }
    const request = window.indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'));
    request.onblocked = () => reject(new Error('Local media storage is blocked by another tab.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openMediaDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Local media storage operation failed.'));
    });
  } finally {
    database.close();
  }
}

export async function putMediaBlob(id: string, blob: Blob) {
  await withStore('readwrite', (store) => store.put({ id, blob } satisfies StoredMedia));
}

export async function getMediaBlob(id: string) {
  const value = await withStore('readonly', (store) => store.get(id) as IDBRequest<StoredMedia | undefined>);
  return value?.blob ?? null;
}

export async function deleteMediaBlob(id: string) {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function clearMediaBlobs() {
  await withStore('readwrite', (store) => store.clear());
}

export interface NormalizedImage {
  blob: Blob;
  mimeType: 'image/webp';
  width: number;
  height: number;
}

/** Strip metadata, bound dimensions and avoid SVG/script uploads. */
export async function normalizeImage(file: File, maxBytes = 1_500_000): Promise<NormalizedImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image. SVG and other file types are not accepted.');
  if (file.size > 8_000_000) throw new Error('Choose an image smaller than 8 MB before optimization.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image optimization is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) throw new Error('Could not optimize this image.');
    if (blob.size > maxBytes) throw new Error('The optimized image is still over 1.5 MB. Choose a simpler or smaller image.');
    return { blob, mimeType: 'image/webp', width, height };
  } finally {
    bitmap.close();
  }
}
