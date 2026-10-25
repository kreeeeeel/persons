import type { Achievement } from '@persons/person-client';

export interface AchievementEditorProps {
    readonly achievement?: Achievement;
    readonly onClose: () => void;
    readonly onSaved: () => void;
}
