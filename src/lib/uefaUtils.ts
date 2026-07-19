/**
 * UEFA-Kalkulationslogik fuer die Champions League 2026/27 (Artikel 30 / 31).
 *
 * Alle Funktionen hier sind rein (keine Seiteneffekte) und damit gut testbar.
 * Datumsangaben werden als ISO-Strings (YYYY-MM-DD) erwartet.
 */

import type { ClubCategory, Player, UefaCategory } from '@/types'

// ---------------------------------------------------------------------------
// Konfig-Konstanten (zentral, damit sie pro Saison leicht anpassbar sind)
// ---------------------------------------------------------------------------

/**
 * Stichtag fuer die B-Liste (U21) in der Saison 2026/27:
 * Ein Spieler darf nur auf die B-Liste, wenn er an oder nach diesem Datum
 * geboren ist. Der Wert folgt dem +1-Jahr-pro-Saison-Schema der UEFA.
 * (Hinweis: Eine aeltere UEFA-News-Quelle nennt noch 2004 fuer eine
 * fruehere Saison - hier bewusst auf 2005 gesetzt und leicht aenderbar.)
 */
export const LIST_B_BIRTH_CUTOFF = '2005-01-01'

/** Mindestdauer (Monate) fuer Club-/Association-Trained zwischen 15 und 21. */
export const TRAINED_MIN_MONTHS = 36

/** Untere Altersgrenze des Ausbildungsfensters (Jahre). */
export const TRAINING_WINDOW_START_AGE = 15

/** Obere Altersgrenze des Ausbildungsfensters (Jahre). */
export const TRAINING_WINDOW_END_AGE = 21

/** Maximale Anzahl Spieler auf der A-Liste. */
export const LIST_A_MAX = 25

/** Reservierte Plaetze fuer locally-trained Spieler. */
export const LOCALLY_TRAINED_REQUIRED = 8

/** Maximale Anzahl association-trained Spieler, die auf die 8 Plaetze zaehlen. */
export const ASSOCIATION_TRAINED_MAX = 4

/** Mindestanzahl Torhüter auf der A-Liste (Art. 31). */
export const GOALKEEPERS_REQUIRED = 2

/** Mindestanzahl Torhüter insgesamt auf A- und B-Liste kombiniert (Art. 31). */
export const GOALKEEPERS_TOTAL_REQUIRED = 3

// ---------------------------------------------------------------------------
// Datums-Helfer
// ---------------------------------------------------------------------------

/** Parst 'YYYY-MM-DD' als UTC-Date (vermeidet Zeitzonen-Verschiebungen). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

/** Addiert eine ganze Anzahl Jahre zu einem Date (UTC). */
export function addYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  )
}

/**
 * Differenz in Monaten (als Dezimalzahl). Ganze Jahre ergeben exakte
 * Vielfache von 12 (z. B. 3 Jahre = 36.0), Resttage werden anteilig
 * mit 30 Tagen/Monat verrechnet. Negative Bereiche ergeben 0.
 */
export function monthsBetween(start: Date, end: Date): number {
  if (end <= start) return 0
  let months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  months += (end.getUTCDate() - start.getUTCDate()) / 30
  return Math.max(0, months)
}

/** Alter in ganzen Jahren zu einem Stichtag (default: heute). */
export function getAge(birthDate: string, at: Date = new Date()): number {
  const b = parseDate(birthDate)
  let age = at.getUTCFullYear() - b.getUTCFullYear()
  const beforeBirthday =
    at.getUTCMonth() < b.getUTCMonth() ||
    (at.getUTCMonth() === b.getUTCMonth() && at.getUTCDate() < b.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

// ---------------------------------------------------------------------------
// Intervall-Helfer (Ueberlappungsbereinigung der Vertragsphasen)
// ---------------------------------------------------------------------------

interface Interval {
  start: number
  end: number
}

/** Schneidet ein Intervall auf ein Fenster zu. Gibt null bei leerem Rest. */
function clip(interval: Interval, windowStart: number, windowEnd: number): Interval | null {
  const start = Math.max(interval.start, windowStart)
  const end = Math.min(interval.end, windowEnd)
  return end > start ? { start, end } : null
}

/** Fuehrt sich ueberlappende/aneinandergrenzende Intervalle zusammen. */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Interval[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const cur = sorted[i]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      merged.push(cur)
    }
  }
  return merged
}

/**
 * Kalendermonat, in dem eine "Sommer-Meisterschaft" (z. B. oesterr. Bundesliga)
 * typischerweise beginnt. Eine Saison N laeuft damit von 1. Juli des Jahres N
 * bis 30. Juni des Jahres N+1.
 */
const SEASON_START_MONTH = 7 // Juli

/** Start-Jahr der Saison, in der `date` liegt (z. B. 15.03.2023 -> Saison 2022). */
function seasonStartYear(date: Date): number {
  const m = date.getUTCMonth() + 1
  return m >= SEASON_START_MONTH
    ? date.getUTCFullYear()
    : date.getUTCFullYear() - 1
}

/** [Start, Ende) einer Saison (Start-Jahr `year`) als Zeitstempel. */
function seasonBounds(year: number): Interval {
  return {
    start: Date.UTC(year, SEASON_START_MONTH - 1, 1),
    end: Date.UTC(year + 1, SEASON_START_MONTH - 1, 1),
  }
}

/**
 * Toleranz fuer den Saisonbeginn: das tatsaechliche erste Meisterschaftsspiel
 * findet oft erst 2-4 Wochen nach dem 1. Juli statt.
 */
const SEASON_JOIN_GRACE_MS = 45 * 24 * 60 * 60 * 1000

/**
 * Ausbildungsfenster laut Art. 30.02/30.03:
 * von Beginn der Saison, in der der Spieler 15 wird, bis Ende der Saison, in
 * der er 21 wird (Sommer-Meisterschaft: Naeherung 1.7. bis 30.6.).
 */
export function trainingWindowBounds(birthDate: string): Interval {
  const birth = parseDate(birthDate)
  const fifteenth = addYears(birth, TRAINING_WINDOW_START_AGE)
  const twentyFirst = addYears(birth, TRAINING_WINDOW_END_AGE)
  const startYear = seasonStartYear(fifteenth)
  const endYear = seasonStartYear(twentyFirst)
  return {
    start: seasonBounds(startYear).start,
    end: seasonBounds(endYear).end,
  }
}

/**
 * Summiert die anrechenbaren Monate im Ausbildungsfenster (15-21) fuer
 * Vertragsphasen der angegebenen Kategorien - ueberlappungsbereinigt.
 *
 * Das Fensterende wird auf `asOf` (Standard: heute) begrenzt, damit nur
 * bereits abgeleistete Zeit zaehlt und der Spieler nach seiner AKTUELLEN
 * Berechtigung bewertet wird (keine zukuenftig vertraglich gebundene Zeit).
 */
export function monthsInTrainingWindow(
  player: Player,
  categories: ClubCategory[],
  asOf: Date = new Date(),
): number {
  const bounds = trainingWindowBounds(player.birthDate)
  const windowStart = bounds.start
  const windowEnd = Math.min(bounds.end, asOf.getTime())
  if (windowEnd <= windowStart) return 0

  const relevant: Interval[] = []
  for (const c of player.contracts) {
    if (!categories.includes(c.clubCategory)) continue
    const clipped = clip(
      { start: parseDate(c.startDate).getTime(), end: parseDate(c.endDate).getTime() },
      windowStart,
      windowEnd,
    )
    if (clipped) relevant.push(clipped)
  }

  return mergeIntervals(relevant).reduce(
    (sum, iv) => sum + monthsBetween(new Date(iv.start), new Date(iv.end)),
    0,
  )
}

/**
 * Zaehlt volle Saisons (Naeherung: 1.7.-30.6.) im Ausbildungsfenster (15-21),
 * in denen der Spieler DURCHGEHEND fuer die angegebenen Kategorien registriert
 * war. Nur bereits abgeschlossene Saisons zaehlen (Stichtag `asOf`).
 *
 * Damit wird die zweite, gleichwertige Alternative aus Art. 30.02/30.03
 * abgebildet: "... of three entire seasons ... or of 36 months."
 */
export function countFullSeasonsInWindow(
  player: Player,
  categories: ClubCategory[],
  asOf: Date = new Date(),
): number {
  const bounds = trainingWindowBounds(player.birthDate)
  const windowStart = bounds.start
  const windowEnd = bounds.end
  const now = asOf.getTime()

  const relevant: Interval[] = []
  for (const c of player.contracts) {
    if (!categories.includes(c.clubCategory)) continue
    relevant.push({
      start: parseDate(c.startDate).getTime(),
      end: parseDate(c.endDate).getTime(),
    })
  }
  const merged = mergeIntervals(relevant)

  let count = 0
  const firstYear = seasonStartYear(new Date(windowStart))
  const lastYear = seasonStartYear(new Date(windowEnd - 1))
  for (let y = firstYear; y <= lastYear; y++) {
    const season = seasonBounds(y)
    if (season.end > now) continue // Saison noch nicht abgeschlossen.
    if (season.end <= windowStart || season.start >= windowEnd) continue
    const covered = merged.some(
      (iv) =>
        iv.start <= season.start + SEASON_JOIN_GRACE_MS && iv.end >= season.end,
    )
    if (covered) count++
  }
  return count
}

/** Mindestanzahl voller Saisons (Alternative zu 36 Monaten). */
export const TRAINED_MIN_SEASONS = 3

// ---------------------------------------------------------------------------
// UEFA-Kategorien
// ---------------------------------------------------------------------------

/**
 * Club-Trained (Art. 30.02): entweder min. 36 Monate ODER min. 3 volle
 * Saisons beim FC_SALZBURG zwischen 15 und 21 (Stichtag `asOf`, Standard:
 * heute). (Liefering/Akademie zaehlen NICHT, da sie ASSOCIATION_CLUB sind.)
 */
export function isClubTrained(player: Player, asOf: Date = new Date()): boolean {
  return (
    monthsInTrainingWindow(player, ['FC_SALZBURG'], asOf) >= TRAINED_MIN_MONTHS ||
    countFullSeasonsInWindow(player, ['FC_SALZBURG'], asOf) >= TRAINED_MIN_SEASONS
  )
}

/**
 * Association-Trained (Art. 30.03): entweder min. 36 Monate ODER min. 3 volle
 * Saisons beim FC_SALZBURG oder einem Verbandsverein (OEFB) zwischen 15 und
 * 21 (Stichtag `asOf`, Standard: heute).
 */
export function isAssociationTrained(
  player: Player,
  asOf: Date = new Date(),
): boolean {
  const categories: ClubCategory[] = ['FC_SALZBURG', 'ASSOCIATION_CLUB']
  return (
    monthsInTrainingWindow(player, categories, asOf) >= TRAINED_MIN_MONTHS ||
    countFullSeasonsInWindow(player, categories, asOf) >= TRAINED_MIN_SEASONS
  )
}

/** Locally-Trained = Club-Trained ODER Association-Trained. */
export function isLocallyTrained(
  player: Player,
  asOf: Date = new Date(),
): boolean {
  return isClubTrained(player, asOf) || isAssociationTrained(player, asOf)
}

/** Liefert die UEFA-Ausbildungskategorie (CTP hat Vorrang vor ATP). */
export function getUefaCategory(
  player: Player,
  asOf: Date = new Date(),
): UefaCategory {
  if (isClubTrained(player, asOf)) return 'CTP'
  if (isAssociationTrained(player, asOf)) return 'ATP'
  return 'NON_LOCAL'
}

// ---------------------------------------------------------------------------
// Projektion: kann ein Status noch erreicht werden - und wann?
// ---------------------------------------------------------------------------

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Addiert eine (auch gebrochene) Anzahl Monate zu einem Datum (UTC). */
function addMonthsToDate(date: Date, months: number): Date {
  const whole = Math.floor(months)
  const fracDays = Math.round((months - whole) * 30)
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + whole,
      date.getUTCDate() + fracDays,
    ),
  )
}

/**
 * Ermittelt das frueheste Datum, an dem im Ausbildungsfenster (15-21) die
 * geforderten Monate fuer die angegebenen Kategorien erreicht werden - auf
 * Basis ALLER (auch zukuenftig vertraglich gebundenen) Vertragsphasen.
 * Gibt null zurueck, wenn die Schwelle bis zum 21. Geburtstag nie erreicht wird.
 */
export function dateStatusReached(
  player: Player,
  categories: ClubCategory[],
  thresholdMonths: number = TRAINED_MIN_MONTHS,
): Date | null {
  const bounds = trainingWindowBounds(player.birthDate)
  const windowStart = bounds.start
  const windowEnd = bounds.end

  const relevant: Interval[] = []
  for (const c of player.contracts) {
    if (!categories.includes(c.clubCategory)) continue
    const clipped = clip(
      {
        start: parseDate(c.startDate).getTime(),
        end: parseDate(c.endDate).getTime(),
      },
      windowStart,
      windowEnd,
    )
    if (clipped) relevant.push(clipped)
  }

  let acc = 0
  for (const iv of mergeIntervals(relevant)) {
    const ivStart = new Date(iv.start)
    const ivMonths = monthsBetween(ivStart, new Date(iv.end))
    if (acc + ivMonths >= thresholdMonths) {
      return addMonthsToDate(ivStart, thresholdMonths - acc)
    }
    acc += ivMonths
  }
  return null
}

export interface UefaProjection {
  current: UefaCategory
  /** True, wenn zum Stichtag ein besserer Ausbildungsstatus noch erreichbar ist. */
  canImprove: boolean
  /** Der zukuenftig erreichbare Ausbildungsstatus (falls canImprove). */
  futureStatus?: UefaCategory
  /** Datum, an dem der zukuenftige Ausbildungsstatus erreicht wird (ISO YYYY-MM-DD). */
  date?: string
  /** Bereits B-Listen-berechtigt zum Stichtag. */
  listBEligible: boolean
  /**
   * Fruehestes Datum, an dem die B-Listen-Berechtigung laut Vertragshistorie
   * erreicht wird (ISO). Nur gesetzt, wenn noch nicht berechtigt und vertraglich
   * erreichbar.
   */
  listBDate?: string
}

/**
 * Fruehestes Datum, an dem ein Spieler die B-Listen-Bedingungen erfuellt
 * (auf Basis aller Vertragsphasen, auch zukuenftiger). Null, wenn die
 * Altersgrenze nicht passt oder die 2-/3-Jahres-Schwelle nie erreicht wird.
 */
export function dateListBReached(
  player: Player,
  birthCutoff: string = LIST_B_BIRTH_CUTOFF,
): Date | null {
  if (parseDate(player.birthDate) < parseDate(birthCutoff)) return null

  const birth = parseDate(player.birthDate)
  const since15 = addYears(birth, TRAINING_WINDOW_START_AGE).getTime()
  const candidates: number[] = []

  // (a) Ununterbrochen 2 Jahre FC Salzburg seit dem 15. Geburtstag.
  const clubIvs: Interval[] = []
  for (const c of player.contracts) {
    if (c.clubCategory !== 'FC_SALZBURG') continue
    const clipped = clip(
      {
        start: parseDate(c.startDate).getTime(),
        end: parseDate(c.endDate).getTime(),
      },
      since15,
      Number.POSITIVE_INFINITY,
    )
    if (clipped) clubIvs.push(clipped)
  }
  for (const iv of mergeIntervals(clubIvs)) {
    if (monthsBetween(new Date(iv.start), new Date(iv.end)) >= 24) {
      candidates.push(addMonthsToDate(new Date(iv.start), 24).getTime())
    }
  }

  // (b) 3 Jahre mit max. 1 Leihe an Verbandsverein (<= 1 Jahr).
  interface Segment {
    start: number
    end: number
    isLoan: boolean
  }
  const segments: Segment[] = []
  for (const c of player.contracts) {
    const s0 = parseDate(c.startDate).getTime()
    const e0 = parseDate(c.endDate).getTime()
    if (c.clubCategory === 'FC_SALZBURG') {
      const clipped = clip({ start: s0, end: e0 }, since15, Number.POSITIVE_INFINITY)
      if (clipped) segments.push({ ...clipped, isLoan: false })
    } else if (
      c.isLoan &&
      c.clubCategory === 'ASSOCIATION_CLUB' &&
      monthsBetween(new Date(s0), new Date(e0)) <= 12
    ) {
      const clipped = clip({ start: s0, end: e0 }, since15, Number.POSITIVE_INFINITY)
      if (clipped) segments.push({ ...clipped, isLoan: true })
    }
  }
  segments.sort((a, b) => a.start - b.start)

  let i = 0
  while (i < segments.length) {
    const chainStart = segments[i].start
    let chainEnd = segments[i].end
    const loanSegs: Segment[] = segments[i].isLoan ? [segments[i]] : []
    let j = i + 1
    while (j < segments.length && segments[j].start <= chainEnd + ONE_DAY_MS) {
      chainEnd = Math.max(chainEnd, segments[j].end)
      if (segments[j].isLoan) loanSegs.push(segments[j])
      j++
    }

    if (monthsBetween(new Date(chainStart), new Date(chainEnd)) >= 36) {
      if (loanSegs.length <= 1) {
        candidates.push(addMonthsToDate(new Date(chainStart), 36).getTime())
      } else {
        const candidateStarts = [chainStart, ...loanSegs.map((l) => l.end)]
        for (const t of candidateStarts) {
          const end = addYears(new Date(t), 3).getTime()
          if (end > chainEnd + ONE_DAY_MS) continue
          const loansInWindow = loanSegs.filter(
            (l) => l.start < end && l.end > t,
          ).length
          if (loansInWindow <= 1) candidates.push(end)
        }
      }
    }
    i = j
  }

  // (c) 16-Jahres-Ausnahme: 2 Jahre ununterbrochen (auch vor dem 15.),
  // berechtigt sobald der Spieler 16 ist und die 2 Jahre erfuellt sind.
  const age16 = addYears(birth, 16).getTime()
  const age17 = addYears(birth, 17).getTime()
  const earlyClub: Interval[] = []
  for (const c of player.contracts) {
    if (c.clubCategory !== 'FC_SALZBURG') continue
    const clipped = clip(
      {
        start: parseDate(c.startDate).getTime(),
        end: parseDate(c.endDate).getTime(),
      },
      birth.getTime(),
      Number.POSITIVE_INFINITY,
    )
    if (clipped) earlyClub.push(clipped)
  }
  for (const iv of mergeIntervals(earlyClub)) {
    if (monthsBetween(new Date(iv.start), new Date(iv.end)) < 24) continue
    const twoYearsIn = addMonthsToDate(new Date(iv.start), 24).getTime()
    // Berechtigung unter (c) nur waehrend des 16. Lebensjahres.
    const eligibleFrom = Math.max(twoYearsIn, age16)
    if (eligibleFrom < age17 && eligibleFrom <= iv.end) {
      candidates.push(eligibleFrom)
    }
  }

  if (candidates.length === 0) return null
  return new Date(Math.min(...candidates))
}

/**
 * Projiziert, ob ein Spieler ausgehend von seiner aktuellen Vertragslage noch
 * einen (besseren) UEFA-Ausbildungsstatus und/oder die B-Liste erreichen kann
 * und wann. Bewertung des aktuellen Status zum Stichtag `asOf` (Standard: heute).
 */
export function projectUefaStatus(
  player: Player,
  asOf: Date = new Date(),
): UefaProjection {
  const current = getUefaCategory(player, asOf)
  const listBEligible = isListBEligible(player, LIST_B_BIRTH_CUTOFF, asOf)
  const listBReached = dateListBReached(player)
  const listBDate =
    !listBEligible && listBReached && listBReached.getTime() > asOf.getTime()
      ? toISODate(listBReached)
      : undefined

  const base = { listBEligible, listBDate }

  if (current === 'CTP') {
    return { current, canImprove: false, ...base }
  }

  if (current === 'ATP') {
    const d = dateStatusReached(player, ['FC_SALZBURG'])
    if (d && d.getTime() > asOf.getTime()) {
      return {
        current,
        canImprove: true,
        futureStatus: 'CTP',
        date: toISODate(d),
        ...base,
      }
    }
    return { current, canImprove: false, ...base }
  }

  // current === 'NON_LOCAL'
  const d = dateStatusReached(player, ['FC_SALZBURG', 'ASSOCIATION_CLUB'])
  if (d && d.getTime() > asOf.getTime()) {
    return {
      current,
      canImprove: true,
      futureStatus: getUefaCategory(player, d),
      date: toISODate(d),
      ...base,
    }
  }
  return { current, canImprove: false, ...base }
}

/** Formatiert ein Date als ISO-Datum (YYYY-MM-DD, UTC). */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// B-Listen-Berechtigung (Artikel 31)
// ---------------------------------------------------------------------------

/**
 * Prueft die B-Listen-Berechtigung gemaess Artikel 31 (CL 2026/27), bewertet
 * zum Stichtag `asOf` (Standard: heute; nur bereits abgeleistete Zeit zaehlt):
 *
 * Der Spieler ist berechtigt, wenn er geboren an/nach dem Stichtag ist (Standard
 * 1.1.2005) UND eine der folgenden Bedingungen erfuellt:
 *   (a) seit dem 15. Geburtstag IRGENDEINEN ununterbrochenen Zeitraum von
 *       2 Jahren beim FC Salzburg registriert war (nicht zwingend fortlaufend
 *       bis heute; auch ein abgeschlossener 2-Jahres-Zeitraum genuegt), ODER
 *   (b) seit dem 15. Geburtstag 3 aufeinanderfolgende Jahre beim FC Salzburg
 *       war, wobei EINE Leihe (an einen Verbandsverein, max. 1 Jahr) die
 *       Durchgaengigkeit nicht unterbricht, ODER
 *   (c) Ausnahme: er ist aktuell 16 Jahre alt und war die letzten 2 Jahre
 *       ununterbrochen beim FC Salzburg registriert (Zaehlung darf hier vor
 *       dem 15. Geburtstag beginnen).
 */
export function isListBEligible(
  player: Player,
  birthCutoff: string = LIST_B_BIRTH_CUTOFF,
  asOf: Date = new Date(),
): boolean {
  // 1) Altersgrenze: geboren an/nach dem Stichtag.
  if (parseDate(player.birthDate) < parseDate(birthCutoff)) return false

  const birth = parseDate(player.birthDate)
  const since15 = addYears(birth, TRAINING_WINDOW_START_AGE).getTime()
  const now = asOf.getTime()

  // Zusammengefuehrte FC-Salzburg-Registrierungszeiten ("eligible to play for
  // the club") ab `windowStart`, begrenzt auf den Stichtag.
  const clubIntervals = (windowStart: number): Interval[] => {
    const ivs: Interval[] = []
    for (const c of player.contracts) {
      if (c.clubCategory !== 'FC_SALZBURG') continue
      const clipped = clip(
        {
          start: parseDate(c.startDate).getTime(),
          end: parseDate(c.endDate).getTime(),
        },
        windowStart,
        now,
      )
      if (clipped) ivs.push(clipped)
    }
    return mergeIntervals(ivs)
  }

  // (a) Ununterbrochen 2 Jahre beim Verein seit dem 15. Geburtstag.
  for (const iv of clubIntervals(since15)) {
    if (monthsBetween(new Date(iv.start), new Date(iv.end)) >= 24) return true
  }

  // (c) Ausnahme fuer aktuell 16-Jaehrige: die letzten 2 Jahre ununterbrochen
  // beim Verein registriert (Zaehlung darf vor dem 15. Geburtstag beginnen).
  if (getAge(player.birthDate, asOf) === 16) {
    const twoYearsAgo = addYears(asOf, -2).getTime()
    for (const iv of clubIntervals(birth.getTime())) {
      if (iv.start <= twoYearsAgo && iv.end >= now - ONE_DAY_MS) return true
    }
  }

  // (b) 3 aufeinanderfolgende Jahre beim Verein mit max. 1 Leihe (an einen
  // Verbandsverein, max. 1 Jahr). FC-Salzburg-Zeiten plus qualifizierende
  // Leihen muessen eine durchgehende 3-Jahres-Spanne abdecken.
  interface Segment {
    start: number
    end: number
    isLoan: boolean
  }
  const segments: Segment[] = []
  for (const c of player.contracts) {
    const s0 = parseDate(c.startDate).getTime()
    const e0 = parseDate(c.endDate).getTime()
    if (c.clubCategory === 'FC_SALZBURG') {
      const clipped = clip({ start: s0, end: e0 }, since15, now)
      if (clipped) segments.push({ ...clipped, isLoan: false })
    } else if (
      c.isLoan &&
      c.clubCategory === 'ASSOCIATION_CLUB' &&
      monthsBetween(new Date(s0), new Date(e0)) <= 12
    ) {
      const clipped = clip({ start: s0, end: e0 }, since15, now)
      if (clipped) segments.push({ ...clipped, isLoan: true })
    }
  }
  segments.sort((a, b) => a.start - b.start)

  let i = 0
  while (i < segments.length) {
    const chainStart = segments[i].start
    let chainEnd = segments[i].end
    const loanSegs: Segment[] = segments[i].isLoan ? [segments[i]] : []
    let j = i + 1
    while (j < segments.length && segments[j].start <= chainEnd + ONE_DAY_MS) {
      chainEnd = Math.max(chainEnd, segments[j].end)
      if (segments[j].isLoan) loanSegs.push(segments[j])
      j++
    }

    if (monthsBetween(new Date(chainStart), new Date(chainEnd)) >= 36) {
      // Bei hoechstens einer Leihe in der gesamten Kette direkt erfuellt.
      if (loanSegs.length <= 1) return true
      // Bei mehreren Leihen: existiert ein 3-Jahres-Fenster mit max. 1 Leihe?
      const candidateStarts = [chainStart, ...loanSegs.map((l) => l.end)]
      for (const t of candidateStarts) {
        const end = addYears(new Date(t), 3).getTime()
        if (end > chainEnd + ONE_DAY_MS) continue
        const loansInWindow = loanSegs.filter(
          (l) => l.start < end && l.end > t,
        ).length
        if (loansInWindow <= 1) return true
      }
    }
    i = j
  }

  return false
}

/** True, wenn der Spieler ueber das Geburtsdatum fuer die B-Liste jung genug ist. */
export function isU21ForListB(
  player: Player,
  birthCutoff: string = LIST_B_BIRTH_CUTOFF,
): boolean {
  return parseDate(player.birthDate) >= parseDate(birthCutoff)
}

// ---------------------------------------------------------------------------
// A-Listen-Validierung (Artikel 30 / 31)
// ---------------------------------------------------------------------------

export interface ListAValidation {
  total: number
  /** Effektiv erlaubtes Maximum (25, reduziert bei < 8 anrechenbaren LTP). */
  maxAllowed: number
  /** Max. Non-Locally-Plaetze = maxAllowed minus alle CTP/ATP auf der Liste. */
  nonLocalMax: number
  goalkeepers: number
  /** Torhüter auf A- und B-Liste zusammen. */
  goalkeepersTotal: number
  clubTrained: number
  associationTrained: number
  locallyTrained: number
  /** Anrechenbare LTP (association-trained auf 4 gedeckelt), max. 8 relevant. */
  effectiveLocallyTrained: number
  errors: string[]
  warnings: string[]
  isValid: boolean
}

/**
 * Validiert A-Liste (und optional B-Liste fuer die Gesamt-Torhüter-Regel)
 * gegen Art. 30/31. Liefert Kennzahlen sowie Fehler (hart) und Warnungen.
 */
export function validateListA(
  players: Player[],
  asOf: Date = new Date(),
  listB: Player[] = [],
): ListAValidation {
  const total = players.length
  const goalkeepers = players.filter((p) => p.position === 'GK').length
  const goalkeepersTotal =
    goalkeepers + listB.filter((p) => p.position === 'GK').length

  let clubTrained = 0
  let associationTrained = 0
  for (const p of players) {
    const cat = getUefaCategory(p, asOf)
    if (cat === 'CTP') clubTrained++
    else if (cat === 'ATP') associationTrained++
  }
  const locallyTrained = clubTrained + associationTrained

  const countedAssociation = Math.min(associationTrained, ASSOCIATION_TRAINED_MAX)
  const effectiveLocallyTrained = clubTrained + countedAssociation

  const shortfall = Math.max(
    0,
    LOCALLY_TRAINED_REQUIRED - Math.min(effectiveLocallyTrained, LOCALLY_TRAINED_REQUIRED),
  )
  const maxAllowed = LIST_A_MAX - shortfall
  // Alle CTP/ATP belegen A-Listen-Plaetze - auch ATP ueber die 4 anrechenbaren hinaus.
  const nonLocalMax = Math.max(0, maxAllowed - clubTrained - associationTrained)

  const errors: string[] = []
  const warnings: string[] = []

  if (total > LIST_A_MAX) {
    errors.push(
      `A-Liste überschreitet das Maximum von ${LIST_A_MAX} Spielern (aktuell ${total}).`,
    )
  } else if (total > maxAllowed) {
    errors.push(
      `A-Liste auf ${maxAllowed} Plätze reduziert (zu wenige locally-trained Spieler), aktuell ${total}.`,
    )
  }

  if (goalkeepers < GOALKEEPERS_REQUIRED) {
    errors.push(
      `Mindestens ${GOALKEEPERS_REQUIRED} Torhüter auf der A-Liste erforderlich (aktuell ${goalkeepers}).`,
    )
  }

  if (goalkeepersTotal < GOALKEEPERS_TOTAL_REQUIRED) {
    errors.push(
      `Mindestens ${GOALKEEPERS_TOTAL_REQUIRED} Torhüter insgesamt (A- und B-Liste) erforderlich (aktuell ${goalkeepersTotal}).`,
    )
  }

  if (effectiveLocallyTrained < LOCALLY_TRAINED_REQUIRED) {
    warnings.push(
      `Nur ${effectiveLocallyTrained} anrechenbare locally-trained Spieler (min. ${LOCALLY_TRAINED_REQUIRED}). Freie Plätze werden gesperrt.`,
    )
  }

  if (clubTrained < ASSOCIATION_TRAINED_MAX) {
    warnings.push(
      `Nur ${clubTrained} club-trained Spieler (davon min. ${ASSOCIATION_TRAINED_MAX} innerhalb der 8 locally-trained empfohlen).`,
    )
  }

  if (associationTrained > ASSOCIATION_TRAINED_MAX) {
    warnings.push(
      `${associationTrained} association-trained Spieler vorhanden, aber nur ${ASSOCIATION_TRAINED_MAX} zählen auf die 8 reservierten Plätze.`,
    )
  }

  return {
    total,
    maxAllowed,
    nonLocalMax,
    goalkeepers,
    goalkeepersTotal,
    clubTrained,
    associationTrained,
    locallyTrained,
    effectiveLocallyTrained,
    errors,
    warnings,
    isValid: errors.length === 0,
  }
}
