/**
 * Kern-Datenmodell fuer die UEFA-Kaderplanung (FC Red Bull Salzburg).
 *
 * WICHTIG: Die Vertragshistorie (contracts) muss lueckenlos und ueberlappungsfrei
 * gepflegt werden, damit die UEFA-Kalkulationen (Club-/Association-Trained,
 * B-Listen-Berechtigung) korrekt ausgewertet werden koennen.
 */

/** Spielerposition. GK wird fuer die Torwart-Mindestanzahl der A-Liste benoetigt. */
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

/**
 * Kategorie eines Vereins bezogen auf den FC Red Bull Salzburg.
 *
 * - FC_SALZBURG: Der Verein selbst. Nur Zeiten hier zaehlen fuer "Club-Trained".
 * - ASSOCIATION_CLUB: Anderer Verein desselben Verbandes (OEFB).
 *   WICHTIG: FC Liefering und die Red Bull Akademie fallen EXPLIZIT hierunter und
 *   duerfen NICHT als FC_SALZBURG gewertet werden. Auch andere oesterreichische
 *   Clubs (z. B. WAC) gehoeren hierher. Zeiten zaehlen nur fuer "Association-Trained".
 * - FOREIGN_CLUB: Verein eines anderen Verbandes. Kein Ausbildungsbonus.
 */
export type ClubCategory = 'FC_SALZBURG' | 'ASSOCIATION_CLUB' | 'FOREIGN_CLUB'

/** Menschlich lesbare Labels fuer die Vereinskategorien. */
export const CLUB_CATEGORY_LABELS: Record<ClubCategory, string> = {
  FC_SALZBURG: 'FC Red Bull Salzburg',
  ASSOCIATION_CLUB: 'ÖFB Verbandsverein',
  FOREIGN_CLUB: 'Ausländischer Verein',
}

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Torhüter',
  DEF: 'Abwehr',
  MID: 'Mittelfeld',
  FWD: 'Angriff',
}

/** Sortierreihenfolge fuer Anzeige/Export: Torhüter → Abwehr → Mittelfeld → Angriff. */
export const POSITION_ORDER: Record<Position, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
}

/**
 * Eine einzelne Vertragsphase eines Spielers.
 * startDate/endDate sind ISO-Datumsstrings (YYYY-MM-DD).
 */
export interface ContractPeriod {
  id: string
  startDate: string
  endDate: string
  clubId: string
  clubName: string
  clubCategory: ClubCategory
  /** True, wenn diese Phase eine Leihe war (relevant fuer die B-Listen-Regel). */
  isLoan: boolean
}

/** Ein Spieler inkl. lueckenlos auswertbarer Vertragshistorie. */
export interface Player {
  id: string
  name: string
  /** Geburtsdatum als ISO-Datumsstring (YYYY-MM-DD). */
  birthDate: string
  position: Position
  /**
   * True fuer virtuelle "Dummy"-Spieler (hypothetische Transfers), die nur fuer
   * ein Draft-Szenario existieren und die reale Datenbank nicht beeinflussen.
   */
  isDummy: boolean
  contracts: ContractPeriod[]
}

/** Sortiert Spieler nach Position, bei Gleichstand nach Name. */
export function compareByPosition(a: Player, b: Player): number {
  const byPos = POSITION_ORDER[a.position] - POSITION_ORDER[b.position]
  if (byPos !== 0) return byPos
  return a.name.localeCompare(b.name, 'de')
}

/** Ableitbare UEFA-Ausbildungskategorie eines Spielers. */
export type UefaCategory = 'CTP' | 'ATP' | 'NON_LOCAL'

export const UEFA_CATEGORY_LABELS: Record<UefaCategory, string> = {
  CTP: 'Club-Trained',
  ATP: 'Association-Trained',
  NON_LOCAL: 'Non-Locally Trained',
}

/** Persistierter Zustand eines A-/B-Listen-Drafts (Referenzen auf Player-IDs). */
export interface DraftState {
  listA: string[]
  listB: string[]
}
