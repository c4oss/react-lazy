
import { PropsWithChildren, ReactNode, useContext, useMemo } from "react"
import { LazyContext } from "./hooks.js"
import { useDelayedFlag } from "./internal.js"
import { LazyState, useLazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

export interface LazyProps<D> {

    readonly event: LazyEvent<D>
    readonly overrides?: LazyOverrides | undefined
    readonly children: ReactNode | ((value: D, state: LazyState<D>) => ReactNode)

}

export interface LazyOverridesProviderProps {

    readonly overrides: LazyOverrides
    readonly children?: ReactNode | undefined

}

/**
 * Provides lazy overrides to the components below it, on top of any provided above it. `LazyContext.Provider` replaces
 * them instead, so options set further up (e.g. `delay`) are lost.
 */
export function LazyOverridesProvider(props: LazyOverridesProviderProps): ReactNode {
    const parent = useContext(LazyContext)
    const value = useMemo(() => ({ ...parent, ...props.overrides }), [parent, props.overrides])
    return <LazyContext.Provider value={value}>{props.children}</LazyContext.Provider>
}

export interface LazyDisplayState<D> {

    /**
     * The state to show. Until loading has lasted the `delay`, a reload shows as the settled state it is reloading from.
     */
    readonly state: LazyState<D>
    /**
     * Whether loading has lasted the `delay`, so it should be shown. An initial load before then shows nothing.
     */
    readonly showLoading: boolean

}

/**
 * An event's state as `Lazy` would show it, applying the `delay` from the context (and `overrides`). For components
 * that show the states themselves instead of through `Lazy`.
 */
export function useLazyDisplayState<D>(event: LazyEvent<D>, overrides?: LazyOverrides | undefined): LazyDisplayState<D> {
    const context = useContext(LazyContext)
    const delay = { ...context, ...overrides }.delay
    const actual = useLazyState(event)
    const showLoading = useDelayedFlag(actual.isLoading, delay)
    return {
        state: showLoading ? actual : settle(actual),
        showLoading,
    }
}

export function Lazy<D>(props: LazyProps<D>): ReactNode {
    const context = useContext(LazyContext)
    const options = { ...context, ...props.overrides }
    const { state, showLoading } = useLazyDisplayState(props.event, props.overrides)
    if (state.isLoading && (!state.isSettled || options.onReloading === "loading")) {
        if (options.onLoading === undefined || !showLoading) {
            return null
        }
        return options.onLoading({
            message: options.loadingMessage
        })
    }
    const onReloading = options.onReloading === undefined || options.onReloading === "loading" ? (props: PropsWithChildren) => props.children : options.onReloading
    return onReloading({
        reloading: state.isLoading,
        message: options.reloadingMessage ?? options.loadingMessage,
        children: (() => {
            if (state.isRejected) {
                if (options.onError === undefined) {
                    throw state.reason
                }
                return options.onError({
                    reason: state.reason,
                })
            }
            else {
                return typeof props.children === "function" ? props.children(state.value, state) : props.children
            }
        })()
    })
}

/**
 * Presents a reloading state as the settled state it is reloading from, for use while the loading delay has not yet elapsed.
 */
function settle<D>(state: LazyState<D>): LazyState<D> {
    if (!state.isReloading) {
        return state
    }
    if (state.isFulfilled) {
        return {
            isLoading: false,
            isReloading: false,
            isSettled: true,
            isFulfilled: true,
            isRejected: false,
            value: state.value,
        }
    }
    return {
        isLoading: false,
        isReloading: false,
        isSettled: true,
        isFulfilled: false,
        isRejected: true,
        reason: state.reason,
        retry: state.retry,
    }
}
