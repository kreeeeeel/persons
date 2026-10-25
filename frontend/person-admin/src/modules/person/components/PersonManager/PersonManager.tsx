'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Flex } from '@gravity-ui/uikit';
import { useLocale, useTranslate } from '@persons/i18n';
import type { AdminPerson, MediaKind, PersonProfile } from '@persons/person-client';
import { personClient, personError } from '@persons/person-domain/api/browser';
import { useInfinitePersonData } from '@persons/person-domain/hooks/useInfinitePersonData';
import { InfiniteFeedLoader } from '@persons/person-domain/InfiniteFeedLoader';
import { ProfileEditor } from '@persons/person-domain/ProfileEditor';
import { MediaUploader } from '@persons/person-domain/MediaUploader';
import { useUploadEvents } from '@persons/person-domain/uploads/useUploadEvents';
import { OwnerDialog } from '@/modules/person/components/OwnerDialog/OwnerDialog';
import { ListPageHeader } from '@/shared/ui/ListPageHeader/ListPageHeader';
import { ListFilterBar } from '@/shared/ui/ListFilterBar/ListFilterBar';
import { ListTable } from '@/shared/ui/ListTable/ListTable';
import { PersonsTable } from '@/modules/person/components/PersonsTable/PersonsTable';

const PAGE_SIZE = 12;

export function PersonManager({ publicUrl }: { readonly publicUrl: string }) {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const locale = useLocale();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [editor, setEditor] = useState<{ profile?: PersonProfile }>();
    const [owner, setOwner] = useState<string>();
    const [upload, setUpload] = useState<{ personId: string; kind: MediaKind }>();
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const load = useCallback(
        (page: number, signal: AbortSignal) =>
            personClient.admin.listAdminPersons({ q: search, page, size: PAGE_SIZE }, { signal }),
        [search],
    );
    const resource = useInfinitePersonData(`persons:${search}`, load);
    useUploadEvents(undefined, () => resource.refresh());

    function saved() {
        setEditor(undefined);
        setOwner(undefined);
        setUpload(undefined);
        resource.refresh();
    }
    function action(operation: () => Promise<unknown>, onSuccess?: () => void) {
        setError(undefined);
        startTransition(async () => {
            try {
                await operation();
                onSuccess?.();
            } catch (failure) {
                setError(await personError(failure));
            }
        });
    }
    function edit(person: AdminPerson) {
        action(async () => setEditor({ profile: await personClient.persons.getPerson({ tag: person.tag }) }));
    }

    return (
        <Flex direction="column" gap="5">
            <ListPageHeader
                title={t('persons')}
                description={cms('personsDescription')}
                action={
                    <Button size="l" view="action" onClick={() => setEditor({})}>
                        {t('createPerson')}
                    </Button>
                }
            />
            {error && <Alert theme="danger" message={t(error)} />}
            <ListFilterBar search={search} onSearch={setSearch} placeholder={t('searchPersons')} />
            <ListTable
                title={t('persons')}
                loading={resource.loading}
                error={resource.error}
                retry={resource.refresh}
                empty={!resource.data?.items.length}
                emptyTitle={t('noPersons')}
                emptyDescription={t('noPersonsDescription')}
                illustration="search"
            >
                <PersonsTable
                    items={resource.data?.items ?? []}
                    publicUrl={publicUrl}
                    pending={pending}
                    onManage={(person) => router.push(`/${locale}/persons/${person.tag}`)}
                    onEdit={edit}
                    onOwner={(person) => setOwner(person.id)}
                    onUpload={(person, kind) => setUpload({ personId: person.id, kind })}
                    onRemove={(person) => action(() => personClient.persons.deletePerson({ id: person.id }), saved)}
                />
            </ListTable>
            <InfiniteFeedLoader {...resource} />
            {editor && (
                <ProfileEditor
                    administrator
                    profile={editor.profile}
                    onClose={() => setEditor(undefined)}
                    onSaved={saved}
                />
            )}
            {owner && <OwnerDialog personId={owner} onClose={() => setOwner(undefined)} onSaved={saved} />}
            {upload && <MediaUploader {...upload} onClose={() => setUpload(undefined)} onSaved={saved} />}
        </Flex>
    );
}
