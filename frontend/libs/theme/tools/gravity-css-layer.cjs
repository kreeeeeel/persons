const GRAVITY_PACKAGE_PATH = '/@gravity-ui/uikit/';
const GRAVITY_LAYER = 'gravity';

/** @type {import('postcss').PluginCreator<void>} */
const gravityLayer = () => ({
    postcssPlugin: 'persons-gravity-layer',
    Once(root, { AtRule, result }) {
        result.messages.push({ type: 'build-dependency', plugin: 'persons-gravity-layer', file: __filename });
        const filename = (root.source?.input.file ?? result.opts.from ?? '').replaceAll('\\', '/');

        if (!filename.includes(GRAVITY_PACKAGE_PATH)) {
            return;
        }

        if (root.first?.type === 'atrule' && root.first.name === 'layer' && root.first.params === GRAVITY_LAYER) {
            return;
        }

        const nodes = root.nodes.filter((node) => node.type !== 'atrule' || node.name !== 'charset');
        root.removeAll();
        root.append(new AtRule({ name: 'layer', params: GRAVITY_LAYER }).append(nodes));
    },
});

gravityLayer.postcss = true;
module.exports = gravityLayer;
