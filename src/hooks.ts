import { createContext, DependencyList, useMemo, useRef } from "react"
import shallowEqual from "shallowequal"
import { Retry } from "./async.js"
import { lazyAsObservable, lazyAsPromise, lazyChain, lazyCombine, lazyFlatten, lazyFold, lazyMap, lazyOrElse, lazyRecover } from "./operators.js"
import { ExtractLazy, LazyEvent, LazyOverrides } from "./types.js"

export const LazyContext = createContext<LazyOverrides>({})

/*
//TODO use this
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
*/

function eachEqual<T extends DependencyList>(a: T, b: T) {
    if (a.length !== b.length) {
        return false
    }
    return a.every((value, key) => shallowEqual(value, b[key]))
}
function useShallowMemo<T, D extends DependencyList>(factory: () => T, deps: D) {
    const ref = useRef(deps)
    if (!eachEqual(ref.current, deps)) {
        ref.current = deps
    }
    return useMemo(factory, [ref.current])
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
    return useShallowMemo(() => lazyCombine(lazies), [lazies])
}
export function useLazyAsPromise<T>(event: LazyEvent<T>) {
    return useMemo(() => lazyAsPromise(event), [event])
}
export function useLazyAsObservable<T>(event: LazyEvent<T>) {
    return useMemo(() => lazyAsObservable(event), [event])
}
