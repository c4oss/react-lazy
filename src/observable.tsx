
import { ReactNode, useEffect, useState } from "react"
import { Observable, ObservedValueOf } from "rxjs"
import { Lazy } from "./components"
import { LazyHOCOptions, lazified } from "./hoc"
import { useLazyFlatten } from "./hooks"
import { useIsFirstMount } from "./internal"
import { LazyState } from "./state"
import { LazyEvent, LazyOverrides } from "./types"

//
export type ObservableLazyInput = Observable<any>// | Record<string, ObservableInput<any>>
export type ObservableLazyOutput<X extends ObservableLazyInput> = X extends Observable<any> ? ObservedValueOf<X> : { [K in keyof X]: ObservedValueOf<X[K]> }

export interface ObservableLazyOptions<D> {

    readonly of: Observable<D>

}

export function useObservableLazyWrapped<D>(options: ObservableLazyOptions<LazyEvent<D>>) {
    return useLazyFlatten(useObservableLazy(options))
}

export function useObservableLazy<D>(options: ObservableLazyOptions<D>) {
    const [event, setEvent] = useState<LazyEvent<D>>({ status: "loading" as const })
    const isFirstMount = useIsFirstMount()
    useEffect(() => {
        if (!isFirstMount) {
            setEvent({
                status: "loading"
            })
        }
        const sub = options.of.subscribe({
            next: value => {
                setEvent({
                    status: "fulfilled",
                    value
                })
            },
            error: reason => {
                setEvent({
                    status: "rejected",
                    reason
                })
            }
        })
        return () => {
            sub.unsubscribe()
        }
    }, [
        options.of
    ])
    return event
}

export interface ObservingOptions<D, P> extends ObservableLazyOptions<D>, LazyHOCOptions<LazyState<D>, P> {
}

export function observing<I extends {}, D extends {}, P extends {}>(factory: (props: I) => ObservingOptions<D, P>) {
    return lazified((props: I) => {
        const options = factory(props)
        const event = useObservableLazy(options)
        return {
            event,
            passthrough: options.passthrough,
            overrides: options.overrides,
        }
    })
}

export interface ObservingProps<D> extends ObservableLazyOptions<D> {

    readonly children: (value: D, state: LazyState<D>) => ReactNode
    readonly overrides?: LazyOverrides | undefined

}

export const Observing = <D,>(props: ObservingProps<D>) => {
    const event = useObservableLazy(props)
    return <Lazy event={event}
        overrides={props.overrides}
        children={props.children} />
}
