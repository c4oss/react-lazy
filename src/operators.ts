import { NEVER, Observable, of, throwError } from "rxjs"
import { Retry } from "./async.js"
import { ExtractLazy, LazyEvent, LazyFulfilled, LazyLoading, LazyRejected, LazySettled } from "./types.js"

/**
 * The loading event. There is only one, as it carries nothing: every loading event is the same object, so memos and
 * state updates see no change from one loading event to the next.
 */
export const LAZY_LOADING: LazyLoading = Object.freeze({ status: "loading" })
export function lazyFulfilled<T>(value: T): LazyFulfilled<T> {
    return {
        status: "fulfilled",
        value,
    }
}
export function lazyRejected(reason: unknown, retry?: Retry | undefined): LazyRejected {
    return {
        status: "rejected",
        reason,
        retry,
    }
}

export function isLoading<T>(event: LazyEvent<T>): event is LazyLoading {
    return event.status === "loading"
}
export function isSettled<T>(event: LazyEvent<T>): event is LazySettled<T> {
    return event.status === "fulfilled" || event.status === "rejected"
}
export function isFulfilled<T>(event: LazyEvent<T>): event is LazyFulfilled<T> {
    return event.status === "fulfilled"
}
export function isRejected<T>(event: LazyEvent<T>): event is LazyRejected {
    return event.status === "rejected"
}


export function lazyAsPromise<T>(event: LazyEvent<T>): Promise<T> {
    if (event.status === "fulfilled") {
        return Promise.resolve(event.value)
    }
    else if (event.status === "rejected") {
        return Promise.reject(event.reason)
    }
    else {
        return new Promise<never>(() => void 0)
    }
}
export function lazyAsObservable<T>(event: LazyEvent<T>): Observable<T> {
    if (event.status === "fulfilled") {
        return of(event.value)
    }
    else if (event.status === "rejected") {
        return throwError(() => event.reason)
    }
    else {
        return NEVER
    }
}

export function lazyFold<T, O>(event: LazyEvent<T>, loading: () => O, fulfilled: (value: T) => O, rejected: (reason: unknown, retry?: Retry | undefined) => O) {
    if (event.status === "loading") {
        return loading()
    }
    else if (event.status === "fulfilled") {
        return fulfilled(event.value)
    }
    else {
        return rejected(event.reason, event.retry)
    }
}
export function lazyOrElse<T, D>(event: LazyEvent<T>, orElse: () => D) {
    if (isFulfilled(event)) {
        return event.value
    }
    return orElse()
}
export function lazyOrUndefined<T>(event: LazyEvent<T>) {
    return lazyOrElse(event, () => undefined)
}
export function lazyFlatten<O>(event: LazyEvent<LazyEvent<O>>): LazyEvent<O> {
    return lazyChain(event, event => event)
}
export function lazyChain<I, O>(event: LazyEvent<I>, map: (value: I) => LazyEvent<O>): LazyEvent<O> {
    if (event.status === "fulfilled") {
        return map(event.value)
    }
    else {
        return event
    }
}
export function lazyMap<I, O>(event: LazyEvent<I>, map: (value: I) => O): LazyEvent<O> {
    if (event.status === "fulfilled") {
        return {
            status: "fulfilled",
            value: map(event.value)
        }
    }
    else {
        return event
    }
}
export function lazyRecover<T>(event: LazyEvent<T>, map: (reason: unknown) => LazyEvent<T>): LazyEvent<T> {
    if (event.status === "rejected") {
        return map(event.reason)
    }
    else {
        return event
    }
}
export function lazyCombine<T extends Record<string, LazyEvent<unknown>>>(lazies: T): LazyEvent<{ [K in keyof T]: ExtractLazy<T[K]> }> {
    const entries = Object.entries(lazies)
    if (entries.map(entry => entry[1]).some(isLoading)) {
        return LAZY_LOADING
    }
    const failed = entries.map(entry => entry[1]).filter(isRejected)
    if (failed.length > 0) {
        return {
            status: "rejected",
            reason: failed.map(failed => failed.reason),
            retry: (suppressReload?: boolean | undefined) => {
                failed.forEach(failed => {
                    failed.retry?.(suppressReload)
                })
            }
        }
    }
    return {
        status: "fulfilled",
        value: Object.fromEntries(
            entries.map(([key, value]) => {
                return [
                    key,
                    value.status === "fulfilled" ? value.value : undefined,
                ] as const
            })
        ) as { [K in keyof T]: ExtractLazy<T[K]> }
    }
}
/**
 * Combines an array of lazy events into a lazy event of their values. Loading if any are loading, rejected (with all reasons) if any are rejected.
 */
export function lazyAll<T>(events: readonly LazyEvent<T>[]): LazyEvent<T[]> {
    if (events.some(isLoading)) {
        return LAZY_LOADING
    }
    const failed = events.filter(isRejected)
    if (failed.length > 0) {
        return lazyRejected(failed.map(failed => failed.reason), suppressReload => {
            failed.forEach(failed => {
                failed.retry?.(suppressReload)
            })
        })
    }
    return lazyFulfilled(events.map(event => (event as LazyFulfilled<T>).value))
}
