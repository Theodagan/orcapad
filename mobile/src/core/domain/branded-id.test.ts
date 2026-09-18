import { describe, expect, it } from 'vitest'
import { agentId } from './agent'
import { connectionId } from './connection'
import { messageId } from './message'
import { projectId } from './project'
import { sessionId } from './session'
import { taskId } from './task'
import { workspaceId } from './workspace'

describe('branded id constructors', () => {
  it('returns the input unchanged, so ids stay usable as map keys and wire values', () => {
    expect(connectionId('c-1')).toBe('c-1')
    expect(projectId('p-1')).toBe('p-1')
    expect(workspaceId('w-1')).toBe('w-1')
    expect(sessionId('s-1')).toBe('s-1')
    expect(agentId('a-1')).toBe('a-1')
    expect(messageId('m-1')).toBe('m-1')
    expect(taskId('t-1')).toBe('t-1')
  })

  it('does not normalise, so a host-shaped id round-trips exactly', () => {
    expect(workspaceId('C:\\repos\\orca')).toBe('C:\\repos\\orca')
    expect(sessionId(' leading-and-trailing ')).toBe(' leading-and-trailing ')
  })
})
