import type { PersonSummary } from '@persons/person-client';
import { demoPeople } from '@test/fixtures/demoPeople';

// The same identifiers as the disposable preview service. Not a production directory.
export const previewPages: readonly PersonSummary[] = demoPeople.map((person, index) => ({
    id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, '0')}`,
    tag: person.tag,
    fullName: person.name.ru,
}));
