import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ContractPeriod,
  CustomFormation,
  DraftState,
  FormationSlotTemplate,
  LineupState,
  Player,
  Position,
  SquadPlanState,
  SquadRole,
} from '@/types'
import kaderSeed from '@/data/kader-seed.json'
import { createEmptySquadPlan, createFullSquadTemplate, foldPlayerName, normalizeSquadPlan } from '@/lib/squadRoles'
import {
  cloneSlotTemplates,
  createSlotsForFormation,
  FORMATION_LABELS,
  isBuiltinFormationId,
  type FormationId,
} from '@/lib/formationTemplates'
import {
  createEmptyLineup,
  normalizeCustomFormations,
  normalizeLineup,
  stripPlayerFromLineup,
  stripRoleFromLineup,
  clearLineupAssignments,
} from '@/lib/lineup'
import { TEMPLATE_CONTENT_VERSION } from '@/lib/templateContentVersion'

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5
  return Math.min(0.94, Math.max(0.06, v))
}

/** Slots der aktuellen Aufstellung als Custom-Formation-Vorlage. */
function slotsAsTemplates(
  slots: LineupState['slots'],
): FormationSlotTemplate[] {
  return slots.map((s) => ({
    key: s.key,
    label: s.label,
    x: s.x,
    y: s.y,
  }))
}

/**
 * Stellt sicher, dass die aktive Formation eine eigene (editierbare) ist.
 * Bei System-Formation: Kopie anlegen und aktivieren.
 */
function withEditableFormation(state: PersistedState): {
  formationId: string
  customFormations: CustomFormation[]
  lineup: LineupState
} {
  const currentId = state.lineup.formationId
  if (state.customFormations.some((f) => f.id === currentId)) {
    return {
      formationId: currentId,
      customFormations: state.customFormations,
      lineup: state.lineup,
    }
  }
  const id = uid()
  const baseName = isBuiltinFormationId(currentId)
    ? FORMATION_LABELS[currentId]
    : currentId
  const custom: CustomFormation = {
    id,
    name: `${baseName} (eigen)`,
    slots: slotsAsTemplates(state.lineup.slots),
  }
  return {
    formationId: id,
    customFormations: [...state.customFormations, custom],
    lineup: {
      ...state.lineup,
      formationId: id,
    },
  }
}

/** Kleiner ID-Generator (crypto.randomUUID mit Fallback). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Erzeugt eine leere Vertragsphase (fuer das Formular). */
export function emptyContract(): ContractPeriod {
  return {
    id: uid(),
    startDate: '',
    endDate: '',
    clubId: '',
    clubName: '',
    clubCategory: 'FC_SALZBURG',
    isLoan: false,
  }
}

// ---------------------------------------------------------------------------
// Template: mitgelieferter FC-Salzburg-Beispielkader (nur lokal ladbar)
// ---------------------------------------------------------------------------

const TEMPLATE_PLAYERS: Player[] = kaderSeed.players as Player[]

/** Spieler, die im Kernkader-Template (ohne Liefering) fehlen sollen. */
const SALZBURG_CORE_EXCLUDED_NAME_FRAGMENTS = [
  'Winklhofer',
  'Pokorny',
  'Traoré',
  'Aleksic',
  'Palacios',
  'Matjašec',
  'Murillo',
  'Adejenughure',
  'Sulbarán',
] as const

function isExcludedFromSalzburgCore(player: Player): boolean {
  const name = foldPlayerName(player.name)
  return SALZBURG_CORE_EXCLUDED_NAME_FRAGMENTS.some((frag) =>
    name.includes(foldPlayerName(frag)),
  )
}

const TEMPLATE_PLAYERS_CORE: Player[] = TEMPLATE_PLAYERS.filter(
  (p) => !isExcludedFromSalzburgCore(p),
)

export const TEMPLATE_PLAYER_COUNT = TEMPLATE_PLAYERS.filter(
  (p) => !p.isDummy,
).length

export const TEMPLATE_PLAYER_COUNT_CORE = TEMPLATE_PLAYERS_CORE.filter(
  (p) => !p.isDummy,
).length

const EMPTY_DRAFT: DraftState = { listA: [], listB: [] }

/** Nicht auf A-/B-Liste vorbelegen (bleiben im Kader, aber unzugeordnet). */
const UEFA_DRAFT_UNASSIGNED_NAME_FRAGMENTS = [
  'Chase',
  'Blank',
  'Moser',
  'Omoregie',
] as const

function isUnassignedInUefaDraft(player: Player): boolean {
  const name = foldPlayerName(player.name)
  return UEFA_DRAFT_UNASSIGNED_NAME_FRAGMENTS.some((frag) =>
    name.includes(foldPlayerName(frag)),
  )
}

/** UEFA-Vorbelegung: alle auf A, Aguilar auf B; gelistete Spieler bleiben frei. */
function createTemplateDraft(players: Player[]): DraftState {
  const listA: string[] = []
  const listB: string[] = []
  const aguilar = foldPlayerName('Aguilar')
  for (const p of players) {
    if (p.isDummy) continue
    if (isUnassignedInUefaDraft(p)) continue
    if (foldPlayerName(p.name).includes(aguilar)) listB.push(p.id)
    else listA.push(p.id)
  }
  return { listA, listB }
}

function stripPlayerFromAssignments(
  assignments: Record<string, string[]>,
  playerId: string,
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [roleId, ids] of Object.entries(assignments)) {
    const filtered = ids.filter((id) => id !== playerId)
    if (filtered.length > 0) next[roleId] = filtered
  }
  return next
}

function stripPlayersFromAssignments(
  assignments: Record<string, string[]>,
  playerIds: Set<string>,
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [roleId, ids] of Object.entries(assignments)) {
    const filtered = ids.filter((id) => !playerIds.has(id))
    if (filtered.length > 0) next[roleId] = filtered
  }
  return next
}

/**
 * Persist-Version.
 * v7: Aufstellung (lineup).
 * v11: Mittelfeld-Slots weiter nach vorne (Builtin-Koordinaten).
 * v12: seenTemplateContentVersion (Hinweis bei Template-Updates).
 */
const STORAGE_VERSION = 12

// ---------------------------------------------------------------------------

export interface PersistedState {
  players: Player[]
  draft: DraftState
  squadPlan: SquadPlanState
  lineup: LineupState
  customFormations: CustomFormation[]
  /** Zuletzt bestätigte Template-Inhaltsversion (Hinweis-Banner). */
  seenTemplateContentVersion: number
}

interface KaderStore extends PersistedState {
  _hasHydrated: boolean
  setHasHydrated: (value: boolean) => void

  addPlayer: (player: Player) => void
  updatePlayer: (player: Player) => void
  removePlayer: (id: string) => void

  addDummyPlayer: (data: {
    name: string
    birthDate: string
    position: Position
    contracts?: ContractPeriod[]
  }) => string
  clearDummies: () => void

  assignToList: (playerId: string, list: 'A' | 'B' | null) => void
  resetDraft: () => void

  loadSalzburgTemplate: () => void
  /** Salzburg-Kernkader ohne Liefering-/gelistete Spieler. */
  loadSalzburgCoreTemplate: () => void
  clearKader: () => void

  loadSquadRoleTemplate: () => void
  addSquadCategory: (label?: string) => void
  updateSquadCategory: (categoryId: string, label: string) => void
  removeSquadCategory: (categoryId: string) => void
  moveSquadCategory: (categoryId: string, direction: 'up' | 'down') => void
  addSquadRole: (label?: string, categoryId?: string | null) => void
  updateSquadRole: (roleId: string, label: string) => void
  setSquadRoleCategory: (roleId: string, categoryId: string | null) => void
  removeSquadRole: (roleId: string) => void
  moveSquadRole: (roleId: string, direction: 'up' | 'down') => void
  addPlayerToRole: (roleId: string, playerId: string) => void
  removePlayerFromRole: (roleId: string, playerId: string) => void
  reorderPlayersInRole: (
    roleId: string,
    fromIndex: number,
    toIndex: number,
  ) => void
  resetSquadAssignments: () => void

  exportSquadPlanJSON: () => string
  importSquadPlanJSON: (json: string) => { ok: boolean; error?: string }

  exportJSON: () => string
  importJSON: (json: string) => { ok: boolean; error?: string }

  setFormation: (formationId: FormationId) => void
  setLineupShowBackups: (show: boolean) => void
  assignLineupPlayer: (slotKey: string, playerId: string | null) => void
  assignLineupRole: (slotKey: string, roleId: string | null) => void
  clearLineupSlot: (slotKey: string) => void
  clearLineupAll: () => void

  dismissTemplateContentUpdate: () => void

  createCustomFormation: (name: string, basedOnFormationId: FormationId) => string
  updateCustomFormation: (
    id: string,
    patch: { name?: string; slots?: FormationSlotTemplate[] },
  ) => void
  deleteCustomFormation: (id: string) => void
  /**
   * Slot auf dem Feld verschieben. Bei System-Formation wird automatisch eine
   * eigene Kopie angelegt und aktiviert.
   */
  moveCustomFormationSlot: (slotKey: string, x: number, y: number) => void
  /**
   * Slot-Anzeigename ändern. Bei System-Formation ebenfalls Auto-Kopie.
   */
  renameCustomFormationSlot: (slotKey: string, label: string) => void
}

export const useKaderStore = create<KaderStore>()(
  persist(
    (set, get) => ({
      players: [],
      draft: EMPTY_DRAFT,
      squadPlan: createEmptySquadPlan(),
      lineup: createEmptyLineup(),
      customFormations: [],
      seenTemplateContentVersion: 0,
      _hasHydrated: false,

      setHasHydrated: (value) => set({ _hasHydrated: value }),

      addPlayer: (player) =>
        set((state) => ({ players: [...state.players, player] })),

      updatePlayer: (player) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === player.id ? player : p)),
        })),

      removePlayer: (id) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
          draft: {
            listA: state.draft.listA.filter((pid) => pid !== id),
            listB: state.draft.listB.filter((pid) => pid !== id),
          },
          squadPlan: {
            ...state.squadPlan,
            assignments: stripPlayerFromAssignments(
              state.squadPlan.assignments,
              id,
            ),
          },
          lineup: stripPlayerFromLineup(state.lineup, id),
        })),

      addDummyPlayer: ({ name, birthDate, position, contracts }) => {
        const id = uid()
        const dummy: Player = {
          id,
          name,
          birthDate,
          position,
          isDummy: true,
          contracts: contracts ?? [],
        }
        set((state) => ({ players: [...state.players, dummy] }))
        return id
      },

      clearDummies: () =>
        set((state) => {
          const dummyIds = new Set(
            state.players.filter((p) => p.isDummy).map((p) => p.id),
          )
          return {
            players: state.players.filter((p) => !p.isDummy),
            draft: {
              listA: state.draft.listA.filter((id) => !dummyIds.has(id)),
              listB: state.draft.listB.filter((id) => !dummyIds.has(id)),
            },
            squadPlan: {
              ...state.squadPlan,
              assignments: stripPlayersFromAssignments(
                state.squadPlan.assignments,
                dummyIds,
              ),
            },
            lineup: {
              ...state.lineup,
              slots: state.lineup.slots.map((s) =>
                s.playerId && dummyIds.has(s.playerId)
                  ? { ...s, playerId: null }
                  : s,
              ),
            },
          }
        }),

      assignToList: (playerId, list) =>
        set((state) => {
          const listA = state.draft.listA.filter((id) => id !== playerId)
          const listB = state.draft.listB.filter((id) => id !== playerId)
          if (list === 'A') listA.push(playerId)
          else if (list === 'B') listB.push(playerId)
          return { draft: { listA, listB } }
        }),

      resetDraft: () => set({ draft: EMPTY_DRAFT }),

      loadSalzburgTemplate: () => {
        const players = structuredClone(TEMPLATE_PLAYERS)
        set({
          players,
          draft: createTemplateDraft(players),
        })
      },

      loadSalzburgCoreTemplate: () => {
        const players = structuredClone(TEMPLATE_PLAYERS_CORE)
        set({
          players,
          draft: createTemplateDraft(players),
        })
      },

      clearKader: () =>
        set({
          players: [],
          draft: EMPTY_DRAFT,
          squadPlan: createEmptySquadPlan(),
          lineup: createEmptyLineup(),
        }),

      loadSquadRoleTemplate: () =>
        set((state) => ({
          squadPlan: createFullSquadTemplate(state.players),
        })),

      addSquadCategory: (label = 'Neu') =>
        set((state) => {
          const category = {
            id: uid(),
            label: label.trim() || 'Neu',
          }
          return {
            squadPlan: {
              ...state.squadPlan,
              categories: [...state.squadPlan.categories, category],
            },
          }
        }),

      updateSquadCategory: (categoryId, label) =>
        set((state) => ({
          squadPlan: {
            ...state.squadPlan,
            categories: state.squadPlan.categories.map((c) =>
              c.id === categoryId
                ? { ...c, label: label.trim() || c.label }
                : c,
            ),
          },
        })),

      removeSquadCategory: (categoryId) =>
        set((state) => ({
          squadPlan: {
            ...state.squadPlan,
            categories: state.squadPlan.categories.filter(
              (c) => c.id !== categoryId,
            ),
            roles: state.squadPlan.roles.map((r) =>
              r.categoryId === categoryId ? { ...r, categoryId: null } : r,
            ),
          },
        })),

      moveSquadCategory: (categoryId, direction) =>
        set((state) => {
          const categories = [...state.squadPlan.categories]
          const idx = categories.findIndex((c) => c.id === categoryId)
          if (idx < 0) return state
          const swap = direction === 'up' ? idx - 1 : idx + 1
          if (swap < 0 || swap >= categories.length) return state
          ;[categories[idx], categories[swap]] = [
            categories[swap],
            categories[idx],
          ]
          return { squadPlan: { ...state.squadPlan, categories } }
        }),

      addSquadRole: (label = 'Neu', categoryId = null) =>
        set((state) => {
          const role: SquadRole = {
            id: uid(),
            label: label.trim() || 'Neu',
            categoryId,
          }
          const roles = [...state.squadPlan.roles]
          if (categoryId) {
            let insertAt = roles.length
            for (let i = roles.length - 1; i >= 0; i--) {
              if (roles[i].categoryId === categoryId) {
                insertAt = i + 1
                break
              }
            }
            roles.splice(insertAt, 0, role)
          } else {
            roles.push(role)
          }
          return {
            squadPlan: {
              ...state.squadPlan,
              roles,
            },
          }
        }),

      updateSquadRole: (roleId, label) =>
        set((state) => ({
          squadPlan: {
            ...state.squadPlan,
            roles: state.squadPlan.roles.map((r) =>
              r.id === roleId ? { ...r, label: label.trim() || r.label } : r,
            ),
          },
        })),

      setSquadRoleCategory: (roleId, categoryId) =>
        set((state) => {
          const roles = state.squadPlan.roles.map((r) =>
            r.id === roleId ? { ...r, categoryId } : r,
          )
          const role = roles.find((r) => r.id === roleId)
          if (!role) return state
          const without = roles.filter((r) => r.id !== roleId)
          if (categoryId) {
            let insertAt = without.length
            for (let i = without.length - 1; i >= 0; i--) {
              if (without[i].categoryId === categoryId) {
                insertAt = i + 1
                break
              }
            }
            without.splice(insertAt, 0, role)
          } else {
            without.push(role)
          }
          return {
            squadPlan: { ...state.squadPlan, roles: without },
          }
        }),

      removeSquadRole: (roleId) =>
        set((state) => {
          const { [roleId]: _removed, ...assignments } =
            state.squadPlan.assignments
          return {
            squadPlan: {
              ...state.squadPlan,
              roles: state.squadPlan.roles.filter((r) => r.id !== roleId),
              assignments,
            },
            lineup: stripRoleFromLineup(state.lineup, roleId),
          }
        }),

      moveSquadRole: (roleId, direction) =>
        set((state) => {
          const roles = [...state.squadPlan.roles]
          const idx = roles.findIndex((r) => r.id === roleId)
          if (idx < 0) return state
          const catId = roles[idx].categoryId ?? null
          const inCategory = roles
            .map((r, i) => ({ r, i }))
            .filter(({ r }) => (r.categoryId ?? null) === catId)
          const posInCat = inCategory.findIndex(({ r }) => r.id === roleId)
          const swapPos = direction === 'up' ? posInCat - 1 : posInCat + 1
          if (swapPos < 0 || swapPos >= inCategory.length) return state
          const iA = inCategory[posInCat].i
          const iB = inCategory[swapPos].i
          ;[roles[iA], roles[iB]] = [roles[iB], roles[iA]]
          return { squadPlan: { ...state.squadPlan, roles } }
        }),

      addPlayerToRole: (roleId, playerId) =>
        set((state) => {
          const current = state.squadPlan.assignments[roleId] ?? []
          if (current.includes(playerId)) return state
          return {
            squadPlan: {
              ...state.squadPlan,
              assignments: {
                ...state.squadPlan.assignments,
                [roleId]: [...current, playerId],
              },
            },
          }
        }),

      removePlayerFromRole: (roleId, playerId) =>
        set((state) => {
          const current = state.squadPlan.assignments[roleId] ?? []
          const filtered = current.filter((id) => id !== playerId)
          const assignments = { ...state.squadPlan.assignments }
          if (filtered.length === 0) delete assignments[roleId]
          else assignments[roleId] = filtered
          return { squadPlan: { ...state.squadPlan, assignments } }
        }),

      reorderPlayersInRole: (roleId, fromIndex, toIndex) =>
        set((state) => {
          const current = state.squadPlan.assignments[roleId] ?? []
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= current.length ||
            toIndex >= current.length ||
            fromIndex === toIndex
          ) {
            return state
          }
          const next = [...current]
          const [moved] = next.splice(fromIndex, 1)
          next.splice(toIndex, 0, moved)
          return {
            squadPlan: {
              ...state.squadPlan,
              assignments: {
                ...state.squadPlan.assignments,
                [roleId]: next,
              },
            },
          }
        }),

      resetSquadAssignments: () =>
        set((state) => ({
          squadPlan: { ...state.squadPlan, assignments: {} },
        })),

      setFormation: (formationId) =>
        set((state) => ({
          lineup: {
            ...state.lineup,
            formationId,
            slots: createSlotsForFormation(
              formationId,
              state.lineup.slots,
              state.customFormations,
            ),
          },
        })),

      setLineupShowBackups: (show) =>
        set((state) => ({
          lineup: { ...state.lineup, showBackups: show },
        })),

      assignLineupPlayer: (slotKey, playerId) =>
        set((state) => ({
          lineup: {
            ...state.lineup,
            slots: state.lineup.slots.map((s) =>
              s.key !== slotKey
                ? s
                : s.roleId
                  ? s
                  : { ...s, playerId },
            ),
          },
        })),

      assignLineupRole: (slotKey, roleId) =>
        set((state) => ({
          lineup: {
            ...state.lineup,
            slots: state.lineup.slots.map((s) =>
              s.key !== slotKey
                ? s
                : {
                    ...s,
                    roleId,
                    playerId: null,
                  },
            ),
          },
        })),

      clearLineupSlot: (slotKey) =>
        set((state) => ({
          lineup: {
            ...state.lineup,
            slots: state.lineup.slots.map((s) =>
              s.key !== slotKey
                ? s
                : { ...s, roleId: null, playerId: null },
            ),
          },
        })),

      clearLineupAll: () =>
        set((state) => ({
          lineup: clearLineupAssignments(state.lineup),
        })),

      dismissTemplateContentUpdate: () =>
        set({ seenTemplateContentVersion: TEMPLATE_CONTENT_VERSION }),

      createCustomFormation: (name, basedOnFormationId) => {
        const id = uid()
        const slots = cloneSlotTemplates(
          basedOnFormationId,
          get().customFormations,
        )
        set((state) => ({
          customFormations: [
            ...state.customFormations,
            {
              id,
              name: name.trim() || 'Eigene Formation',
              slots,
            },
          ],
        }))
        return id
      },

      updateCustomFormation: (id, patch) =>
        set((state) => {
          const customFormations = state.customFormations.map((f) => {
            if (f.id !== id) return f
            return {
              ...f,
              name: patch.name !== undefined ? patch.name.trim() || f.name : f.name,
              slots: patch.slots ?? f.slots,
            }
          })
          const lineup =
            state.lineup.formationId === id
              ? {
                  ...state.lineup,
                  slots: createSlotsForFormation(
                    id,
                    state.lineup.slots,
                    customFormations,
                  ),
                }
              : state.lineup
          return { customFormations, lineup }
        }),

      deleteCustomFormation: (id) =>
        set((state) => {
          const customFormations = state.customFormations.filter(
            (f) => f.id !== id,
          )
          if (state.lineup.formationId !== id) {
            return { customFormations }
          }
          return {
            customFormations,
            lineup: {
              formationId: '4-2-3-1',
              showBackups: state.lineup.showBackups,
              slots: createSlotsForFormation(
                '4-2-3-1',
                state.lineup.slots,
                customFormations,
              ),
            },
          }
        }),

      moveCustomFormationSlot: (slotKey, x, y) =>
        set((state) => {
          const editable = withEditableFormation(state)
          const nx = clamp01(x)
          const ny = clamp01(y)
          const formationId = editable.formationId
          return {
            customFormations: editable.customFormations.map((f) =>
              f.id !== formationId
                ? f
                : {
                    ...f,
                    slots: f.slots.map((s) =>
                      s.key === slotKey ? { ...s, x: nx, y: ny } : s,
                    ),
                  },
            ),
            lineup: {
              ...editable.lineup,
              slots: editable.lineup.slots.map((s) =>
                s.key === slotKey ? { ...s, x: nx, y: ny } : s,
              ),
            },
          }
        }),

      renameCustomFormationSlot: (slotKey, label) =>
        set((state) => {
          const editable = withEditableFormation(state)
          const nextLabel = label.length > 0 ? label.slice(0, 24) : slotKey
          const formationId = editable.formationId
          return {
            customFormations: editable.customFormations.map((f) =>
              f.id !== formationId
                ? f
                : {
                    ...f,
                    slots: f.slots.map((s) =>
                      s.key === slotKey ? { ...s, label: nextLabel } : s,
                    ),
                  },
            ),
            lineup: {
              ...editable.lineup,
              slots: editable.lineup.slots.map((s) =>
                s.key === slotKey ? { ...s, label: nextLabel } : s,
              ),
            },
          }
        }),

      exportSquadPlanJSON: () => {
        const { squadPlan } = get()
        return JSON.stringify({ version: 2, squadPlan }, null, 2)
      },

      importSquadPlanJSON: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (!parsed || !parsed.squadPlan) {
            return {
              ok: false,
              error: 'Ungültiges Format: "squadPlan" fehlt.',
            }
          }
          set({ squadPlan: normalizeSquadPlan(parsed.squadPlan) })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: (e as Error).message }
        }
      },

      exportJSON: () => {
        const { players, draft, squadPlan, lineup, customFormations } = get()
        return JSON.stringify(
          { version: 4, players, draft, squadPlan, lineup, customFormations },
          null,
          2,
        )
      },

      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (!parsed || !Array.isArray(parsed.players)) {
            return { ok: false, error: 'Ungültiges Format: "players" fehlt.' }
          }
          const players = parsed.players as Player[]
          const draft: DraftState =
            parsed.draft &&
            Array.isArray(parsed.draft.listA) &&
            Array.isArray(parsed.draft.listB)
              ? parsed.draft
              : EMPTY_DRAFT
          const squadPlan = parsed.squadPlan
            ? normalizeSquadPlan(parsed.squadPlan)
            : createEmptySquadPlan()
          const customFormations = normalizeCustomFormations(
            parsed.customFormations,
          )
          const lineup = parsed.lineup
            ? normalizeLineup(parsed.lineup, { customFormations })
            : createEmptyLineup(customFormations)
          set({ players, draft, squadPlan, lineup, customFormations })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: (e as Error).message }
        }
      },
    }),
    {
      name: 'uefa-kader-storage',
      version: STORAGE_VERSION,
      partialize: (state) => ({
        players: state.players,
        draft: state.draft,
        squadPlan: state.squadPlan,
        lineup: state.lineup,
        customFormations: state.customFormations,
        seenTemplateContentVersion: state.seenTemplateContentVersion,
      }),
      migrate: (persisted, version) => {
        const base = persisted as Partial<PersistedState>
        const withSquad: PersistedState = {
          players: base.players ?? [],
          draft: base.draft ?? EMPTY_DRAFT,
          squadPlan: base.squadPlan ?? createEmptySquadPlan(),
          lineup: base.lineup ?? createEmptyLineup(),
          customFormations: normalizeCustomFormations(base.customFormations),
          seenTemplateContentVersion:
            typeof base.seenTemplateContentVersion === 'number'
              ? base.seenTemplateContentVersion
              : 0,
        }
        if (version < 2) {
          return {
            players: structuredClone(TEMPLATE_PLAYERS),
            draft: structuredClone(EMPTY_DRAFT),
            squadPlan: createEmptySquadPlan(),
            lineup: createEmptyLineup(),
            customFormations: [],
            seenTemplateContentVersion: 0,
          }
        }
        if (version < 4) {
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
          }
        }
        if (version < 5) {
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
          }
        }
        if (version < 6) {
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            lineup: withSquad.lineup ?? createEmptyLineup(),
          }
        }
        if (version < 7) {
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            lineup: normalizeLineup(withSquad.lineup),
          }
        }
        if (version < 8) {
          const lineup = normalizeLineup(withSquad.lineup)
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            lineup: {
              ...lineup,
              slots: createSlotsForFormation(
                lineup.formationId,
                lineup.slots,
                [],
              ),
            },
          }
        }
        if (version < 9) {
          const lineup = normalizeLineup(withSquad.lineup, {
            customFormations: withSquad.customFormations,
          })
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            lineup: {
              ...lineup,
              slots: createSlotsForFormation(
                lineup.formationId,
                lineup.slots,
                withSquad.customFormations,
              ),
            },
          }
        }
        if (version < 10) {
          const lineup = normalizeLineup(withSquad.lineup, {
            customFormations: withSquad.customFormations,
          })
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            customFormations: withSquad.customFormations,
            lineup: {
              ...lineup,
              slots: createSlotsForFormation(
                lineup.formationId,
                lineup.slots,
                withSquad.customFormations,
              ),
            },
          }
        }
        if (version < 11) {
          const lineup = normalizeLineup(withSquad.lineup, {
            customFormations: withSquad.customFormations,
          })
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            lineup: {
              ...lineup,
              slots: createSlotsForFormation(
                lineup.formationId,
                lineup.slots,
                withSquad.customFormations,
              ),
            },
          }
        }
        if (version < 12) {
          return {
            ...withSquad,
            squadPlan: normalizeSquadPlan(withSquad.squadPlan),
            seenTemplateContentVersion: 0,
            lineup: normalizeLineup(withSquad.lineup, {
              customFormations: withSquad.customFormations,
            }),
          }
        }
        return {
          ...withSquad,
          squadPlan: normalizeSquadPlan(withSquad.squadPlan),
          lineup: normalizeLineup(withSquad.lineup, {
            customFormations: withSquad.customFormations,
          }),
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
