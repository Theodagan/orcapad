import { beforeEach, describe, expect, it, vi } from 'vitest'

const platform = { OS: 'android' }
const findNodeHandle = vi.fn<(node: unknown) => number | null>()
const requestNativeFocus = vi.fn<(tag: number) => Promise<boolean>>()
const nativeModule: { current: Record<string, unknown> | null } = { current: null }

vi.mock('react-native', () => ({
  AppState: { currentState: 'active' },
  Platform: platform,
  findNodeHandle: (node: unknown) => findNodeHandle(node)
}))
vi.mock('../../../modules/orca-gamepad', () => ({
  get orcaGamepad() {
    return nativeModule.current
  }
}))

const { createControllerRuntime } = await import('./controller-runtime')

// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: a stand-in host node; the mocked findNodeHandle only reads its identity.
const view = { name: 'a pressable' } as never

function nativeWith(extra: Record<string, unknown>) {
  return {
    listControllers: () => [],
    addListener: () => ({ remove: () => {} }),
    currentSample: () => ({}),
    start: () => true,
    stop: () => true,
    setInputCaptured: () => true,
    ...extra
  }
}

describe('the controller runtime’s native focus request', () => {
  beforeEach(() => {
    platform.OS = 'android'
    findNodeHandle.mockReset().mockReturnValue(41)
    requestNativeFocus.mockReset().mockResolvedValue(true)
    nativeModule.current = nativeWith({ requestNativeFocus })
  })

  it('asks the native layer to focus the view behind the node', () => {
    createControllerRuntime().requestNativeFocus(view)

    expect(requestNativeFocus).toHaveBeenCalledExactlyOnceWith(41)
  })

  it('leaves focus alone off Android, without a node, or for a node with no tag yet', () => {
    const runtime = createControllerRuntime()
    platform.OS = 'ios'
    runtime.requestNativeFocus(view)
    platform.OS = 'android'
    runtime.requestNativeFocus(null)
    findNodeHandle.mockReturnValue(null)
    runtime.requestNativeFocus(view)

    expect(requestNativeFocus).not.toHaveBeenCalled()
  })

  it('tolerates a build older than the call', () => {
    nativeModule.current = nativeWith({})

    expect(() => createControllerRuntime().requestNativeFocus(view)).not.toThrow()
    expect(requestNativeFocus).not.toHaveBeenCalled()
  })

  it('is inert without the native module at all', () => {
    nativeModule.current = null

    expect(() => createControllerRuntime().requestNativeFocus(view)).not.toThrow()
  })

  it('swallows a refusal, because a view that cannot take focus is not an error', async () => {
    requestNativeFocus.mockRejectedValue(new Error('view gone'))

    expect(() => createControllerRuntime().requestNativeFocus(view)).not.toThrow()
    await Promise.resolve()
  })
})
