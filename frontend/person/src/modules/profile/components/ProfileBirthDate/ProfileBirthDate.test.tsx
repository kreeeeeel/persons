import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfileBirthDate } from '@/modules/profile/components/ProfileBirthDate';
import { renderUi } from '@test/render';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

it.each([
    ['2001-05-14', 25, 'лет'],
    ['2004-05-14', 22, 'года'],
    ['2005-05-14', 21, 'год'],
] as const)('shows the birth date and age for %s', (birthDate, age, word) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const { container } = renderUi(<ProfileBirthDate birthDate={birthDate} today="2026-10-26" />);
    expect(screen.getByText('Дата рождения')).toBeVisible();
    expect(container.querySelector('time')).toHaveAttribute('datetime', birthDate);
    expect(container.querySelector('time')).toHaveTextContent(`(${age} ${word})`);
});
