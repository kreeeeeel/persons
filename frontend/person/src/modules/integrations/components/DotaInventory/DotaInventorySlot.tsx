import { Box, Text, Tooltip } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { useTranslate } from '@persons/i18n';
import type { DotaItem } from '@/modules/integrations/model/DotaItem';
import styles from '@/modules/integrations/components/DotaInventory/DotaInventory.module.css';

export function DotaInventorySlot({ item, neutral = false }: { readonly item?: DotaItem; readonly neutral?: boolean }) {
    const t = useTranslate('integrations');
    const acquired = item?.acquiredAtSeconds;
    const timing = acquired === undefined ? undefined : t('itemMinute', { minutes: Math.floor(acquired / 60) });
    const label = item ? `${item.name}${timing === undefined ? '' : ` · ${timing}`}` : t('emptySlot');
    const slot = (
        <Box className={styles.slot} data-neutral={neutral} tabIndex={item ? 0 : undefined} aria-label={label}>
            {item && (
                <LoadedImage
                    src={item.imageUrl ?? `/assets/integrations/dotabuff/${item.id}.png`}
                    alt={item.name}
                    width={neutral ? 80 : 88}
                    height={neutral ? 80 : 64}
                    responsive
                    objectFit={neutral ? 'contain' : 'cover'}
                />
            )}
            {timing !== undefined && <Text className={styles.timing}>{timing}</Text>}
        </Box>
    );
    return item ? <Tooltip content={label}>{slot}</Tooltip> : slot;
}
