import type { DynamicProperty } from '@persons/dynamic-properties';

export function editableVariableValue(property: DynamicProperty): string {
    const value: unknown = JSON.parse(property.value);
    return ['STRING', 'INSTANT', 'DURATION'].includes(property.type) ? String(value) : JSON.stringify(value, null, 2);
}

export function serializeVariableValue(type: DynamicProperty['type'], value: string): string | undefined {
    if (type === 'INSTANT') {
        if (
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
            !Number.isFinite(Date.parse(value))
        ) {
            return undefined;
        }
        return JSON.stringify(new Date(value).toISOString());
    }
    if (['STRING', 'DURATION'].includes(type)) {
        return JSON.stringify(value);
    }
    if (!value.trim()) {
        return undefined;
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (type === 'BOOLEAN' && typeof parsed !== 'boolean') {
            return undefined;
        }
        if ((type === 'NUMBER' || type === 'ROLLOUT') && (typeof parsed !== 'number' || !Number.isFinite(parsed))) {
            return undefined;
        }
        if (
            type === 'ROLLOUT' &&
            (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 0 || parsed > 100)
        ) {
            return undefined;
        }
        if (type === 'MAP' && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')) {
            return undefined;
        }
        return JSON.stringify(parsed);
    } catch {
        return undefined;
    }
}
