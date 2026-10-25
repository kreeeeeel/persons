'use client';

import { useState } from 'react';
import { Box } from '@gravity-ui/uikit';
import { LoadedImage } from '@persons/ui';
import { SegmentedTabs } from '@persons/ui/SegmentedTabs';
import { useTranslate } from '@persons/i18n';
import { useContentLocation } from '@persons/person-domain/hooks/useContentLocation';
import { gameIntegrations } from '@/modules/integrations/model/gameIntegrations';
import styles from '@/modules/integrations/components/IntegrationsPanel/IntegrationsPanel.module.css';

export function IntegrationsPanel({ personId, personTag }: { readonly personId: string; readonly personTag?: string }) {
    const t = useTranslate('integrations');
    const location = useContentLocation(personTag);
    const [selectedIntegration, setIntegration] = useState(gameIntegrations[0].id);
    const integration =
        location.content?.kind === 'CS_MATCH'
            ? 'leetify'
            : location.content?.kind === 'DOTA_MATCH'
              ? 'opendota'
              : selectedIntegration;
    const [visited, setVisited] = useState([gameIntegrations[0].id]);
    return (
        <Box className={styles.root}>
            <Box className={styles.services}>
                <SegmentedTabs
                    compact
                    value={integration}
                    onUpdate={(value) => {
                        setIntegration(value);
                        setVisited((current) => (current.includes(value) ? current : [...current, value]));
                    }}
                    label={t('services')}
                    items={gameIntegrations.map((item) => ({
                        value: item.id,
                        label: item.name,
                        icon: <LoadedImage src={item.icon} alt="" width={20} height={20} />,
                    }))}
                />
            </Box>
            <Box className={styles.histories}>
                {gameIntegrations
                    .filter((item) => visited.includes(item.id) || item.id === integration)
                    .map((item) => (
                        <Box
                            key={item.id}
                            className={styles.history}
                            data-active={item.id === integration}
                            role="tabpanel"
                            aria-label={item.name}
                            aria-hidden={item.id !== integration}
                            inert={item.id !== integration}
                        >
                            <item.History personId={personId} personTag={personTag} active={item.id === integration} />
                        </Box>
                    ))}
            </Box>
        </Box>
    );
}
