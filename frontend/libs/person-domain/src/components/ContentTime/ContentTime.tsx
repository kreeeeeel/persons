"use client";

import { Text } from "@gravity-ui/uikit";
import { useLocale, useTranslate } from "@persons/i18n";
import { useContentClock } from "@persons/person-domain/ContentTime/useContentClock";

const TIME_ZONE = "Europe/Moscow";

export function ContentTime({
    date,
    className,
}: {
    readonly date: Date;
    readonly className?: string;
}) {
    const locale = useLocale();
    const t = useTranslate("person");
    const now = useContentClock();
    const full = new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: TIME_ZONE,
    }).format(date);
    const calendar = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: TIME_ZONE,
    });
    const day = calendar.format(date);
    const today = now === undefined ? undefined : calendar.format(now);
    const yesterday =
        now === undefined ? undefined : calendar.format(now - 86_400_000);
    const minutes =
        now === undefined
            ? undefined
            : Math.floor((now - date.getTime()) / 60_000);
    const time = new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: TIME_ZONE,
    }).format(date);
    const absolute = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year:
            now === undefined ||
            calendar.format(now).slice(0, 4) !== day.slice(0, 4)
                ? "numeric"
                : undefined,
        timeZone: TIME_ZONE,
    }).format(date);
    let label = `${absolute}, ${time}`;
    if (minutes !== undefined && minutes >= 0 && minutes < 1) {
        label = t("recently");
    } else if (minutes !== undefined && minutes >= 1 && minutes < 60) {
        label = new Intl.RelativeTimeFormat(locale).format(-minutes, "minute");
    } else if (day === yesterday) {
        label = t("yesterdayAt", { time });
    } else if (day === today && minutes !== undefined && minutes >= 60) {
        label = new Intl.RelativeTimeFormat(locale).format(
            -Math.floor(minutes / 60),
            "hour",
        );
    }
    return (
        <Text
            as="time"
            dateTime={date.toISOString()}
            title={full}
            color="secondary"
            className={className}
        >
            {label}
        </Text>
    );
}
