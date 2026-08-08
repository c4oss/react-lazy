import { usePrevious } from "./internal.js"
import { LazyEvent, LazySettled } from "./types.js"

export type LazyState<D> = {
    readonly isLoading: true
    readonly isReloading: false
    readonly isSettled: false
    readonly isFulfilled: false
    readonly isRejected: false
} | {
    readonly isLoading: true
    readonly isReloading: true
    readonly isSettled: true
    readonly isFulfilled: true
    readonly isRejected: false
    readonly value: D
} | {
    readonly isLoading: true
    readonly isReloading: true
    readonly isSettled: true
    readonly isFulfilled: false
    readonly isRejected: true
    readonly reason: unknown
    readonly retry?: (() => void) | undefined
} | {
    readonly isLoading: false
    readonly isReloading: false
    readonly isSettled: true
    readonly isFulfilled: true
    readonly isRejected: false
    readonly value: D
} | {
    readonly isLoading: false
    readonly isReloading: false
    readonly isSettled: true
    readonly isFulfilled: false
    readonly isRejected: true
    readonly reason: unknown
    readonly retry?: (() => void) | undefined
}

export function useLazyState<D>(current: LazyEvent<D>): LazyState<D> {
    const settled = usePrevious<LazySettled<D>>(current.status === "fulfilled" || current.status === "rejected" ? { current } : undefined)
    if (current.status === "loading") {
        if (settled === undefined) {
            return {
                isLoading: true,
                isReloading: false,
                isSettled: false,
                isFulfilled: false,
                isRejected: false,
            }
        }
        else {
            if (settled.status === "fulfilled") {
                return {
                    isLoading: true,
                    isReloading: true,
                    isSettled: true,
                    isFulfilled: true,
                    isRejected: false,
                    value: settled.value,
                }
            }
            else {
                return {
                    isLoading: true,
                    isReloading: true,
                    isSettled: true,
                    isFulfilled: false,
                    isRejected: true,
                    reason: settled.reason,
                    retry: settled.retry,
                }
            }
        }
    }
    if (current.status === "fulfilled") {
        return {
            isLoading: false,
            isReloading: false,
            isSettled: true,
            isFulfilled: true,
            isRejected: false,
            value: current.value,
        }
    }
    else {
        return {
            isLoading: false,
            isReloading: false,
            isSettled: true,
            isFulfilled: false,
            isRejected: true,
            reason: current.reason,
            retry: current.retry,
        }
    }
}
