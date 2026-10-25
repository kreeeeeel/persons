export interface PanelProps {
    readonly personId: string;
    readonly signedIn: boolean;
    readonly publicUrl?: string;
}

export interface CommentsFeedProps extends PanelProps {
    readonly momentId?: string;
    readonly mediaId?: string;
    readonly showHeading?: boolean;
    readonly layout?: "feed" | "media";
}
