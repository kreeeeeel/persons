import type { MilitaryService } from '@/modules/profile/model/MilitaryService';

const DAY_MS = 86_400_000;
const RETURN_NOTICE_DAYS = 7;
const dateFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export function militaryServiceToday(now: number) {
    return dateFormat.format(now);
}

function daysBetween(from: string, to: string) {
    return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function militaryServiceState(service: MilitaryService, today: string) {
    const untilDeparture = daysBetween(today, service.departureDate);
    const elapsed = Math.max(0, daysBetween(service.departureDate, today));
    const total = service.returnDate ? daysBetween(service.departureDate, service.returnDate) : undefined;
    const completed = Boolean(service.returnDate && today >= service.returnDate);
    const daysSinceReturn = service.returnDate ? daysBetween(service.returnDate, today) : undefined;
    const status = untilDeparture > 0 ? 'upcoming' : completed ? 'completed' : 'serving';

    return {
        status,
        departureToday: untilDeparture === 0,
        returnToday: service.returnDate === today,
        showCountdown: !completed || (daysSinceReturn !== undefined && daysSinceReturn < RETURN_NOTICE_DAYS),
        daysLeft:
            status === 'upcoming'
                ? untilDeparture
                : service.returnDate
                  ? Math.max(0, daysBetween(today, service.returnDate))
                  : undefined,
        elapsed: total === undefined ? elapsed : Math.min(elapsed, total),
        total,
        progress: total && total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0,
    } as const;
}
