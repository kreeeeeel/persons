import { Box, Skeleton } from "@gravity-ui/uikit";
import card from "@persons/person-domain/account/components/SessionCard/SessionCard.module.css";
import styles from "@persons/person-domain/account/components/SessionCardSkeleton/SessionCardSkeleton.module.css";

export function SessionCardSkeleton() {
    return (
        <Box className={card.card}>
            <Skeleton className={card.os} />
            <Box className={`${card.details} ${styles.details}`}>
                <Skeleton className={styles.client} />
                <Skeleton className={styles.location} />
            </Box>
            <Skeleton className={`${card.revoke} ${styles.action}`} />
        </Box>
    );
}
