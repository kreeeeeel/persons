const pendingImages = new Map<string, Promise<void>>();

export function preloadImage(src: string): Promise<void> {
    const existing = pendingImages.get(src);
    if (existing) {
        return existing;
    }

    const promise = new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
            image.onload = null;
            image.onerror = null;
            if (typeof image.decode === 'function') {
                image.decode().then(resolve, () => resolve());
            } else {
                resolve();
            }
        };
        image.onerror = () => {
            image.onload = null;
            image.onerror = null;
            reject(new Error('Public image preload failed'));
        };
        image.src = src;
    });
    pendingImages.set(src, promise);
    void promise.catch(() => pendingImages.delete(src));
    return promise;
}
