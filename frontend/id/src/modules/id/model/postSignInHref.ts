export function postSignInHref(locale: string, search: string): string {
    const destination = new URLSearchParams(search).get('returnTo');

    return destination &&
        /^(\/(ru|en)\/home|\/admin\/(ru|en)|\/person\/(ru|en)(\/[a-z][a-z0-9-]{1,31})?)$/.test(destination)
        ? destination
        : `/${locale}/home`;
}
