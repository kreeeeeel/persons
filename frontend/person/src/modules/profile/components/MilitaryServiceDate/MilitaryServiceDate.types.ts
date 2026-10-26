import type { MilitaryService } from '@/modules/profile/model/MilitaryService';

export interface MilitaryServiceDateProps {
    readonly service: MilitaryService;
    readonly today: string;
    readonly showDepartureDate?: boolean;
}
