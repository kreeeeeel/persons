import type {
    AccountRestriction,
    RestrictionScope,
} from "@persons/person-client";

export interface RestrictionNoticeProps {
    readonly restriction: AccountRestriction;
    readonly scope: RestrictionScope;
}
