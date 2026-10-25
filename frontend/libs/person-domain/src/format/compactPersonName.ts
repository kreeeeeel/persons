/** Summaries use family-first order; account author labels use given-first order. */
export function compactPersonName(
    fullName: string,
    order: "given-first" | "family-first",
): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const normalized = parts.join(" ");
    if (parts.length < 2 || normalized.length <= 10) {
        return normalized;
    }
    const [first, second] = parts;
    const givenName = order === "given-first" ? first : second;
    const familyName = order === "given-first" ? second : first;
    return `${givenName} ${Array.from(familyName)[0]}.`;
}
