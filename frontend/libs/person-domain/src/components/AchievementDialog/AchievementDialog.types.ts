import type { PersonAchievement } from "@persons/person-client";

export interface AchievementDialogProps {
    readonly item: PersonAchievement;
    readonly canManage?: boolean;
    readonly pending: boolean;
    readonly onClose: () => void;
    readonly onRevoke: () => void;
}
