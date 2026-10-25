export const COOKIE_PREFERENCE = 'PERSONS_OPTIONAL_COOKIES';
export const COOKIE_PREFERENCE_CHANGED = 'persons:cookie-preference-changed';
export const COOKIE_PREFERENCE_OPEN = 'persons:cookie-preference-open';

export function readCookiePreference(): 'accepted' | 'rejected' | undefined {
    const value = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE_PREFERENCE}=`))
        ?.slice(COOKIE_PREFERENCE.length + 1);

    return value === 'accepted' || value === 'rejected' ? value : undefined;
}

export function subscribeCookiePreference(listener: () => void) {
    window.addEventListener(COOKIE_PREFERENCE_CHANGED, listener);
    window.addEventListener('focus', listener);

    return () => {
        window.removeEventListener(COOKIE_PREFERENCE_CHANGED, listener);
        window.removeEventListener('focus', listener);
    };
}

export function openCookiePreferences() {
    window.dispatchEvent(new Event(COOKIE_PREFERENCE_OPEN));
}
