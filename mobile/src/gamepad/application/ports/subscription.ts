/**
 * A port's push side. The caller holds the returned handle and is the only party that ends
 * the stream; a port never unsubscribes a listener on its own, because a dropped connection
 * is a value the listener still needs to see.
 */

export type Unsubscribe = () => void

export type Subscription<T> = (listener: (value: T) => void) => Unsubscribe
