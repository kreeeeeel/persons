import type { Moment, Photo } from "@persons/person-client";

export interface MediaCardProps {
    readonly item: Moment | Photo;
    readonly kind: "PHOTO" | "MOMENT";
    readonly onOpen: () => void;
    readonly showViews?: boolean;
}
