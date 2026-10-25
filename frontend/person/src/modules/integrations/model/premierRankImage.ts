import digits from '@/modules/integrations/model/premierDigits.json';

const tiers = [
    ['#b1c4d9', '#2c2f37', '#eef2f7'],
    ['#5e98d9', '#061c36', '#8bc1ff'],
    ['#4c6aff', '#060e37', '#8a9dfe'],
    ['#8847ff', '#180638', '#b48bff'],
    ['#d32ce6', '#320638', '#f177ff'],
    ['#eb4b4b', '#380606', '#ff8686'],
    ['#ffd700', '#383006', '#ffdf35'],
] as const;

export function premierRankImage(rating: number): string {
    const [accent, background, foreground] = tiers[Math.min(6, Math.floor(rating / 5000))];
    const parts =
        rating < 1000
            ? [['---', 20] as const]
            : [[`${Math.floor(rating / 1000)},`, 26] as const, [String(rating % 1000).padStart(3, '0'), 22] as const];
    const glyphs = parts.flatMap(([text, size]) =>
        [...text].map((char) => ({
            ...digits.glyphs[char as keyof typeof digits.glyphs],
            scale: size / digits.unitsPerEm,
        })),
    );
    const width = glyphs.reduce((sum, glyph) => sum + glyph.advance * glyph.scale, 0);
    let x = 61 - width / 2;
    const paths = glyphs
        .map((glyph) => {
            const path = `<path d="${glyph.path}" transform="translate(${x} 25) scale(${glyph.scale} ${-glyph.scale})"/>`;
            x += glyph.advance * glyph.scale;
            return path;
        })
        .join('');
    const title = new Intl.NumberFormat('en-US').format(rating);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="36" viewBox="0 0 104 36"><title>${title}</title><path d="M21 1h81l-6 34H15z" fill="${background}" stroke="${accent}" stroke-opacity=".6" stroke-width="1.2"/><path d="M5.44 2.13A2.6 2.6 0 0 1 7.99 0h1.86a.6.6 0 0 1 .6.7L4.83 31.5a.6.6 0 0 1-.6.5h-2.3c-1 0-1.76-.9-1.58-1.89l5.1-27.98ZM11.82.99c.1-.57.6-.99 1.18-.99h2.93a.6.6 0 0 1 .59.7l-5.4 30.31c-.1.57-.6.99-1.18.99H7a.6.6 0 0 1-.59-.7L11.82.98Z" fill="${accent}" transform="scale(1.125)"/><g fill="${foreground}" transform="skewX(-10)">${paths}</g></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
