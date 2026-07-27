import type {
  CustomFormation,
  FormationSlotTemplate,
  LineupSlotState,
} from '@/types'

export const BUILTIN_FORMATION_IDS = ['4-2-3-1', '4-3-3'] as const
export type BuiltinFormationId = (typeof BUILTIN_FORMATION_IDS)[number]

/** Aktive Formation: System-Vorlage oder gespeicherte eigene Formation (UUID). */
export type FormationId = BuiltinFormationId | string

const SLOTS_4231: FormationSlotTemplate[] = [
  { key: 'tw', label: 'TW', x: 0.5, y: 0.1 },
  { key: 'lv', label: 'LV', x: 0.14, y: 0.26 },
  { key: 'iv-l', label: 'IV', x: 0.38, y: 0.24 },
  { key: 'iv-r', label: 'IV', x: 0.62, y: 0.24 },
  { key: 'rv', label: 'RV', x: 0.86, y: 0.26 },
  { key: 'dm-l', label: 'ZM', x: 0.26, y: 0.48 },
  { key: 'dm-r', label: 'DM', x: 0.74, y: 0.48 },
  { key: 'om', label: 'OM', x: 0.5, y: 0.58 },
  { key: 'lf', label: 'LF', x: 0.16, y: 0.72 },
  { key: 'rf', label: 'RF', x: 0.84, y: 0.72 },
  { key: 'st', label: 'ST', x: 0.5, y: 0.84 },
]

const SLOTS_433: FormationSlotTemplate[] = [
  { key: 'tw', label: 'TW', x: 0.5, y: 0.1 },
  { key: 'lv', label: 'LV', x: 0.14, y: 0.26 },
  { key: 'iv-l', label: 'IV', x: 0.38, y: 0.24 },
  { key: 'iv-r', label: 'IV', x: 0.62, y: 0.24 },
  { key: 'rv', label: 'RV', x: 0.86, y: 0.26 },
  { key: 'dm', label: 'DM', x: 0.5, y: 0.44 },
  { key: 'zm', label: 'ZM', x: 0.28, y: 0.54 },
  { key: 'om', label: 'OM', x: 0.72, y: 0.54 },
  { key: 'lf', label: 'LF', x: 0.2, y: 0.74 },
  { key: 'st', label: 'ST', x: 0.5, y: 0.84 },
  { key: 'rf', label: 'RF', x: 0.8, y: 0.74 },
]

const BUILTIN_SLOTS: Record<BuiltinFormationId, FormationSlotTemplate[]> = {
  '4-2-3-1': SLOTS_4231,
  '4-3-3': SLOTS_433,
}

export const FORMATION_LABELS: Record<BuiltinFormationId, string> = {
  '4-2-3-1': '4-2-3-1',
  '4-3-3': '4-3-3',
}

export function isBuiltinFormationId(id: string): id is BuiltinFormationId {
  return (BUILTIN_FORMATION_IDS as readonly string[]).includes(id)
}

export function getBuiltinSlotTemplates(
  formationId: BuiltinFormationId,
): FormationSlotTemplate[] {
  return BUILTIN_SLOTS[formationId].map((s) => ({ ...s }))
}

export function getFormationSlotTemplates(
  formationId: FormationId,
  customFormations: CustomFormation[] = [],
): FormationSlotTemplate[] {
  if (isBuiltinFormationId(formationId)) {
    return getBuiltinSlotTemplates(formationId)
  }
  const custom = customFormations.find((f) => f.id === formationId)
  if (custom) return custom.slots.map((s) => ({ ...s }))
  return getBuiltinSlotTemplates('4-2-3-1')
}

export function getFormationDisplayName(
  formationId: FormationId,
  customFormations: CustomFormation[] = [],
): string {
  if (isBuiltinFormationId(formationId)) {
    return FORMATION_LABELS[formationId]
  }
  return customFormations.find((f) => f.id === formationId)?.name ?? formationId
}

export type FormationListEntry = {
  id: FormationId
  name: string
  builtin: boolean
}

export function listFormations(
  customFormations: CustomFormation[],
): FormationListEntry[] {
  const builtins: FormationListEntry[] = BUILTIN_FORMATION_IDS.map((id) => ({
    id,
    name: FORMATION_LABELS[id],
    builtin: true,
  }))
  const customs: FormationListEntry[] = customFormations.map((f) => ({
    id: f.id,
    name: f.name,
    builtin: false,
  }))
  return [...builtins, ...customs]
}

export function createSlotsForFormation(
  formationId: FormationId,
  previous?: LineupSlotState[],
  customFormations: CustomFormation[] = [],
): LineupSlotState[] {
  const templates = getFormationSlotTemplates(formationId, customFormations)
  const prevByKey = new Map(
    (previous ?? []).map((s) => [s.key, s] as const),
  )
  return templates.map((t) => {
    const prev = prevByKey.get(t.key)
    return {
      key: t.key,
      label: t.label,
      x: t.x,
      y: t.y,
      roleId: prev?.roleId ?? null,
      playerId: prev?.roleId ? null : (prev?.playerId ?? null),
    }
  })
}

export function syncLineupSlotsFromFormation(
  formationId: FormationId,
  slots: LineupSlotState[],
  customFormations: CustomFormation[],
): LineupSlotState[] {
  return createSlotsForFormation(formationId, slots, customFormations)
}

export const FORMATION_SLOT_COUNTS: Record<BuiltinFormationId, number> = {
  '4-2-3-1': SLOTS_4231.length,
  '4-3-3': SLOTS_433.length,
}

export function cloneSlotTemplates(
  formationId: FormationId,
  customFormations: CustomFormation[] = [],
): FormationSlotTemplate[] {
  return getFormationSlotTemplates(formationId, customFormations)
}
