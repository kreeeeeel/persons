import type { MilitaryService } from '@/modules/profile/model/MilitaryService';

export interface MilitaryServiceCountdownProps {
    readonly service: MilitaryService;
    readonly today: string;
}
