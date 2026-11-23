import { ReactNode } from "react"
import { Retry } from "./async.js"

export type LazyLoading = { readonly status: "loading" }
export type LazyFulfilled<D> = { readonly status: "fulfilled", readonly value: D }
export type LazyRejected = { readonly status: "rejected", readonly reason: unknown, readonly retry?: Retry | undefined }
export type LazySettled<D> = LazyFulfilled<D> | LazyRejected
export type LazyEvent<D> = LazySettled<D> | LazyLoading

export type OnLoading = (props: LoadingProps) => ReactNode
export type OnReloading = (props: ReloadingProps) => ReactNode
export type OnError = (props: ErrorProps) => ReactNode

export interface LoadingProps {

    /**
     * The message to display.
     */
    readonly message?: string | undefined

}

export interface ReloadingProps {

    /**
     * Whether or not the data is currently reloading.
     */
    readonly reloading: boolean

    /**
     * The message to display.
     */
    readonly message?: string | undefined

    /**
     * The children.
     */
    readonly children: ReactNode

}

export interface ErrorProps {

    /**
     * The error.
     */
    readonly reason: unknown

}

export interface LazyOptions {

    readonly onLoading?: OnLoading | undefined
    /**
     * Wraps the content while it reloads. `"loading"` shows reloading the same as loading instead: `onLoading`, in
     * place of the content.
     */
    readonly onReloading?: OnReloading | "loading" | undefined
    readonly onError?: OnError | undefined
    readonly loadingMessage?: string | undefined
    readonly reloadingMessage?: string | undefined
    /**
     * How long (in milliseconds) a reload must last before it's shown: until then, the previous content is shown as
     * settled. An initial load always shows at once, as there's nothing to show in its place.
     */
    readonly reloadingDelay?: number | undefined

}

/**
 * Overrides for lazy options.
 */
export type LazyOverrides = Partial<LazyOptions>

export type ExtractLazy<T> = T extends LazyFulfilled<infer D> ? D : never
