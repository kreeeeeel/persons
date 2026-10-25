import postcss from 'postcss';
import { expect, it } from 'vitest';
import gravityLayer from '@persons/theme/postcss';

const GRAVITY_CSS =
    '@charset "UTF-8"; .g-text { font-size: 16px; } @media (width < 700px) { .g-button { height: 48px; } }';
const POSIX_GRAVITY_PATH = '/workspace/node_modules/@gravity-ui/uikit/build/esm/components/Text/text/text.css';

it.each([POSIX_GRAVITY_PATH, 'C:\\workspace\\node_modules\\@gravity-ui\\uikit\\styles\\styles.css'])(
    'isolates Gravity styles without dropping component or responsive rules: %s',
    async (from) => {
        const result = await postcss([gravityLayer]).process(GRAVITY_CSS, { from });
        const layer = result.root.first;

        expect(layer?.type).toBe('atrule');
        if (layer?.type !== 'atrule') {
            throw new Error('Gravity styles must be inside a CSS layer');
        }

        expect(layer.name).toBe('layer');
        expect(layer.params).toBe('gravity');
        expect(layer.nodes?.map((node) => node.toString())).toEqual([
            '.g-text { font-size: 16px; }',
            '@media (width < 700px) { .g-button { height: 48px; } }',
        ]);
        expect(result.root.nodes).toHaveLength(1);
        expect(result.messages).toEqual([
            expect.objectContaining({
                type: 'build-dependency',
                file: expect.stringContaining('gravity-css-layer.cjs'),
            }),
        ]);
    },
);

it('keeps application modules and other dependencies unchanged', async () => {
    const css = '.heading { font-size: clamp(24px, 10.5cqi, 80px); font-weight: 750; }';

    for (const from of ['/workspace/src/Heading.module.css', '/workspace/node_modules/another-package/styles.css']) {
        const result = await postcss([gravityLayer]).process(css, { from });
        expect(result.css).toBe(css);
    }
});

it('does not nest the layer when a stylesheet is processed again', async () => {
    const first = await postcss([gravityLayer]).process(GRAVITY_CSS, { from: POSIX_GRAVITY_PATH });
    const second = await postcss([gravityLayer]).process(first.css, { from: POSIX_GRAVITY_PATH });

    expect(second.css).toBe(first.css);
});
