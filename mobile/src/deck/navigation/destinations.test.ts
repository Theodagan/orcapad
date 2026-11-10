import { describe, expect, it } from 'vitest'
import {
  DECK_DESTINATIONS,
  DECK_LANDING_DESTINATION,
  destinationById,
  destinationForPath
} from './destinations'

describe('deck destinations', () => {
  it('lists the six destinations in order with unique ids and routes', () => {
    expect(DECK_DESTINATIONS.map((destination) => destination.id)).toEqual([
      'overview',
      'sessions',
      'projects',
      'approvals',
      'ports',
      'settings'
    ])
    expect(new Set(DECK_DESTINATIONS.map((destination) => destination.route)).size).toBe(6)
  })

  it('lands on Overview', () => {
    expect(destinationById(DECK_LANDING_DESTINATION).route).toBe('/deck/overview')
  })

  it('labels every destination', () => {
    for (const destination of DECK_DESTINATIONS) {
      expect(destination.labelKey).toMatch(/^deck\.destination\./)
    }
  })

  it('maps a path to its destination, and nothing else', () => {
    expect(destinationForPath('/deck/sessions')?.id).toBe('sessions')
    expect(destinationForPath('/deck/projects/worktree-1')?.id).toBe('projects')
    expect(destinationForPath('/deck')).toBeNull()
  })
})
