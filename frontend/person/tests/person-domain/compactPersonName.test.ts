import { expect, it } from 'vitest';
import { compactPersonName } from '@persons/person-domain/format/compactPersonName';

it.each([
    ['Кирилл Немтырев', 'given-first', 'Кирилл Н.'],
    ['Немтырев Кирилл', 'family-first', 'Кирилл Н.'],
    ['Анастасия Николаева Сергеевна', 'given-first', 'Анастасия Н.'],
    ['Николаева Анастасия Сергеевна', 'family-first', 'Анастасия Н.'],
    ['  Иван   Ким ', 'given-first', 'Иван Ким'],
    ['Вадим', 'family-first', 'Вадим'],
    ['', 'given-first', ''],
] as const)('formats %s in %s order', (name, order, expected) => {
    expect(compactPersonName(name, order)).toBe(expected);
});
