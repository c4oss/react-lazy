
import { PropsWithChildren, ReactNode, useContext } from "react"
import { LazyContext } from "./hooks.js"
import { useDelayedFlag } from "./internal.js"
import { LazyState, useLazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

export interface LazyProps<D> {

    readonly event: LazyEvent<D>
    readonly overrides?: LazyOverrides | undefined
    readonly children: ReactNode | ((value: D, state: LazyState<D>) => ReactNode)

}

export function Lazy<D>(props: LazyProps<D>): ReactNode {
    const context = useContext(LazyContext)
    const options = { ...context, ...props.overrides }
    const actual = useLazyState(props.event)
    const showLoading = useDelayedFlag(actual.isLoading, options.delay)
    const state = showLoading ? actual : settle(actual)
    if (state.isLoading && !state.isSettled) {
        if (options.onLoading === undefined || !showLoading) {
            return null
        }
        return options.onLoading({
            message: options.loadingMessage
        })
    }
    const onReloading = options.onReloading ?? ((props: PropsWithChildren) => props.children)
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
