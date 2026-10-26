import { useContentClock } from '@persons/person-domain/ContentTime/useContentClock';
import type { MilitaryService } from '@/modules/profile/model/MilitaryService';
import { militaryServiceState, militaryServiceToday } from '@/modules/profile/model/serviceCalendar';

export function useMilitaryService(service: MilitaryService, initialToday: string) {
    const now = useContentClock();
    return militaryServiceState(service, now === undefined ? initialToday : militaryServiceToday(now));
}
