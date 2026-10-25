'use client';

import { LoadedImage } from '@persons/ui';
import styles from '@persons/i18n/Flag/Flag.module.css';
import codes from '@persons/i18n/Flag/country-codes.json';

const WIDTH_18 = 18;
const HEIGHT_14 = 14;

export const countryCodes: readonly string[] = codes;

export function flagAsset(country: string, assetBase = '/assets/flags'): string {
    const code = country.toLowerCase();

    return `${assetBase}/${countryCodes.includes(code) ? code : 'xx'}.svg`;
}

export function Flag({
    country,
    label = '',
    assetBase,
}: {
    readonly country: string;
    readonly label?: string;
    readonly assetBase?: string;
}) {
    return (
        <LoadedImage
            src={flagAsset(country, assetBase)}
            alt={label}
            width={WIDTH_18}
            height={HEIGHT_14}
            className={styles.flag}
        />
    );
}
