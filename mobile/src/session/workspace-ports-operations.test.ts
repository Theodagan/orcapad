import { describe, expect, it } from 'vitest'
import { workspacePortsScanRead } from './workspace-ports-operations'

const accepted = (result: unknown) =>
  workspacePortsScanRead.interpret({ id: 'r', ok: true, result, _meta: { runtimeId: 'h' } })

describe('workspace ports scan', () => {
  it('reads the ports a host reports, down to what the wheel offers', () => {
    const verdict = accepted({
      platform: 'darwin',
      scannedAt: 1,
      ports: [
        {
          id: 'a',
          kind: 'workspace',
          bindHost: '0.0.0.0',
          connectHost: 'localhost',
          port: 5173,
          processName: 'vite',
          protocol: 'http',
          advertisedUrl: 'http://localhost:5173',
          owner: {
            worktreeId: 'wt-1',
            repoId: 'r',
            displayName: 'w',
            path: '/w',
            confidence: 'cwd'
          }
        }
      ]
    })

    expect(verdict).toMatchObject({
      accepted: true,
      value: [
        {
          port: 5173,
          connectHost: 'localhost',
          protocol: 'http',
          processName: 'vite',
          advertisedUrl: 'http://localhost:5173',
          worktreeId: 'wt-1'
        }
      ]
    })
  })

  it('attributes nothing to a port that is not a workspace’s', () => {
    const verdict = accepted({
      ports: [{ kind: 'external', connectHost: 'localhost', port: 22, protocol: 'unknown' }]
    })

    expect(verdict).toMatchObject({ accepted: true, value: [{ port: 22, worktreeId: null }] })
  })

  it('drops an entry it cannot read rather than failing the whole scan', () => {
    const verdict = accepted({
      ports: [{ port: 'x' }, null, { port: 80, connectHost: 'localhost', protocol: 'http' }]
    })

    expect(verdict).toMatchObject({ accepted: true, value: [{ port: 80 }] })
  })

  it('reads a reply with no ports as none', () => {
    expect(accepted({})).toMatchObject({ accepted: true, value: [] })
    expect(accepted(null)).toMatchObject({ accepted: true, value: [] })
  })

  it('skips a reply the host refused, so the wheel falls back to typing an address', () => {
    const refused = workspacePortsScanRead.interpret({
      id: 'r',
      ok: false,
      error: { code: 'unavailable', message: 'no' },
      _meta: { runtimeId: 'h' }
    })

    expect(refused.accepted).toBe(false)
  })
})
