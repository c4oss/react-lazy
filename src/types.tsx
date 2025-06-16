import { ReactNode } from "react"

export type LazyLoading = { readonly status: "loading" }
export type LazyFulfilled<D> = { readonly status: "fulfilled", readonly value: D }
export type LazyRejected = { readonly status: "rejected", readonly reason: unknown, readonly retry?: (() => void) | undefined }
export type LazySettled<D> = LazyFulfilled<D> | LazyRejected
export type LazyEvent<D> = LazySettled<D> | LazyLoading

export type OnLoading = (props: LoadingProps) => ReactNode
export type OnReloading = (props: ReloadingProps) => ReactNode
export type OnError = (props: ErrorProps) => ReactNode

type LazyMeta = string

export interface LoadingProps {

    /**
     * The message to display.
     */
    readonly message?: LazyMeta | undefined

}

export interface ReloadingProps {

    /**
     * Whether or not the data is currently reloading.
     */
    readonly reloading: boolean

    /**
     * The message to display.
     */
    readonly message?: LazyMeta | undefined

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

    /**
     * The message to display.
     */
    readonly message?: LazyMeta | undefined

}

export interface LazyOptions {

    readonly onLoading?: OnLoading | undefined
    readonly onReloading?: OnReloading | undefined
    readonly onError?: OnError | undefined

    readonly defaultMessage?: LazyMeta | undefined
    readonly loadingMessage?: LazyMeta | undefined
    readonly reloadingMessage?: LazyMeta | undefined
    readonly errorMessage?: LazyMeta | undefined

}

/**
 * Overrides for lazy options.
 */
export type LazyOverrides = Partial<LazyOptions>

export type ExtractLazy<T> = T extends LazyFulfilled<infer D> ? D : never
