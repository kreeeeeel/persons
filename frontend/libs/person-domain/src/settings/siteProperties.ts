import { DynPropertyFactory } from "@persons/dynamic-properties/DynPropertyFactory";

export const siteProperties = {
    marquee: DynPropertyFactory.createBoolean("site.marqueeEnabled", true)
        .external()
        .build(),
    email: DynPropertyFactory.createString("legal.supportEmail")
        .external()
        .build(),
    operators: DynPropertyFactory.createStringMap("legal.operatorNames", {
        ru: "",
        en: "",
    })
        .external()
        .build(),
    pageSize: DynPropertyFactory.createInteger("catalog.pageSize", 12, 1, 60)
        .external()
        .build(),
    notices: DynPropertyFactory.createJson<
        Readonly<Record<string, readonly string[]>>
    >("site.noticeTexts", { ru: [], en: [] }, (value) => {
        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value) ||
            Object.values(value).some(
                (items) =>
                    !Array.isArray(items) ||
                    items.some((item: unknown) => typeof item !== "string"),
            )
        ) {
            throw new Error("Invalid localized notice texts");
        }
        return value as Readonly<Record<string, readonly string[]>>;
    })
        .external()
        .build(),
};
