/** Terminal and process output. Opaque bytes plus framing; the core never parses them. */
export type ActivityFrame =
  | { readonly kind: 'snapshot'; readonly bytes: Uint8Array }
  | { readonly kind: 'output'; readonly bytes: Uint8Array }
  | { readonly kind: 'resized'; readonly cols: number; readonly rows: number }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'write-unavailable'; readonly reason: string }
