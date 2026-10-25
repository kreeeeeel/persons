import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
await mkdir('.build', { recursive: true });
const source = 'frontend/assets/illustrations/play-airhockey-v1.webp';
const filter = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,zoompan=z='1.02+on/9600':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=192:s=960x540:fps=24";
execFileSync(process.env.FFMPEG_BINARY ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-vf', filter, '-t', '8', '-an', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '.build/demo-moment.mp4'], { stdio: 'inherit' });
console.log('Created .build/demo-moment.mp4: eight-second illustrated demo, H.264 with a seekable index.');
