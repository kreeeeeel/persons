import { readFile, writeFile } from 'node:fs/promises';

/**
 * Keep unchanged source assets untouched so development watchers do not reload the app.
 * @param {string} source
 * @param {string} target
 * @returns {Promise<boolean>}
 */
export async function copyAssetIfChanged(source, target) {
    const content = await readFile(source);

    try {
        if (content.equals(await readFile(target))) {
            return false;
        }
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            throw error;
        }
    }

    await writeFile(target, content);
    return true;
}
