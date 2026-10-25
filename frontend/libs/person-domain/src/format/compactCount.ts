const THOUSAND = 1000;
const MILLION = 1000000;

export function compactCount(value: number, locale = "ru"): string {
    const count = Math.max(0, Math.floor(value));
    if (count < THOUSAND) {
        return String(count);
    }
    const millions = count >= MILLION;
    const scale = millions ? MILLION : THOUSAND;
    const precision = millions ? THOUSAND : 10;
    const amount = Math.floor((count / scale) * precision) / precision;
    const suffix = millions
        ? locale === "ru"
            ? "М"
            : "M"
        : locale === "ru"
          ? "К"
          : "K";
    return `${amount}${suffix}`;
}
