import pDefer from "p-defer"
import { createContext, useEffect, useMemo, useState } from "react"
import { Observable, Subject } from "rxjs"
import { useIsFirstMount } from "./internal.js"
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
    const [promise, setPromise] = useState(() => pDefer<T>())
    const isFirstMount = useIsFirstMount()
    useEffect(() => {
        if (!isFirstMount) {
            setPromise(pDefer<T>())
        }
    }, [
        observable
    ])
    useEffect(() => {
        const sub = observable.subscribe({
            next: value => {
                promise.resolve(value)
            },
            error: reason => {
                promise.reject(reason)
            }
        })
        return () => {
            sub.unsubscribe()
        }
    }, [
        promise
    ])
    return promise.promise
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

export function useLazyCombine<T extends Record<string, LazyEvent<unknown>>>(lazies: T): LazyEvent<{ [K in keyof T]: ExtractLazy<T[K]> }> {
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
                reason: failed
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
}
