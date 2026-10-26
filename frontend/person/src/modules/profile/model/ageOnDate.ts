export function ageOnDate(birthDate: string, today: string) {
    const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
    return years - (today.slice(5) < birthDate.slice(5) ? 1 : 0);
}
