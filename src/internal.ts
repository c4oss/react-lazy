import { useEffect, useRef, useState } from "react"

export function useIsFirstMount() {
    const isFirst = useRef(true)
    if (isFirst.current) {
        isFirst.current = false
        return true
    }
    return isFirst.current
}

export function usePrevious<T>(value: { readonly current: T } | undefined) {
    const previous = useRef(value?.current)
    const first = useIsFirstMount()
    if (!first) {
        if (value !== undefined) {
            previous.current = value.current
        }
    }
    return previous.current
}

/**
 * Returns true once `active` has stayed true for at least `delay` milliseconds.
 * Returns false whenever `active` is false, and restarts the timer each time `active` becomes true.
 */
export function useDelayedFlag(active: boolean, delay: number | undefined) {
    const enabled = delay !== undefined && delay > 0
    const [elapsed, setElapsed] = useState(false)
    useEffect(() => {
        if (!active || !enabled) {
            return
        }
        const timeout = setTimeout(() => setElapsed(true), delay)
        return () => {
            clearTimeout(timeout)
            setElapsed(false)
        }
    }, [
        active,
        enabled,
        delay,
    ])
    return active && (!enabled || elapsed)
}
