import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerFocusRing } from './ControllerFocusRing'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFillObject: { position: 'absolute' } },
  View: 'View'
}))

function render(radius?: number): ReactTestInstance {
  const mounted: { renderer: ReactTestRenderer | null } = { renderer: null }
  act(() => {
    mounted.renderer = create(
      createElement(ControllerFocusRing, radius === undefined ? {} : { radius })
    )
  })
  if (mounted.renderer === null) {
    throw new Error('renderer did not mount')
  }
  return mounted.renderer.root
}

describe('the controller focus ring', () => {
  it('is an overlay that takes no touch and says nothing to a screen reader', () => {
    const ring = render().findByProps({ testID: 'controller-focus-ring' })

    expect(ring.props.pointerEvents).toBe('none')
    expect(ring.props.accessibilityElementsHidden).toBe(true)
    expect(ring.props.importantForAccessibility).toBe('no-hide-descendants')
  })

  it('takes its corners from the element it marks, and rounds the inner line to match', () => {
    const root = render(14)
    const ring = root.findByProps({ testID: 'controller-focus-ring' })
    const inner = ring.children[0]
    if (typeof inner === 'string') {
      throw new Error('expected an inner line')
    }

    expect(ring.props.style).toContainEqual({ borderRadius: 14 })
    expect(inner.props.style).toContainEqual({ borderRadius: 12 })
  })

  it('never draws the inner line with a negative radius on a square element', () => {
    const ring = render(0).findByProps({ testID: 'controller-focus-ring' })
    const inner = ring.children[0]
    if (typeof inner === 'string') {
      throw new Error('expected an inner line')
    }

    expect(inner.props.style).toContainEqual({ borderRadius: 0 })
  })
})
