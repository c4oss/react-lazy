import { createContext, useMemo, useRef } from "react"
import { Retry } from "./async.js"
import { lazyAsObservable, lazyAsPromise, lazyChain, lazyCombine, lazyFlatten, lazyFold, lazyMap, lazyOrElse, lazyRecover } from "./operators.js"
import { ExtractLazy, LazyEvent, LazyOverrides } from "./types.js"

export const LazyContext = createContext<LazyOverrides>({})

/**
 * Whether two lazy events have the same result: both loading, or settled the same way with the same value (or reason).
 * A new event object for an unchanged result counts as the same.
 */
function laziesEqual<T>(a: LazyEvent<T>, b: LazyEvent<T>) {
    if (a.status === "loading" && b.status === "loading") {
        return true
    }
    if (a.status === "fulfilled" && b.status === "fulfilled" && a.value === b.value) {
        return true
    }
    if (a.status === "rejected" && b.status === "rejected" && a.reason === b.reason && a.retry === b.retry) {
        return true
    }
    return false
}

/**
 * Whether two records of lazy events have the same keys, each with the same result (see `laziesEqual`).
 */
function lazyRecordsEqual(a: Record<string, LazyEvent<unknown>>, b: Record<string, LazyEvent<unknown>>) {
    const entries = Object.entries(a)
    if (entries.length !== Object.keys(b).length) {
        return false
    }
    return entries.every(([key, event]) => {
        const other = b[key]
        return other !== undefined && laziesEqual(event, other)
    })
}

export function useLazyFlatten<O>(event: LazyEvent<LazyEvent<O>>) {
    return useMemo(() => lazyFlatten(event), [event])
}
export function useLazyChain<I, O>(event: LazyEvent<I>, map: (value: I) => LazyEvent<O>) {
    return useMemo(() => lazyChain(event, map), [event])
}
export function useLazyMap<I, O>(event: LazyEvent<I>, map: (value: I) => O) {
    return useMemo(() => lazyMap(event, map), [event])
}
export function useLazyRecover<T>(event: LazyEvent<T>, map: (reason: unknown) => LazyEvent<T>) {
    return useMemo(() => lazyRecover(event, map), [event])
}
export function useLazyOrElse<T, D>(event: LazyEvent<T>, orElse: () => D) {
    return useMemo(() => lazyOrElse(event, orElse), [event])
}
export function useLazyFold<T, O>(event: LazyEvent<T>, loading: () => O, fulfilled: (value: T) => O, rejected: (reason: unknown, retry?: Retry | undefined) => O) {
    return useMemo(() => lazyFold(event, loading, fulfilled, rejected), [event])
}
export function useLazyCombine<T extends Record<string, LazyEvent<unknown>>>(lazies: T): LazyEvent<{ [K in keyof T]: ExtractLazy<T[K]> }> {
    const kept = useRef(lazies)
    if (!lazyRecordsEqual(kept.current, lazies)) {
        kept.current = lazies
    }
    const current = kept.current
    return useMemo(() => lazyCombine(current), [current])
}
export function useLazyAsPromise<T>(event: LazyEvent<T>) {
    return useMemo(() => lazyAsPromise(event), [event])
}
export function useLazyAsObservable<T>(event: LazyEvent<T>) {
    return useMemo(() => lazyAsObservable(event), [event])
}
