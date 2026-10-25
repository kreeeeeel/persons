import type { ReactNode } from 'react';
import type { PersonProfile } from '@persons/person-client';

export interface ProfileScreenProps {
    readonly profile: PersonProfile;
    readonly signedIn: boolean;
    readonly account: ReactNode;
    readonly administrator?: boolean;
    readonly integrationsPreview?: boolean;
}
