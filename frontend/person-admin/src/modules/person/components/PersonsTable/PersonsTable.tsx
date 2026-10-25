'use client';
import { ActionTable } from '@/shared/ui/ActionTable/ActionTable';
import { Label } from '@gravity-ui/uikit';
import type { AdminPerson, MediaKind } from '@persons/person-client';
import { useLocale, useTranslate } from '@persons/i18n';
import { mediaHref } from '@persons/person-domain/api/browser';
import { IdentityCell } from '@/shared/ui/IdentityCell/IdentityCell';

export function PersonsTable({
    items,
    publicUrl,
    pending,
    onManage,
    onEdit,
    onOwner,
    onUpload,
    onRemove,
}: {
    readonly items: AdminPerson[];
    readonly publicUrl: string;
    readonly pending: boolean;
    readonly onManage: (person: AdminPerson) => void;
    readonly onEdit: (person: AdminPerson) => void;
    readonly onOwner: (person: AdminPerson) => void;
    readonly onUpload: (person: AdminPerson, kind: MediaKind) => void;
    readonly onRemove: (person: AdminPerson) => void;
}) {
    const t = useTranslate('person');
    const cms = useTranslate('cms');
    const locale = useLocale();
    return (
        <ActionTable
            data={items}
            label={(item) => item.fullName}
            disabled={pending}
            actions={(item) => [
                {
                    text: cms('view'),
                    href: new URL(`/${locale}/person/${item.tag}`, publicUrl).href,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
                { text: t('manageContent'), action: () => onManage(item) },
                { text: t('edit'), action: () => onEdit(item) },
                { text: t('owner'), action: () => onOwner(item) },
                ...(['AVATAR', 'PHOTO', 'MOMENT'] as const).map((kind) => ({
                    text: t(kind),
                    action: () => onUpload(item, kind),
                })),
                { text: t('remove'), theme: 'danger', action: () => onRemove(item) },
            ]}
            columns={[
                {
                    id: 'page',
                    name: cms('page'),
                    width: '35%',
                    template: (item) => (
                        <IdentityCell
                            name={item.fullName}
                            tag={item.tag}
                            avatar={item.avatarMediaId ? mediaHref(item.avatarMediaId) : undefined}
                        />
                    ),
                },
                {
                    id: 'owner',
                    name: cms('linked'),
                    width: '35%',
                    template: (item) =>
                        item.ownerAccountId ? (
                            <IdentityCell
                                name={item.ownerName || t('owner')}
                                tag={item.ownerTag}
                                avatar={item.ownerAvatarUrl}
                                href={
                                    item.ownerTag
                                        ? new URL(`/${locale}/person/${item.ownerTag}`, publicUrl).href
                                        : undefined
                                }
                            />
                        ) : (
                            <Label theme="normal">{cms('unlinked')}</Label>
                        ),
                },
                {
                    id: 'status',
                    name: cms('status'),
                    template: (item) => {
                        const status = item.status || (item.published ? 'PUBLISHED' : 'PENDING');
                        return (
                            <Label
                                theme={status === 'PUBLISHED' ? 'success' : status === 'PENDING' ? 'warning' : 'normal'}
                            >
                                {cms(
                                    status === 'PUBLISHED'
                                        ? 'published'
                                        : status === 'PENDING'
                                          ? 'pending'
                                          : status === 'HIDDEN'
                                            ? 'hidden'
                                            : 'draft',
                                )}
                            </Label>
                        );
                    },
                },
            ]}
        />
    );
}
