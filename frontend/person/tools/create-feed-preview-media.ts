import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Review media is derived from the existing consented illustration, never a personal recording.
const directory = path.resolve(import.meta.dirname, '../.cache/feed');
const target = path.join(directory, 'moment.webm');
const existing = await stat(target).catch((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return undefined;
    }
    throw error;
});

if (!existing?.size) {
    const picture = await readFile(
        path.resolve(import.meta.dirname, '../../assets/illustrations/play-console-v3.webp'),
    );
    const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const bytes = await page.evaluate(
            async (source) => {
                const image = new Image();
                image.src = source;
                await image.decode();
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 400;
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new Error('Canvas unavailable');
                }
                const stream = canvas.captureStream(20);
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp8',
                    videoBitsPerSecond: 600000,
                });
                const chunks: Blob[] = [];
                recorder.ondataavailable = (event) => chunks.push(event.data);
                const completed = new Promise<Blob>((resolve) => {
                    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
                });
                recorder.start();
                const start = performance.now();
                await new Promise<void>((resolve) => {
                    const draw = () => {
                        const progress = Math.min(1, (performance.now() - start) / 4000);
                        context.fillStyle = '#eee6f7';
                        context.fillRect(0, 0, 640, 400);
                        const scale = Math.min(640 / image.width, 400 / image.height) * (0.92 + 0.06 * progress);
                        const width = image.width * scale;
                        const height = image.height * scale;
                        context.drawImage(image, (640 - width) / 2, (400 - height) / 2, width, height);
                        if (progress < 1) {
                            requestAnimationFrame(draw);
                        } else {
                            resolve();
                        }
                    };
                    draw();
                });
                recorder.stop();
                const blob = await completed;
                stream.getTracks().forEach((track) => track.stop());
                return Array.from(new Uint8Array(await blob.arrayBuffer()));
            },
            `data:image/webp;base64,${picture.toString('base64')}`,
        );
        await mkdir(directory, { recursive: true });
        await writeFile(target, Buffer.from(bytes));
    } finally {
        await browser.close();
    }
}

// MediaRecorder omits a finite duration. The preview's known duration keeps the
// same video preparation/seek workflow usable when this fixture is uploaded.
const recorded = await readFile(target);
const infoOffset = recorded.indexOf(Buffer.from([0x15, 0x49, 0xa9, 0x66]));
if (infoOffset >= 0 && (recorded[infoOffset + 4] & 0x80) !== 0) {
    const infoSize = recorded[infoOffset + 4] & 0x7f;
    const infoEnd = infoOffset + 5 + infoSize;
    const info = recorded.subarray(infoOffset + 5, infoEnd);
    if (!info.includes(Buffer.from([0x44, 0x89]))) {
        const duration = Buffer.alloc(11);
        duration.set([0x44, 0x89, 0x88]);
        duration.writeDoubleBE(4000, 3);
        if (infoSize + duration.length >= 127) {
            throw new Error('Preview WebM metadata is larger than expected');
        }
        const normalized = Buffer.concat([recorded.subarray(0, infoEnd), duration, recorded.subarray(infoEnd)]);
        normalized[infoOffset + 4] = 0x80 | (infoSize + duration.length);
        await writeFile(target, normalized);
    }
}
