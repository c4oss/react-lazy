
import { PropsWithChildren, ReactNode, useContext } from "react"
import { LazyContext } from "./hooks.js"
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
    const state = useLazyState(props.event)
    if (state.isLoading && !state.isSettled) {
        if (options.onLoading === undefined) {
            return null
        }
        return options.onLoading({
            message: options.loadingMessage ?? options.defaultMessage
        })
    }
    const onReloading = options.onReloading ?? ((props: PropsWithChildren) => props.children)
    return onReloading({
        reloading: state.isLoading,
        message: options.reloadingMessage ?? options.defaultMessage,
        children: (() => {
            if (state.isRejected) {
                if (options.onError === undefined) {
                    throw state.reason
                }
                return options.onError({
                    reason: state.reason,
                    message: options.errorMessage ?? options.defaultMessage,
                })
            }
            else {
                return typeof props.children === "function" ? props.children(state.value, state) : props.children
            }
        })()
    })
}
