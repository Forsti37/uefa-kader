import type {
  CustomFormation,
  LineupSlotState,
  LineupState,
  Player,
  SquadPlanState,
  FormationSlotTemplate,
} from '@/types'
import {
  createSlotsForFormation,
  isBuiltinFormationId,
  type FormationId,
} from '@/lib/formationTemplates'

export type LineupNormalizeContext = {
  customFormations?: CustomFormation[]
}

export function createEmptyLineup(
  customFormations: CustomFormation[] = [],
): LineupState {
  return {
    formationId: '4-2-3-1',
    showBackups: false,
    slots: createSlotsForFormation('4-2-3-1', undefined, customFormations),
  }
}

function resolveFormationId(
  raw: unknown,
  customFormations: CustomFormation[],
): FormationId {
  if (typeof raw !== 'string' || !raw) return '4-2-3-1'
  if (isBuiltinFormationId(raw)) return raw
  if (customFormations.some((f) => f.id === raw)) return raw
  return '4-2-3-1'
}

function normalizeSlot(raw: unknown): LineupSlotState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<LineupSlotState>
  if (typeof s.key !== 'string' || typeof s.label !== 'string') return null
  const x = typeof s.x === 'number' ? s.x : 0.5
  const y = typeof s.y === 'number' ? s.y : 0.5
  return {
    key: s.key,
    label: s.label,
    x,
    y,
    roleId: typeof s.roleId === 'string' ? s.roleId : null,
    playerId: typeof s.playerId === 'string' ? s.playerId : null,
  }
}

export function normalizeLineup(
  raw: unknown,
  context: LineupNormalizeContext = {},
): LineupState {
  const customFormations = context.customFormations ?? []
  if (!raw || typeof raw !== 'object') {
    return createEmptyLineup(customFormations)
  }
  const obj = raw as Partial<LineupState>
  const formationId = resolveFormationId(obj.formationId, customFormations)
  const showBackups = Boolean(obj.showBackups)
  const parsedSlots = Array.isArray(obj.slots)
    ? obj.slots
        .map(normalizeSlot)
        .filter((s): s is LineupSlotState => Boolean(s))
    : []

  const slots =
    parsedSlots.length > 0
      ? createSlotsForFormation(formationId, parsedSlots, customFormations)
      : createSlotsForFormation(formationId, undefined, customFormations)

  return { formationId, showBackups, slots }
}

export function stripPlayerFromLineup(
  lineup: LineupState,
  playerId: string,
): LineupState {
  return {
    ...lineup,
    slots: lineup.slots.map((s) =>
      s.playerId === playerId ? { ...s, playerId: null } : s,
    ),
  }
}

export function stripRoleFromLineup(
  lineup: LineupState,
  roleId: string,
): LineupState {
  return {
    ...lineup,
    slots: lineup.slots.map((s) =>
      s.roleId === roleId ? { ...s, roleId: null } : s,
    ),
  }
}

export function clearLineupAssignments(lineup: LineupState): LineupState {
  return {
    ...lineup,
    slots: lineup.slots.map((s) => ({
      ...s,
      roleId: null,
      playerId: null,
    })),
  }
}

export function lineupHasAssignments(lineup: LineupState): boolean {
  return lineup.slots.some((s) => s.roleId || s.playerId)
}

export type ResolvedSlotPlayers = {
  primary: Player | null
  backups: Player[]
}

export function resolveSlotPlayers(
  slot: LineupSlotState,
  squadPlan: SquadPlanState,
  playersById: Map<string, Player>,
  showBackups: boolean,
): ResolvedSlotPlayers {
  if (slot.roleId) {
    const ids = squadPlan.assignments[slot.roleId] ?? []
    const resolved = ids
      .map((id) => playersById.get(id))
      .filter((p): p is Player => Boolean(p))
    return {
      primary: resolved[0] ?? null,
      backups: showBackups ? resolved.slice(1) : [],
    }
  }
  if (slot.playerId) {
    const p = playersById.get(slot.playerId)
    return { primary: p ?? null, backups: [] }
  }
  return { primary: null, backups: [] }
}

export function normalizeCustomFormations(raw: unknown): CustomFormation[] {
  if (!Array.isArray(raw)) return []
  const out: CustomFormation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Partial<CustomFormation>
    if (typeof o.id !== 'string' || typeof o.name !== 'string') continue
    if (!Array.isArray(o.slots)) continue
    const slots: CustomFormation['slots'] = []
    for (const s of o.slots) {
      if (!s || typeof s !== 'object') continue
      const slot = s as Partial<FormationSlotTemplate>
      if (typeof slot.key !== 'string' || typeof slot.label !== 'string') {
        continue
      }
      slots.push({
        key: slot.key,
        label: slot.label,
        x: typeof slot.x === 'number' ? slot.x : 0.5,
        y: typeof slot.y === 'number' ? slot.y : 0.5,
      })
    }
    if (slots.length === 0) continue
    out.push({ id: o.id, name: o.name.trim() || 'Eigene Formation', slots })
  }
  return out
}
