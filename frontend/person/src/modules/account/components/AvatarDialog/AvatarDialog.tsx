'use client';
import type { ComponentProps } from 'react';
import { AvatarDialog as SharedAvatarDialog } from '@persons/person-domain/account/components/AvatarDialog/AvatarDialog';
import { changeAvatar } from '@/modules/account/actions/changeAvatar';
export function AvatarDialog(props: Omit<ComponentProps<typeof SharedAvatarDialog>, 'saveAvatar'>) {
    return <SharedAvatarDialog {...props} saveAvatar={changeAvatar} />;
}
