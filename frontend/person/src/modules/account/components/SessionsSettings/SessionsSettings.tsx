'use client';
import { SessionsSettings as SharedSessionsSettings } from '@persons/person-domain/account/components/SessionsSettings/SessionsSettings';
import { listAccountSessions, endAccountSession, endOtherAccountSessions } from '@/modules/account/actions/sessions';

export function SessionsSettings() {
    return <SharedSessionsSettings actions={{ listAccountSessions, endAccountSession, endOtherAccountSessions }} />;
}
