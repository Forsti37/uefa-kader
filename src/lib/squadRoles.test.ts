import { describe, expect, it } from 'vitest'
import kaderSeed from '@/data/kader-seed.json'
import {
  createFullSquadTemplate,
  findPlayerByNameFragment,
  SQUAD_ROLE_TEMPLATE_ASSIGNMENTS,
  SQUAD_ROLE_TEMPLATE_COUNT,
} from '@/lib/squadRoles'
import type { Player } from '@/types'

const players = kaderSeed.players as Player[]

describe('squadRoles template', () => {
  it('has 11 roles including LIV and RIV', () => {
    const plan = createFullSquadTemplate(players)
    expect(SQUAD_ROLE_TEMPLATE_COUNT).toBe(11)
    expect(plan.roles.map((r) => r.label)).toEqual([
      'TW',
      'LV',
      'LIV',
      'RIV',
      'RV',
      'DM',
      'ZM',
      'OM',
      'LF',
      'RF',
      'ST',
    ])
  })

  it('assigns template players in priority order', () => {
    const plan = createFullSquadTemplate(players)
    for (const [label, fragments] of Object.entries(
      SQUAD_ROLE_TEMPLATE_ASSIGNMENTS,
    )) {
      const role = plan.roles.find((r) => r.label === label)
      expect(role).toBeTruthy()
      const ids = plan.assignments[role!.id] ?? []
      expect(ids.length).toBe(fragments.length)
      fragments.forEach((frag, i) => {
        const expected = findPlayerByNameFragment(players, frag)
        expect(expected, frag).toBeTruthy()
        expect(ids[i]).toBe(expected!.id)
      })
    }
  })
})
