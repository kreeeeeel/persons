import { expect, it } from 'vitest';
import { ageOnDate } from '@/modules/profile/model/ageOnDate';

it.each([
    ['2001-10-27', '2026-10-26', 24],
    ['2001-10-26', '2026-10-26', 25],
    ['2001-10-25', '2026-10-26', 25],
    ['2001-12-31', '2026-01-01', 24],
    ['2000-02-29', '2025-02-28', 24],
    ['2000-02-29', '2025-03-01', 25],
])('calculates the age for %s on %s', (birthDate, today, age) => {
    expect(ageOnDate(birthDate, today)).toBe(age);
});
