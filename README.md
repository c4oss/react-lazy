# React Lazy

`@ispb/react-lazy` provides React hooks and components for rendering values that arrive asynchronously. It supports promises, RxJS observables, and a shared loading/fulfilled/rejected event model.

## Installation

```sh
npm install @ispb/react-lazy
```

React 19 is a peer dependency. The observable helpers also use RxJS.

## Promises

Use `Asyncified` to load a value and render it when available. The promise factory receives an `AbortController`; pass its signal to work that supports cancellation.

```tsx
import { useCallback } from "react"
import { Asyncified } from "@ispb/react-lazy"

type User = { name: string }

export function UserView() {
    const loadUser = useCallback((controller: AbortController) => fetch("/api/user", { signal: controller.signal }).then(response => {
        if (!response.ok) {
            throw new Error("Could not load user")
        }
        return response.json() as Promise<User>
    }), [])

    return <Asyncified<User>
        promise={loadUser}
        children={(user, { retry, isReloading }) => <>
            <p>{user.name}{isReloading ? " (refreshing...)" : ""}</p>
            <button onClick={() => retry()}>Reload</button>
        </>}
        overrides={{
            onLoading: () => <p>Loading user...</p>,
            onError: ({ reason }) => <p role="alert">{String(reason)}</p>,
        }}
    />
}
```

The promise factory can also be supplied as `() => PromiseLike<T>` if it does not need cancellation. It should be stable between renders (for example, memoize it with `useCallback`); changing the factory starts a new request. An optional `defer: { initial }` renders an initial value immediately and starts loading after mount.

For more control, `useAsyncLazy` returns the event plus a `retry()` function:

```tsx
import { useCallback } from "react"
import { Lazy, useAsyncLazy } from "@ispb/react-lazy"

function UserPanel() {
    const loadUser = useCallback(() => fetch("/api/user").then(response => response.json() as Promise<User>), [])
    const event = useAsyncLazy(loadUser)

    return <Lazy event={event} overrides={{
        onLoading: () => <p>Loading...</p>,
        onError: ({ reason }) => <p role="alert">{String(reason)}</p>,
    }}>
        {(user, state) => <>
            <p>{user.name}</p>
            <button disabled={state.isLoading} onClick={() => event.retry()}>Retry</button>
        </>}
    </Lazy>
}
```

## RxJS Observables

`Observing` subscribes when mounted, renders each emitted value, routes errors through the lazy error handling, and unsubscribes when the observable changes or the component unmounts.

```tsx
import { Observing } from "@ispb/react-lazy"
import { interval, map } from "rxjs"

const values = interval(1000).pipe(map(count => `Value ${count}`))

export function ValueView() {
    return <Observing of={values}
        overrides={{ onLoading: () => <p>Waiting for first value...</p> }}>
        {value => <p>{value}</p>}
    </Observing>
}
```

Use `useObservableLazy({ of })` when you need the resulting `LazyEvent<T>` in your own component, or `observing(factory)` to wrap an existing component.

## Lazy Events and Rendering

A `LazyEvent<T>` is one of:

```ts
{ status: "loading" }
{ status: "fulfilled", value: T }
{ status: "rejected", reason: unknown }
```

Pass an event to `<Lazy>`. Its children can be a node or a render function receiving the value and a `LazyState<T>`. On an initial load, `Lazy` renders `null` unless `onLoading` is provided. If a previously settled event starts loading again, the previous content remains visible and is passed to `onReloading` with `reloading: true`. Rejected events are thrown unless `onError` is provided.

Lazy options can be set on an individual component using `overrides`, or for a subtree using `LazyContext.Provider`:

```tsx
import { LazyContext } from "@ispb/react-lazy"

<LazyContext.Provider value={{
    onLoading: () => <p>Loading...</p>,
    onError: ({ message }) => <p role="alert">{message ?? "Request failed"}</p>,
    defaultMessage: "Please wait",
}}>
    {children}
</LazyContext.Provider>
```

Available options are `onLoading`, `onReloading`, `onError`, `defaultMessage`, `loadingMessage`, `reloadingMessage`, and `errorMessage`. Per-component overrides take precedence over context options.

## Hooks

- `useAsyncLazy` adapts a promise to a lazy event and exposes `retry`.
- `useObservableLazy` adapts an RxJS observable to a lazy event; `useObservableLazyWrapped` handles an observable that emits lazy events.
- `useLazyState` derives loading, reloading, fulfilled, and rejected flags from an event.
- `useLazyMap` maps a fulfilled value; `useLazyChain` maps it to another lazy event; `useLazyFlatten` flattens nested lazy events.
- `useLazyCombine` combines a record of lazy events into one event.
- `useLazyAsPromise` and `useLazyAsObservable` adapt a lazy event to a promise or RxJS subject.
- `isLoading`, `isFulfilled`, and `isRejected` are type guards for lazy events.

The package also exports `Asyncified`, `asyncified`, `Observing`, `observing`, `Lazy`, and `lazified` for component-based and higher-order-component integrations.

## License

[MIT](https://choosealicense.com/licenses/mit/)