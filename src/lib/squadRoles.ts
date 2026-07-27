import type {
  Player,
  SquadCategory,
  SquadPlanState,
  SquadRole,
} from '@/types'

/** Standard-Rollen fuer die Kaderplanung (mit LIV/RIV). */
export const SQUAD_ROLE_TEMPLATE_LABELS = [
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
] as const

export const SQUAD_ROLE_TEMPLATE_COUNT = SQUAD_ROLE_TEMPLATE_LABELS.length

export const SQUAD_CATEGORY_TEMPLATE_COUNT = 4

/** Breite des Export-Bildes (Kaderplanung) – passt in max-w-7xl inkl. Padding. */
export const SQUAD_BOARD_WIDTH = 1140

/** Mindestbreite einer Kategorie-Spalte (lesbare Schrift). */
export const SQUAD_BOARD_MIN_COLUMN_WIDTH = 272

export const SQUAD_BOARD_COLUMN_GAP = 8

export const SQUAD_BOARD_CONTENT_PADDING = 10

export const SQUAD_BOARD_RED = 'hsl(350, 78%, 50%)'

export type BoardCategoryAccent = {
  background: string
  foreground: string
  /** Optionaler Rand (z. B. weiße Spalte auf dunklem Grund). */
  border?: string
}

export type CategoryBoardColumn = {
  categoryId: string | null
  /** `null` = keine Kategorie-Zeile (nur Rollen-Kästen). */
  label: string | null
  roles: SquadRole[]
  accent: BoardCategoryAccent
}

export type CategoryBoardRow = {
  columns: CategoryBoardColumn[]
}

const TEMPLATE_STRUCTURE: { category: string; roles: string[] }[] = [
  { category: 'Tor', roles: ['TW'] },
  { category: 'Abwehr', roles: ['LV', 'LIV', 'RIV', 'RV'] },
  { category: 'Mittelfeld', roles: ['DM', 'ZM', 'OM'] },
  { category: 'Angriff', roles: ['LF', 'RF', 'ST'] },
]

/**
 * Standard-Zuweisungen für das Rollen-Template (Namensfragmente, Reihenfolge =
 * Priorität). Werden gegen den aktuellen Kader gematcht.
 */
export const SQUAD_ROLE_TEMPLATE_ASSIGNMENTS: Record<string, string[]> = {
  TW: ['Zawieschitzky', 'Sarcevic'],
  LV: ['Krätzig', 'Schmid'],
  LIV: ['Mellberg', 'Zabransky', 'Blank'],
  RIV: ['Boma', 'Chase', 'Drexler'],
  RV: ['Veratschnig', 'Lainer', 'Morgalla'],
  DM: ['Diabaté'],
  ZM: ['Barry', 'Mazurek', 'Kjaergaard'],
  OM: ['Kitano', 'Diakité', 'Matijasevic'],
  LF: ['Daghim', 'Aguilar', 'Camara'],
  RF: ['Baidoo', 'Redzic'],
  ST: ['Tabakovic', 'Vertessen', 'Konaté'],
}

export function foldPlayerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/ß/g, 'ss')
}

export function findPlayerByNameFragment(
  players: Player[],
  fragment: string,
): Player | undefined {
  const needle = foldPlayerName(fragment)
  if (!needle) return undefined
  const hits = players.filter((p) => foldPlayerName(p.name).includes(needle))
  if (hits.length === 0) return undefined
  if (hits.length === 1) return hits[0]
  // Bei Mehrdeutigkeit: exakter Nachname bevorzugt
  const exactLast = hits.find((p) => {
    const parts = foldPlayerName(p.name).split(/\s+/)
    return parts[parts.length - 1] === needle
  })
  return exactLast ?? hits[0]
}

export function createTemplateRoles(): SquadRole[] {
  return SQUAD_ROLE_TEMPLATE_LABELS.map((label) => ({
    id: `tpl-${label.toLowerCase()}`,
    label,
    categoryId: null,
  }))
}

export function createFullSquadTemplate(
  players: Player[] = [],
): SquadPlanState {
  const categories: SquadCategory[] = []
  const roles: SquadRole[] = []
  for (const block of TEMPLATE_STRUCTURE) {
    const catId = `cat-${block.category.toLowerCase()}`
    categories.push({ id: catId, label: block.category })
    for (const label of block.roles) {
      roles.push({
        id: `tpl-${label.toLowerCase()}`,
        label,
        categoryId: catId,
      })
    }
  }

  const assignments: Record<string, string[]> = {}
  for (const role of roles) {
    const fragments = SQUAD_ROLE_TEMPLATE_ASSIGNMENTS[role.label] ?? []
    const ids: string[] = []
    for (const frag of fragments) {
      const player = findPlayerByNameFragment(players, frag)
      if (!player) continue
      if (ids.includes(player.id)) continue
      ids.push(player.id)
    }
    if (ids.length > 0) assignments[role.id] = ids
  }

  return { categories, roles, assignments }
}

export function createEmptySquadPlan(): SquadPlanState {
  return {
    categories: [],
    roles: [],
    assignments: {},
  }
}

function normalizeRole(raw: unknown): SquadRole | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<SquadRole>
  if (typeof r.id !== 'string' || typeof r.label !== 'string') return null
  return {
    id: r.id,
    label: r.label,
    categoryId:
      typeof r.categoryId === 'string'
        ? r.categoryId
        : r.categoryId === null
          ? null
          : undefined,
  }
}

function normalizeCategory(raw: unknown): SquadCategory | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<SquadCategory>
  if (typeof c.id !== 'string' || typeof c.label !== 'string') return null
  return { id: c.id, label: c.label }
}

/** Import/Legacy: einzelne string-Werte in Arrays umwandeln. */
export function normalizeSquadPlan(raw: unknown): SquadPlanState {
  if (!raw || typeof raw !== 'object') return createEmptySquadPlan()
  const obj = raw as Partial<SquadPlanState>
  const categories = Array.isArray(obj.categories)
    ? obj.categories
        .map(normalizeCategory)
        .filter((c): c is SquadCategory => Boolean(c))
    : []
  const roles = Array.isArray(obj.roles)
    ? obj.roles
        .map(normalizeRole)
        .filter((r): r is SquadRole => Boolean(r))
    : []
  const assignments: Record<string, string[]> = {}
  if (obj.assignments && typeof obj.assignments === 'object') {
    for (const [roleId, val] of Object.entries(obj.assignments)) {
      if (Array.isArray(val)) {
        assignments[roleId] = val.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      } else if (typeof val === 'string' && val) {
        assignments[roleId] = [val]
      }
    }
  }
  return { categories, roles, assignments }
}

/** Rot / Weiß abwechselnd über alle Spalten (auch über Zeilenumbrüche). */
export function boardCategoryAccent(columnIndex: number): BoardCategoryAccent {
  if (columnIndex % 2 === 0) {
    return { background: SQUAD_BOARD_RED, foreground: '#ffffff' }
  }
  return {
    background: '#ffffff',
    foreground: '#1a1a1a',
    border: '#cccccc',
  }
}

/** Wie viele Spalten in eine Zeile passen, ohne unter Mindestbreite zu fallen. */
export function maxCategoryColumnsPerRow(
  boardWidth: number = SQUAD_BOARD_WIDTH,
): number {
  const inner = boardWidth - SQUAD_BOARD_CONTENT_PADDING * 2
  const perCol = SQUAD_BOARD_MIN_COLUMN_WIDTH + SQUAD_BOARD_COLUMN_GAP
  const n = Math.floor((inner + SQUAD_BOARD_COLUMN_GAP) / perCol)
  return Math.max(1, n)
}

function rolesForCategory(
  plan: SquadPlanState,
  categoryId: string | null,
): SquadRole[] {
  if (categoryId === null) {
    const known = new Set(plan.categories.map((c) => c.id))
    return plan.roles.filter(
      (r) => !r.categoryId || !known.has(r.categoryId),
    )
  }
  return plan.roles.filter((r) => r.categoryId === categoryId)
}

/** Kategorien als Spalten; neue Zeile wenn nötig; Zeile nutzt volle Breite (1fr). */
export function buildCategoryBoardLayout(
  plan: SquadPlanState,
): CategoryBoardRow[] {
  const columnDefs: Omit<CategoryBoardColumn, 'accent'>[] = []

  if (plan.categories.length > 0) {
    for (const cat of plan.categories) {
      columnDefs.push({
        categoryId: cat.id,
        label: cat.label,
        roles: rolesForCategory(plan, cat.id),
      })
    }
    const uncategorized = rolesForCategory(plan, null)
    for (const role of uncategorized) {
      columnDefs.push({
        categoryId: null,
        label: null,
        roles: [role],
      })
    }
  } else if (plan.roles.length > 0) {
    for (const role of plan.roles) {
      columnDefs.push({
        categoryId: null,
        label: null,
        roles: [role],
      })
    }
  }

  if (columnDefs.length === 0) return []

  const maxPerRow = maxCategoryColumnsPerRow()
  const rows: CategoryBoardRow[] = []
  let globalColumnIndex = 0

  for (let i = 0; i < columnDefs.length; i += maxPerRow) {
    const chunk = columnDefs.slice(i, i + maxPerRow)
    rows.push({
      columns: chunk.map((col) => {
        const accent = boardCategoryAccent(globalColumnIndex)
        globalColumnIndex += 1
        return { ...col, accent }
      }),
    })
  }
  return rows
}

/** Zeilenweise Reihenfolge in feste Spalten (ohne Leerraum unter kurzen Karten). */
export function distributeColumnsToLanes<T>(
  items: T[],
  laneCount: number,
): T[][] {
  const lanes = Array.from({ length: laneCount }, () => [] as T[])
  for (let i = 0; i < items.length; i++) {
    lanes[i % laneCount].push(items[i]!)
  }
  return lanes
}
