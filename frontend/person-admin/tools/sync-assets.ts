import { mkdir } from 'node:fs/promises';
import { copyAssetIfChanged } from '@persons/assets/copyAssetIfChanged';
import path from 'node:path';

const app = path.resolve(import.meta.dirname, '..');
const frontend = path.resolve(app, '..');
const publicAssets = path.join(app, 'public/assets');
await mkdir(publicAssets, { recursive: true });
await copyAssetIfChanged(path.join(frontend, 'assets/logo.svg'), path.join(app, 'src/app/icon.svg'));
await Promise.all(
    ['favicon.ico', 'icon.png', 'apple-icon.png'].map((name) =>
        copyAssetIfChanged(path.join(frontend, 'assets/icons', name), path.join(app, 'src/app', name)),
    ),
);
