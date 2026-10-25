import { Box } from '@gravity-ui/uikit';
import { useTranslate } from '@persons/i18n';
import type { DotaItem } from '@/modules/integrations/model/DotaItem';
import { DotaInventorySlot } from '@/modules/integrations/components/DotaInventory/DotaInventorySlot';
import styles from '@/modules/integrations/components/DotaInventory/DotaInventory.module.css';

export function DotaInventory({
    items,
    neutralItem,
}: {
    readonly items: readonly DotaItem[];
    readonly neutralItem?: DotaItem;
}) {
    const t = useTranslate('integrations');
    return (
        <Box className={styles.inventory} role="group" aria-label={t('items')}>
            <Box className={styles.panel}>
                <Box className={styles.slots}>
                    {Array.from({ length: 6 }, (_, slot) => (
                        <DotaInventorySlot key={slot} item={items[slot]} />
                    ))}
                </Box>
                <Box className={styles.neutral}>
                    <DotaInventorySlot item={neutralItem} neutral />
                </Box>
            </Box>
        </Box>
    );
}
