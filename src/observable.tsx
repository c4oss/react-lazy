
import { ReactNode } from "react"
import { Observable, ObservedValueOf } from "rxjs"
import { Lazy } from "./components.js"
import { LazyHOCOptions, lazified } from "./hoc.js"
import { useLazyInput } from "./input.js"
import { LazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

export type ObservableLazyInput = Observable<any>// | Record<string, ObservableInput<any>>
export type ObservableLazyOutput<X extends ObservableLazyInput> = X extends Observable<any> ? ObservedValueOf<X> : { [K in keyof X]: ObservedValueOf<X[K]> }

export interface ObservableLazyOptions<D> {

    readonly of: Observable<D>

}

/**
 * Subscribes to an observable as a lazy event (see `useLazyInput`): an error can be retried, which subscribes again.
 */
export function useObservableLazy<D>(options: ObservableLazyOptions<D>): LazyEvent<D> {
    return useLazyInput(options.of)
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
