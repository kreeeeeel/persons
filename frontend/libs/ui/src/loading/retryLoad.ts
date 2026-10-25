const INITIAL_ATTEMPT = 0;
const NEXT_ATTEMPT_STEP = 1;
const RETRY_BACKOFF_MULTIPLIER = 2;
const INITIAL_DELAY_MILLIS = 1000;
const MAX_DELAY_MILLIS = 15000;
const REQUEST_TIMEOUT_MILLIS = 20000;
const NOTIFICATION_ATTEMPT = 3;

export interface RetryLoadOptions<T> {
    readonly signal: AbortSignal;
    readonly accept?: (result: T) => boolean;
    readonly onFailure?: () => void;
    readonly onUnavailable?: () => void;
}

function waitFor<T>(operation: Promise<T>, signal: AbortSignal, timeout: number): Promise<T> {
    signal.throwIfAborted();

    return new Promise((resolve, reject) => {
        const finish = (settle: () => void) => {
            clearTimeout(timer);
            signal.removeEventListener('abort', abort);
            settle();
        };
        const abort = () => finish(() => reject(signal.reason));
        const timer = setTimeout(
            () => finish(() => reject(new DOMException('Loading timed out', 'TimeoutError'))),
            timeout,
        );

        signal.addEventListener('abort', abort, { once: true });
        operation.then(
            (result) => finish(() => resolve(result)),
            (error: unknown) => finish(() => reject(error)),
        );
    });
}

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();

    return new Promise((resolve, reject) => {
        const abort = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', abort);
            resolve();
        }, delay);

        signal.addEventListener('abort', abort, { once: true });
    });
}

/** Only use for reads: a timed-out write may already have been committed. */
export async function retryLoad<T>(load: () => Promise<T>, options: RetryLoadOptions<T>): Promise<T> {
    let attempt = INITIAL_ATTEMPT;
    let delay = INITIAL_DELAY_MILLIS;

    for (;;) {
        options.signal.throwIfAborted();

        try {
            const result = await waitFor(load(), options.signal, REQUEST_TIMEOUT_MILLIS);

            options.signal.throwIfAborted();

            if (!options.accept || options.accept(result)) {
                return result;
            }
        } catch (error) {
            if (options.signal.aborted) {
                throw error;
            }
        }

        options.onFailure?.();
        attempt += NEXT_ATTEMPT_STEP;

        if (attempt === NOTIFICATION_ATTEMPT) {
            options.onUnavailable?.();
        }

        await waitForRetry(delay, options.signal);
        delay = Math.min(delay * RETRY_BACKOFF_MULTIPLIER, MAX_DELAY_MILLIS);
    }
}
