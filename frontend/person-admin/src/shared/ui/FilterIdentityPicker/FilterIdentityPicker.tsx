'use client';

import { PersonPicker } from '@persons/person-domain/PersonPicker';
import { useTranslate } from '@persons/i18n';
import { UserFilterPicker } from '@/shared/ui/UserFilterPicker/UserFilterPicker';

export function FilterIdentityPicker({
    type,
    onChange,
}: {
    readonly type: 'person' | 'user';
    readonly onChange: (id: string, label: string) => void;
}) {
    const t = useTranslate('cms');
    return type === 'person' ? (
        <PersonPicker
            value={[]}
            onChange={(people) => {
                const person = people[0];
                if (person) {
                    onChange(person.id, person.fullName);
                }
            }}
            limit={1}
            label={t('filterPerson')}
        />
    ) : (
        <UserFilterPicker onChange={onChange} />
    );
}
