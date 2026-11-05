
import { ReactNode, useCallback, useEffect, useState } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { Lazy } from "./components.js"
import { LazyHOCOptions, lazified } from "./hoc.js"
import { useIsFirstMount } from "./internal.js"
import { LazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

/**
 * Options for the async hook.
 * @typeParam D The data type.
 */
export interface AsyncLazyOptions<D> {

    /**
     * A promise or a function that returns a promise. This MUST be memoized - the function will re-run every time a new value is received.
     */
    readonly promise: ValueOrFactory<PromiseLike<D>, [AbortController]>

    /**
     * Don't execute immediately.
     */
    readonly defer?: AsyncLazyDefer<D> | undefined

}

export interface AsyncLazyDefer<D> {

    /**
     * The initial value to provide.
     */
    readonly initial: D

}

export type AsyncLazyEvent<D> = LazyEvent<D> & { readonly retry: Retry }

export function useAsyncLazy<D>(input: AsyncLazyOptions<D> | (() => PromiseLike<D>)): AsyncLazyEvent<D> {
    const options = typeof input === "function" ? { promise: input } : input
    const [event, setEvent] = useState<LazyEvent<D>>(options.defer === undefined ? { status: "loading" } : { status: "fulfilled", value: options.defer.initial })
    const run = useCallback((controller: AbortController) => {
        callOrGet(options.promise, controller).then(value => {
            setEvent({
                status: "fulfilled",
                value,
            })
        }, reason => {
            setEvent({
                status: "rejected",
                reason,
            })
        })
    }, [
        options.promise
    ])
    const retry = useCallback((suppressReload = false) => {
        if (!suppressReload) {
            setEvent({
                status: "loading"
            })
        }
        const controller = new AbortController()
        run(controller)
        return () => {
            controller.abort()
        }
    }, [
        run
    ])
    const isFirstMount = useIsFirstMount()
    useEffect(() => {
        if (isFirstMount) {
            if (options.defer !== undefined) {
                return
            }
        }
        else {
            setEvent({
                status: "loading"
            })
        }
        const controller = new AbortController()
        run(controller)
        return () => {
            controller.abort()
        }
    }, [
        run,
    ])
    return {
        ...event,
        retry
    }
}

export type AsyncLazyState<D> = LazyState<D> & { readonly retry: Retry }

export interface AsyncifiedOptions<D, P> extends AsyncLazyOptions<D>, LazyHOCOptions<AsyncLazyState<D>, P> {
}

export function asyncified<I extends {}, D extends {}, P extends {}>(factory: (props: I) => AsyncifiedOptions<D, P>) {
    return lazified((props: I) => {
        const options = factory(props)
        const event = useAsyncLazy(options)
        return {
            event,
            passthrough: state => callOrGet(options.passthrough, { ...state, retry: event.retry }),
            overrides: options.overrides,
        }
    })
}

export type Retry = (suppressReload?: boolean | undefined) => void

export interface AsyncifiedProps<D> extends AsyncLazyOptions<D> {

    readonly children: ValueOrFactory<ReactNode, [D, AsyncLazyState<D>]>

    /**
     * The lazy overrides.
     */
    readonly overrides?: LazyOverrides | undefined

}

export const Asyncified = <D,>(props: AsyncifiedProps<D>) => {
    const event = useAsyncLazy(props)
    return <Lazy event={event}
        overrides={props.overrides}
        children={(value, state) => callOrGet(props.children, value, { ...state, retry: event.retry })} />
}
