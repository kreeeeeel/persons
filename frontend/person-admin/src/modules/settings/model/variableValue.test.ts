import { describe, expect, it } from 'vitest';
import { serializeVariableValue } from '@/modules/settings/model/variableValue';

describe('typed variable editing', () => {
    it('validates and serializes calendar dates as UTC instants', () => {
        expect(serializeVariableValue('INSTANT', '2026-10-22T03:00:00+03:00')).toBe('"2026-10-22T00:00:00.000Z"');
        expect(serializeVariableValue('INSTANT', '')).toBeUndefined();
        expect(serializeVariableValue('INSTANT', 'not a date')).toBeUndefined();
        expect(serializeVariableValue('INSTANT', '2026-10-22')).toBeUndefined();
        expect(serializeVariableValue('INSTANT', '2026-13-22T00:00:00Z')).toBeUndefined();
    });
    it('keeps string values distinct from booleans and numbers', () => {
        expect(serializeVariableValue('STRING', 'false')).toBe('"false"');
        expect(serializeVariableValue('BOOLEAN', 'false')).toBe('false');
        expect(serializeVariableValue('NUMBER', '12.5')).toBe('12.5');
        expect(serializeVariableValue('BOOLEAN', '"false"')).toBeUndefined();
        expect(serializeVariableValue('NUMBER', '')).toBeUndefined();
        expect(serializeVariableValue('NUMBER', '1e400')).toBeUndefined();
    });
    it('validates maps and JSON without coercion or evaluating code', () => {
        expect(serializeVariableValue('MAP', '{"ru":"Name","en":"Name"}')).toBe('{"ru":"Name","en":"Name"}');
        expect(serializeVariableValue('MAP', '[]')).toBeUndefined();
        expect(serializeVariableValue('MAP', 'null')).toBeUndefined();
        expect(serializeVariableValue('JSON', '[1, false, null]')).toBe('[1,false,null]');
        expect(serializeVariableValue('JSON', 'true false')).toBeUndefined();
    });
});
