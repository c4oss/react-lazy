
import { ReactNode, useCallback, useEffect, useState } from "react"
import { Observable, firstValueFrom, from, isObservable } from "rxjs"
import { callOrGet } from "value-or-factory"
import { PromiseFactory, PromiseInput } from "./async.js"
import { Lazy } from "./components.js"
import { LazyHOCOptions, lazified } from "./hoc.js"
import { LAZY_LOADING, lazyAsPromise } from "./operators.js"
import { LazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

/**
 * Any input that is not already a lazy event, and must be subscribed to.
 */
export type LazySource<D> = PromiseInput<D> | Observable<D>
export type LazyInput<D> = LazyEvent<D> | LazySource<D>

export function isPromiseLike<D>(input: unknown): input is PromiseLike<D> {
    return typeof input === "object" && input !== null && typeof (input as PromiseLike<D>).then === "function"
}
export function isPromiseFactory<D>(input: unknown): input is PromiseFactory<D> {
    return typeof input === "function"
}
export function isLazySource<D>(input: LazyInput<D>): input is LazySource<D> {
    return isObservable(input) || isPromiseFactory(input) || isPromiseLike(input)
}

/**
 * A lazy input's value, loading it if it isn't yet: for something that needs it only on demand, like a download when
 * clicked. A source is subscribed to for its first value; an event that is still loading never resolves.
 */
export async function loadLazyInput<D>(input: LazyInput<D>): Promise<D> {
    return isLazySource(input) ? await firstValueFrom(lazySourceAsObservable(input)) : await lazyAsPromise(input)
}

/**
 * Converts a lazy source into an observable. Promise factories are called on subscribe, and the signal they receive is aborted on unsubscribe.
 */
export function lazySourceAsObservable<D>(source: LazySource<D>): Observable<D> {
    if (isObservable(source)) {
        return source
    }
    else if (isPromiseLike(source)) {
        return from(source)
    }
    return new Observable<D>(subscriber => {
        const controller = new AbortController()
        source(controller.signal).then(value => {
            subscriber.next(value)
            subscriber.complete()
        }, error => {
            subscriber.error(error)
        })
        return () => {
            controller.abort()
        }
    })
}

/**
 * A retry of a lazy source: for the source it was made for, so it no longer applies once the input changes.
 */
interface RetryRequest<D> {

    readonly source: LazySource<D>
    readonly count: number
    readonly suppressReload: boolean

}

/**
 * Resolves any lazy input into a lazy event.
 * Lazy events are passed through as-is. Other inputs are subscribed to.
 * A rejection can be retried (`retry`) when the source can be run again: a promise factory is called again, and an
 * observable is subscribed to again. A promise can't be, as it has already settled.
 */
export function useLazyInput<D>(input: LazyInput<D>): LazyEvent<D> {
    // The latest result, and the source it came from: a new input is loading from the render it first appears in,
    // instead of showing the last input's result until its subscription starts.
    const [current, setCurrent] = useState<{ readonly source?: LazySource<D> | undefined, readonly event: LazyEvent<D> }>({ event: LAZY_LOADING })
    const [retried, setRetried] = useState<RetryRequest<D>>()
    const request = retried !== undefined && retried.source === input ? retried : undefined
    const retry = useCallback((suppressReload = false) => {
        if (isObservable(input) || isPromiseFactory(input)) {
            setRetried(previous => ({ source: input, count: (previous?.source === input ? previous.count : 0) + 1, suppressReload }))
        }
    }, [
        input
    ])
    useEffect(() => {
        if (!isLazySource(input)) {
            return
        }
        const setEvent = (event: LazyEvent<D>) => setCurrent({ source: input, event })
        // a new input is already loading (see above); a retry of the same one goes back to loading, unless suppressed
        if (request !== undefined && !request.suppressReload) {
            setEvent(LAZY_LOADING)
        }
        if (isObservable(input)) {
            const sub = input.subscribe({
                next: value => {
                    setEvent({
                        status: "fulfilled",
                        value
                    })
                },
                error: reason => {
                    setEvent({
                        status: "rejected",
                        reason,
                        retry,
                    })
                }
            })
            return () => {
                sub.unsubscribe()
            }
        }
        else if (isPromiseFactory(input) || isPromiseLike(input)) {
            const controller = new AbortController()
            callOrGet(input, controller.signal).then(value => {
                setEvent({
                    status: "fulfilled",
                    value,
                })
            }, reason => {
                setEvent({
                    status: "rejected",
                    reason,
                    retry: isPromiseFactory(input) ? retry : undefined,
                })
            })
            return () => {
                controller.abort()
            }
        }
    }, [
        input,
        retry,
        request?.count,
    ])
    if (!isLazySource(input)) {
        return input
    }
    return current.source === input ? current.event : LAZY_LOADING
}

export interface LazyInputOptions<D> {

    /**
     * The lazy input. Promises, functions and observables MUST be memoized.
     */
    readonly input: LazyInput<D>

}

export interface ResolvingOptions<D, P> extends LazyInputOptions<D>, LazyHOCOptions<LazyState<D>, P> {
}

export function resolving<I extends {}, D extends {}, P extends {}>(factory: (props: I) => ResolvingOptions<D, P>) {
    return lazified((props: I) => {
        const options = factory(props)
        const event = useLazyInput(options.input)
        return {
            event,
            passthrough: options.passthrough,
            overrides: options.overrides,
        }
    })
}

export interface ResolvingProps<D> extends LazyInputOptions<D> {

    readonly children: ReactNode | ((value: D, state: LazyState<D>) => ReactNode)

    /**
     * The lazy overrides.
     */
    readonly overrides?: LazyOverrides | undefined

}

export const Resolving = <D,>(props: ResolvingProps<D>) => {
    const event = useLazyInput(props.input)
    return <Lazy event={event}
        overrides={props.overrides}
        children={props.children} />
}
