import pDefer from "p-defer"
import { createContext, DependencyList, useEffect, useMemo, useRef, useState } from "react"
import { Observable, Subject } from "rxjs"
import shallowEqual from "shallowequal"
import { ExtractLazy, LazyEvent, LazyFulfilled, LazyLoading, LazyOverrides, LazyRejected } from "./types.js"

export const LazyContext = createContext<LazyOverrides>({})

export function isLoading<T>(event: LazyEvent<T>): event is LazyLoading {
    if (event.status === "loading") {
        return true
    }
    else {
        return false
    }
}
export function isFulfilled<T>(event: LazyEvent<T>): event is LazyFulfilled<T> {
    if (event.status === "fulfilled") {
        return true
    }
    else {
        return false
    }
}
export function isRejected<T>(event: LazyEvent<T>): event is LazyRejected {
    if (event.status === "rejected") {
        return true
    }
    else {
        return false
    }
}

export function useLazyFlatten<O>(event: LazyEvent<LazyEvent<O>>,) {
    return useLazyChain(event, event => event)
}
export function useLazyChain<I, O>(event: LazyEvent<I>, map: (value: I) => LazyEvent<O>) {
    return useMemo(() => {
        if (event.status === "fulfilled") {
            return map(event.value)
        }
        else {
            return event
        }
    }, [
        event
    ])
}
export function useLazyMap<I, O>(event: LazyEvent<I>, map: (value: I) => O) {
    return useMemo(() => {
        if (event.status === "fulfilled") {
            return {
                status: "fulfilled" as const,
                value: map(event.value)
            }
        }
        else {
            return event
        }
    }, [
        event
    ])
}

export function useObservableAsPromise<T>(observable: Observable<T>) {
    const [promise, setPromise] = useState(() => new Promise<T>(() => void 0))
    useEffect(() => {
        const sub = observable.subscribe({
            next: value => {
                setPromise(Promise.resolve(value))
            },
            error: reason => {
                setPromise(Promise.reject(reason))
            }
        })
        return () => {
            sub.unsubscribe()
        }
    }, [
        observable
    ])
    return promise
}

export function useLazyAsPromise<T>(event: LazyEvent<T>) {
    const [promise, setPromise] = useState(() => pDefer<T>())
    useEffect(() => {
        if (event.status === "fulfilled") {
            promise.resolve(event.value)
        }
        else if (event.status === "rejected") {
            promise.reject(event.reason)
        }
        else {
            setPromise(pDefer<T>())
        }
    }, [
        event
    ])
    return promise.promise
}

export function useLazyAsObservable<T>(event: LazyEvent<T>) {
    const subject = useMemo(() => new Subject<T>(), [])
    useEffect(() => {
        if (event.status === "fulfilled") {
            subject.next(event.value)
        }
        else if (event.status === "rejected") {
            subject.error(event.reason)
        }
    }, [
        event
    ])
    return subject
}

function eachEqual<T extends DependencyList>(a: T, b: T) {
    if (a.length !== b.length) {
        return false
    }
    return a.every((value, key) => shallowEqual(value, b[key]))
}

export function useShallowMemo<T, D extends DependencyList>(factory: () => T, deps: D) {
    const ref = useRef(deps)
    if (!eachEqual(ref.current, deps)) {
        ref.current = deps
    }
    return useMemo(factory, [ref.current])
}

export function useLazyCombine<T extends Record<string, LazyEvent<unknown>>>(lazies: T): LazyEvent<{ [K in keyof T]: ExtractLazy<T[K]> }> {
    return useShallowMemo(() => {
        const entries = Object.entries(lazies)
        if (entries.map(entry => entry[1]).some(isLoading)) {
            return {
                status: "loading" as const,
            }
        }
        else {
            const failed = entries.map(entry => entry[1]).filter(isRejected).at(0)
            if (failed !== undefined) {
                return {
                    status: "rejected" as const,
                    reason: failed.reason
                }
            }
            else {
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
        }
    }, [
        lazies
    ])
}
