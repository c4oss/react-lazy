import { useEffect, useMemo, useRef, useState } from "react"
import { Observable, Subscription } from "rxjs"
import { PromiseFactory } from "./async.js"
import { isLazySource, LazyInput, LazySource, lazySourceAsObservable } from "./input.js"
import { LAZY_LOADING, lazyAll, lazyFulfilled, lazyRejected } from "./operators.js"
import { LazyEvent, LazyFulfilled, LazySettled } from "./types.js"

/**
 * The value type of a lazy input.
 */
export type LazyInputValue<T> =
    T extends Observable<infer D> ? D :
    T extends PromiseLike<infer D> ? D :
    T extends PromiseFactory<infer D> ? D :
    T extends LazyFulfilled<infer D> ? D :
    never

/**
 * Returns the previous array instance as long as its elements are identical, so it can be used as a stable dependency.
 */
export function useStableArray<T>(array: readonly T[]): readonly T[] {
    const ref = useRef(array)
    if (ref.current.length !== array.length || ref.current.some((value, index) => value !== array[index])) {
        ref.current = array
    }
    return ref.current
}

/**
 * Resolves an array of lazy inputs into a single lazy event of their values.
 * Each source has its own subscription, so changing one source only reloads that source. Identical sources share one subscription.
 * Lazy events in the array are read directly and never cause a resubscription.
 */
export function useLazyInputs<T extends readonly LazyInput<unknown>[]>(inputs: readonly [...T]): LazyEvent<{ -readonly [K in keyof T]: LazyInputValue<T[K]> }> {
    const sources = useStableArray(inputs.filter(isLazySource))
    const [results, setResults] = useState<ReadonlyMap<LazySource<unknown>, LazySettled<unknown>>>(() => new Map())
    const subscriptions = useRef(new Map<LazySource<unknown>, Subscription>())
    useEffect(() => {
        const current = subscriptions.current
        const wanted = new Set(sources)
        const update = (source: LazySource<unknown>, event: LazySettled<unknown>) => {
            setResults(results => new Map(results).set(source, event))
        }
        for (const [source, sub] of current) {
            if (!wanted.has(source)) {
                sub.unsubscribe()
                current.delete(source)
            }
        }
        setResults(results => {
            const pruned = new Map([...results].filter(([source]) => wanted.has(source)))
            return pruned.size === results.size ? results : pruned
        })
        for (const source of wanted) {
            if (!current.has(source)) {
                current.set(source, lazySourceAsObservable(source).subscribe({
                    next: value => update(source, lazyFulfilled(value)),
                    error: reason => update(source, lazyRejected(reason)),
                }))
            }
        }
    }, [
        sources
    ])
    useEffect(() => {
        const current = subscriptions.current
        return () => {
            current.forEach(sub => sub.unsubscribe())
            current.clear()
        }
    }, [])
    const events = useStableArray(inputs.map((input: LazyInput<unknown>) => isLazySource(input) ? results.get(input) ?? LAZY_LOADING : input))
    return useMemo(() => lazyAll(events) as LazyEvent<{ -readonly [K in keyof T]: LazyInputValue<T[K]> }>, [events])
}
