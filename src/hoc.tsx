
import { ComponentType, createElement } from "react"
import { callOrGet, ValueOrFactory } from "value-or-factory"
import { Lazy } from "./components.js"
import { LazyState } from "./state.js"
import { LazyEvent, LazyOverrides } from "./types.js"

export interface LazyBuilder<D, P> extends LazyHOCOptions<LazyState<D>, P> {

    readonly event: LazyEvent<D>

}

export function lazified<I extends {}, D extends {}, P extends {}>(build: (props: I) => LazyBuilder<D, P>) {
    return (component: ComponentType<D & P>) => {
        return (props: I) => {
            const built = build(props)
            return <Lazy event={built.event}
                overrides={built.overrides}
                children={(value, state) => createElement(component, { ...callOrGet(built.passthrough, state), ...value })} />
        }
    }
}

export interface LazyHOCOptions<S, P> {

    /**
     * Properties to pass through to the component.
     */
    readonly passthrough: ValueOrFactory<P, [S]>

    /**
     * Overrides for lazy settings.
     */
    readonly overrides?: LazyOverrides | undefined

}
