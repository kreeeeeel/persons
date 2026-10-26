import { expect, it } from 'vitest';
import { militaryServiceState, militaryServiceToday } from '@/modules/profile/model/serviceCalendar';

const service = { departureDate: '2026-06-01', returnDate: '2027-06-01' };

it('counts calendar days until departure and leaves progress at zero', () => {
    expect(militaryServiceState(service, '2026-05-14')).toMatchObject({
        status: 'upcoming',
        daysLeft: 18,
        elapsed: 0,
        progress: 0,
    });
});

it('starts service on the departure date', () => {
    expect(militaryServiceState(service, '2026-06-01')).toMatchObject({
        status: 'serving',
        departureToday: true,
        daysLeft: 365,
        elapsed: 0,
    });
});

it('calculates elapsed days, remaining days and progress from both dates', () => {
    const state = militaryServiceState(service, '2026-10-26');
    expect(state).toMatchObject({ status: 'serving', daysLeft: 218, elapsed: 147, total: 365 });
    expect(state.progress).toBeCloseTo(40.274);
});

it.each(['2027-06-01', '2027-07-01'])('finishes on or after the return date: %s', (today) => {
    expect(militaryServiceState(service, today)).toMatchObject({
        status: 'completed',
        daysLeft: 0,
        progress: 100,
        elapsed: 365,
        returnToday: today === service.returnDate,
    });
});

it('does not invent a return date or service length', () => {
    expect(militaryServiceState({ departureDate: service.departureDate }, '2026-10-26')).toMatchObject({
        status: 'serving',
        daysLeft: undefined,
        total: undefined,
        elapsed: 147,
    });
});

it('counts leap days and year boundaries', () => {
    expect(militaryServiceState({ departureDate: '2028-02-28', returnDate: '2028-03-01' }, '2028-02-29')).toMatchObject(
        { elapsed: 1, daysLeft: 1, total: 2, progress: 50 },
    );
    expect(militaryServiceState({ departureDate: '2027-01-01' }, '2026-12-31').daysLeft).toBe(1);
});

it('changes the calendar day at midnight in Moscow', () => {
    expect(militaryServiceToday(Date.parse('2026-10-26T20:59:59Z'))).toBe('2026-10-26');
    expect(militaryServiceToday(Date.parse('2026-10-26T21:00:00Z'))).toBe('2026-10-27');
});

it.each([
    ['2027-06-01', true],
    ['2027-06-07', true],
    ['2027-06-08', false],
    ['2027-07-01', false],
])('keeps the return notice for seven calendar days: %s', (today, showCountdown) => {
    expect(militaryServiceState(service, today).showCountdown).toBe(showCountdown);
});
