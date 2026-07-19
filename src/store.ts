import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ContractPeriod, DraftState, Player, Position } from '@/types'
import kaderSeed from '@/data/kader-seed.json'

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

export const TEMPLATE_PLAYER_COUNT = TEMPLATE_PLAYERS.filter(
  (p) => !p.isDummy,
).length

const EMPTY_DRAFT: DraftState = { listA: [], listB: [] }

/**
 * Persist-Version.
 * v2: Legacy-Migration auf Seed.
 * v3+: Nutzerdaten bleiben lokal; neuer Erstbesuch startet leer.
 */
const STORAGE_VERSION = 3

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface PersistedState {
  players: Player[]
  draft: DraftState
}

interface KaderStore extends PersistedState {
  /** True, sobald LocalStorage eingelesen wurde (vermeidet leeren Flash). */
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

  /** Laedt den mitgelieferten FC-Salzburg-Template-Kader (ersetzt lokalen Stand). */
  loadSalzburgTemplate: () => void
  /** Entfernt alle Spieler und setzt den Draft zurueck. */
  clearKader: () => void

  exportJSON: () => string
  importJSON: (json: string) => { ok: boolean; error?: string }
}

export const useKaderStore = create<KaderStore>()(
  persist(
    (set, get) => ({
      // Produktion: leer starten - Template nur auf Wunsch laden.
      players: [],
      draft: EMPTY_DRAFT,
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

      loadSalzburgTemplate: () =>
        set({
          players: structuredClone(TEMPLATE_PLAYERS),
          // Registrierung immer leer starten - Template liefert nur den Kader.
          draft: structuredClone(EMPTY_DRAFT),
        }),

      clearKader: () => set({ players: [], draft: EMPTY_DRAFT }),

      exportJSON: () => {
        const { players, draft } = get()
        return JSON.stringify({ version: 1, players, draft }, null, 2)
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
          set({ players, draft })
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
      }),
      migrate: (persisted, version) => {
        // v0/v1 → v2: einmalig Seed-Spieler (Legacy), Draft bleibt leer.
        if (version < 2) {
          return {
            players: structuredClone(TEMPLATE_PLAYERS),
            draft: structuredClone(EMPTY_DRAFT),
          }
        }
        // v2 → v3 und spaeter: lokale Daten behalten, nie neu seeden.
        return persisted as PersistedState
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
