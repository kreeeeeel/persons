import { expect, it } from 'vitest';
import { compactCount } from '@persons/person-domain/format/compactCount';

it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1К'],
    [1500, '1.5К'],
    [1999, '1.9К'],
    [999999, '999.9К'],
    [1000000, '1М'],
    [1233000, '1.233М'],
    [1233999, '1.233М'],
])('formats %i without rounding into the next unit', (value, expected) => {
    expect(compactCount(value)).toBe(expected);
});

it('uses English suffixes for the English locale', () => {
    expect(compactCount(1500, 'en')).toBe('1.5K');
    expect(compactCount(1233000, 'en')).toBe('1.233M');
});
