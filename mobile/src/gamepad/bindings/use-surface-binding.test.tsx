import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { focusTargetFor } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/**
 * The controller layer is additive. A bound surface mounted without the shell above it — which is
 * every one of that surface's own tests, and any future embedding — must still render and still
 * work by touch (BIND-AC10). This is the guard: binding the explorer once made seven existing
 * file tests throw before the provider learned to be absent.
 */
describe('a surface binding with no controller above it', () => {
  it('mounts, registers nothing, and does not throw', () => {
    const run = vi.fn()

    function Surface(): ReactNode {
      useSurfaceBinding({
        focusTarget: focusTargetFor('lonely', [['confirm', vi.fn()]]),
        wheelActions: [{ id: 'lonely.act', label: 'Act', availability: 'available', run }]
      })
      return null
    }

    expect(() => {
      act(() => {
        create(createElement(Surface))
      })
    }).not.toThrow()
    expect(run).not.toHaveBeenCalled()
  })
})
