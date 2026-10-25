'use client';

import { useEffect, useState } from 'react';
import { Button, Icon } from '@gravity-ui/uikit';
import { ArrowUp } from '@gravity-ui/icons';
import { useTranslate } from '@persons/i18n';
import styles from '@/shared/ui/ScrollToTop/ScrollToTop.module.css';

export function ScrollToTop() {
    const t = useTranslate('common');
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const update = () => setVisible(window.scrollY > 400);
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return (
        <Button
            size="xl"
            view="action"
            pin="circle-circle"
            className={styles.button}
            data-visible={visible}
            aria-label={t('scrollToTop')}
            aria-hidden={!visible}
            tabIndex={visible ? 0 : -1}
            onClick={() =>
                window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                })
            }
        >
            <Icon data={ArrowUp} size={24} />
        </Button>
    );
}
