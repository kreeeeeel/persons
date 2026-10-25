"use client";

const PROFILE_CHANGED_EVENT = "persons:account-profile-changed";

export function notifyAccountProfileChanged() {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

export function subscribeAccountProfileChanges(refresh: () => void) {
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
}
