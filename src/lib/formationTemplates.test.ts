import { describe, expect, it } from 'vitest'
import {
  createSlotsForFormation,
  FORMATION_SLOT_COUNTS,
  getFormationSlotTemplates,
} from '@/lib/formationTemplates'
import {
  createEmptyLineup,
  normalizeLineup,
  resolveSlotPlayers,
} from '@/lib/lineup'
import type { Player } from '@/types'

describe('formationTemplates', () => {
  it('4-2-3-1 has 11 slots', () => {
    expect(FORMATION_SLOT_COUNTS['4-2-3-1']).toBe(11)
    expect(getFormationSlotTemplates('4-2-3-1')).toHaveLength(11)
  })

  it('4-3-3 has 11 slots', () => {
    expect(FORMATION_SLOT_COUNTS['4-3-3']).toBe(11)
    expect(getFormationSlotTemplates('4-3-3')).toHaveLength(11)
  })

  it('preserves assignments by key when switching formation', () => {
    const prev = createSlotsForFormation('4-2-3-1')
    prev[0] = { ...prev[0], roleId: 'role-tw' }
    prev[10] = { ...prev[10], playerId: 'p-st' }
    const next = createSlotsForFormation('4-3-3', prev)
    const tw = next.find((s) => s.key === 'tw')
    const st = next.find((s) => s.key === 'st')
    expect(tw?.roleId).toBe('role-tw')
    expect(st?.playerId).toBe('p-st')
  })

  it('custom formation templates resolve by id', () => {
    const custom = [
      {
        id: 'custom-1',
        name: 'Test',
        slots: [{ key: 'st', label: 'NEU-ST', x: 0.5, y: 0.9 }],
      },
    ]
    const slots = getFormationSlotTemplates('custom-1', custom)
    expect(slots[0].label).toBe('NEU-ST')
  })
})

describe('lineup', () => {
  it('normalizeLineup returns default for invalid input', () => {
    const l = normalizeLineup(null)
    expect(l.formationId).toBe('4-2-3-1')
    expect(l.slots).toHaveLength(11)
  })

  it('resolveSlotPlayers uses role priority order', () => {
    const slot = createEmptyLineup().slots[0]
    const squadPlan = {
      categories: [],
      roles: [{ id: 'r1', label: 'TW' }],
      assignments: { r1: ['p2', 'p1'] },
    }
    const map = new Map<string, Player>([
      [
        'p1',
        {
          id: 'p1',
          name: 'A',
          birthDate: '',
          position: 'GK',
          isDummy: false,
          contracts: [],
        },
      ],
      [
        'p2',
        {
          id: 'p2',
          name: 'B',
          birthDate: '',
          position: 'GK',
          isDummy: false,
          contracts: [],
        },
      ],
    ])
    const withRole = { ...slot, roleId: 'r1', playerId: null }
    const r = resolveSlotPlayers(withRole, squadPlan, map, true)
    expect(r.primary?.id).toBe('p2')
    expect(r.backups.map((p) => p.id)).toEqual(['p1'])
  })
})
