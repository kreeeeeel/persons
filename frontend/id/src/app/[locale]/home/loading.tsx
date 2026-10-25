import { Flex, Skeleton } from '@gravity-ui/uikit';
import styles from '@/modules/account/screens/AccountScreen/AccountScreen.module.css';

export default function Loading() {
    return (
        <Flex direction="column" gap="6" aria-busy="true">
            <Skeleton className={styles.headingSkeleton} />
            <Skeleton className={styles.profileSkeleton} />
            <Skeleton className={styles.sessionSkeleton} />
        </Flex>
    );
}
