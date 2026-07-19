import { describe, it, expect } from 'vitest'
import type { ContractPeriod, Player, Position } from '@/types'
import {
  addYears,
  countFullSeasonsInWindow,
  dateListBReached,
  dateStatusReached,
  getAge,
  getUefaCategory,
  isAssociationTrained,
  isClubTrained,
  isListBEligible,
  isLocallyTrained,
  isU21ForListB,
  LIST_B_BIRTH_CUTOFF,
  monthsBetween,
  monthsInTrainingWindow,
  parseDate,
  projectUefaStatus,
  validateListA,
} from './uefaUtils'

// --- Test-Helfer -----------------------------------------------------------

let idCounter = 0
function contract(
  partial: Partial<ContractPeriod> & Pick<ContractPeriod, 'startDate' | 'endDate' | 'clubCategory'>,
): ContractPeriod {
  return {
    id: `c${idCounter++}`,
    clubId: partial.clubId ?? 'club',
    clubName: partial.clubName ?? 'Club',
    isLoan: partial.isLoan ?? false,
    ...partial,
  }
}

function player(partial: Partial<Player> & Pick<Player, 'birthDate'>): Player {
  return {
    id: `p${idCounter++}`,
    name: partial.name ?? 'Test Player',
    position: partial.position ?? 'MID',
    isDummy: partial.isDummy ?? false,
    contracts: partial.contracts ?? [],
    ...partial,
  }
}

// Born 2000-06-15 -> training window 2015-06-15 .. 2021-06-15
function makeCtp(pos: Position = 'MID'): Player {
  return player({
    name: 'CTP',
    birthDate: '2000-06-15',
    position: pos,
    contracts: [
      contract({
        startDate: '2015-06-15',
        endDate: '2019-06-15',
        clubCategory: 'FC_SALZBURG',
      }),
    ],
  })
}

function makeAtp(pos: Position = 'MID'): Player {
  return player({
    name: 'ATP',
    birthDate: '2000-06-15',
    position: pos,
    contracts: [
      contract({
        startDate: '2015-06-15',
        endDate: '2019-06-15',
        clubCategory: 'ASSOCIATION_CLUB',
        clubName: 'FC Liefering',
      }),
    ],
  })
}

function makeNonLocal(pos: Position = 'MID'): Player {
  return player({
    name: 'Non-Local',
    birthDate: '2000-06-15',
    position: pos,
    contracts: [
      contract({
        startDate: '2015-06-15',
        endDate: '2019-06-15',
        clubCategory: 'FOREIGN_CLUB',
      }),
    ],
  })
}

// --- Datums-Helfer ---------------------------------------------------------

describe('Datums-Helfer', () => {
  it('monthsBetween: 3 volle Jahre = exakt 36 Monate', () => {
    expect(monthsBetween(parseDate('2015-06-15'), parseDate('2018-06-15'))).toBe(36)
  })

  it('monthsBetween: negativer Bereich = 0', () => {
    expect(monthsBetween(parseDate('2020-01-01'), parseDate('2019-01-01'))).toBe(0)
  })

  it('addYears addiert ganze Jahre', () => {
    expect(addYears(parseDate('2000-06-15'), 15).toISOString()).toContain('2015-06-15')
  })

  it('getAge berechnet Alter zum Stichtag', () => {
    expect(getAge('2005-01-01', parseDate('2026-01-01'))).toBe(21)
    expect(getAge('2005-06-15', parseDate('2026-01-01'))).toBe(20)
  })
})

// --- Ausbildungsfenster ----------------------------------------------------

describe('monthsInTrainingWindow', () => {
  it('zaehlt nur Zeiten innerhalb des 15-21-Fensters', () => {
    const p = player({
      birthDate: '2000-06-15',
      contracts: [
        // Vor dem 15. Geburtstag -> darf nicht zaehlen
        contract({ startDate: '2010-01-01', endDate: '2014-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(monthsInTrainingWindow(p, ['FC_SALZBURG'])).toBe(0)
  })

  it('bereinigt ueberlappende Phasen (kein Doppelzaehlen)', () => {
    const p = player({
      birthDate: '2000-06-15',
      contracts: [
        contract({ startDate: '2015-06-15', endDate: '2018-06-15', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2017-06-15', endDate: '2019-06-15', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    // Zusammengefuehrt 2015-06-15 .. 2019-06-15 = 48 Monate
    expect(monthsInTrainingWindow(p, ['FC_SALZBURG'])).toBe(48)
  })
})

// --- Club-/Association-/Locally-Trained ------------------------------------

describe('Ausbildungskategorien', () => {
  it('CTP: 36+ Monate FC_SALZBURG zwischen 15 und 21', () => {
    const p = makeCtp()
    expect(isClubTrained(p)).toBe(true)
    expect(isAssociationTrained(p)).toBe(true)
    expect(getUefaCategory(p)).toBe('CTP')
  })

  it('Liefering zaehlt NICHT als club-trained, aber als association-trained', () => {
    const p = makeAtp()
    expect(isClubTrained(p)).toBe(false)
    expect(isAssociationTrained(p)).toBe(true)
    expect(getUefaCategory(p)).toBe('ATP')
  })

  it('Auslaendischer Verein -> non-locally trained', () => {
    const p = makeNonLocal()
    expect(isClubTrained(p)).toBe(false)
    expect(isAssociationTrained(p)).toBe(false)
    expect(isLocallyTrained(p)).toBe(false)
    expect(getUefaCategory(p)).toBe('NON_LOCAL')
  })

  it('Drei-Saisons-Alternative: gilt auch mit < 36 Monaten (Praxisfall Konaté)', () => {
    // *21.03.2004; seit 15.07.2022 bei Salzburg (vor Saisonstart 22.07.2022).
    // 21. Geburtstag: 21.03.2025, waehrend Saison 2024/25 -> zaehlt nach Regel
    // noch mit. 3 volle Saisons (22/23, 23/24, 24/25) durchgehend registriert,
    // aber nur ca. 32 Monate Kalenderzeit -> ueber die 36-Monats-Schwelle NICHT
    // club-trained, aber ueber "3 entire seasons" (Art. 30.02) SCHON.
    const p = player({
      birthDate: '2004-03-21',
      contracts: [
        contract({
          startDate: '2022-07-15',
          endDate: '2028-06-30',
          clubCategory: 'FC_SALZBURG',
        }),
      ],
    })
    const asOf = parseDate('2026-07-16')
    expect(monthsInTrainingWindow(p, ['FC_SALZBURG'], asOf)).toBeLessThan(36)
    expect(countFullSeasonsInWindow(p, ['FC_SALZBURG'], asOf)).toBeGreaterThanOrEqual(3)
    expect(isClubTrained(p, asOf)).toBe(true)
    expect(getUefaCategory(p, asOf)).toBe('CTP')
  })

  it('Drei-Saisons-Alternative greift nicht bei nur 2 vollen Saisons', () => {
    const p = player({
      birthDate: '2007-03-21',
      contracts: [
        contract({
          startDate: '2025-07-15',
          endDate: '2028-06-30',
          clubCategory: 'FC_SALZBURG',
        }),
      ],
    })
    const asOf = parseDate('2026-07-16')
    expect(countFullSeasonsInWindow(p, ['FC_SALZBURG'], asOf)).toBeLessThan(3)
    expect(isClubTrained(p, asOf)).toBe(false)
  })

  it('36-Monats-Grenze: 35 Monate reichen nicht', () => {
    const p = player({
      birthDate: '2000-06-15',
      contracts: [
        contract({ startDate: '2015-06-15', endDate: '2018-05-15', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(monthsInTrainingWindow(p, ['FC_SALZBURG'])).toBeCloseTo(35, 5)
    expect(isClubTrained(p)).toBe(false)
  })

  it('genau 36 Monate reichen aus', () => {
    const p = player({
      birthDate: '2000-06-15',
      contracts: [
        contract({ startDate: '2015-06-15', endDate: '2018-06-15', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isClubTrained(p)).toBe(true)
  })

  it('zaehlt nur bereits abgeleistete Zeit (Bewertung zum heutigen Datum)', () => {
    // Spieler ist zum Stichtag erst ~17 und seit dem 15. Geburtstag beim
    // FC Salzburg, Vertrag laeuft aber noch bis 2029. Es duerfen nur die
    // bis zum Stichtag abgeleisteten Monate zaehlen.
    const asOf = parseDate('2026-01-01')
    const p = player({
      birthDate: '2009-01-01', // 15. Geburtstag 2024-01-01
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2029-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(monthsInTrainingWindow(p, ['FC_SALZBURG'], asOf)).toBeCloseTo(24, 5)
    expect(isClubTrained(p, asOf)).toBe(false)
    // Ohne Stichtag-Begrenzung waere es faelschlich als CTP gewertet.
    expect(getUefaCategory(p, asOf)).toBe('NON_LOCAL')
  })

  it('kombiniert FC_SALZBURG + Verbandsverein fuer ATP', () => {
    const p = player({
      birthDate: '2000-06-15',
      contracts: [
        contract({ startDate: '2015-06-15', endDate: '2017-06-15', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2017-06-15', endDate: '2019-06-15', clubCategory: 'ASSOCIATION_CLUB' }),
      ],
    })
    expect(isClubTrained(p)).toBe(false) // nur 24 Monate FC_SALZBURG
    expect(isAssociationTrained(p)).toBe(true) // 48 Monate kombiniert
    expect(getUefaCategory(p)).toBe('ATP')
  })
})

// --- B-Listen-Berechtigung -------------------------------------------------

describe('U21 / B-Listen-Stichtag', () => {
  it('geboren am Stichtag ist berechtigt', () => {
    expect(isU21ForListB(player({ birthDate: '2005-01-01' }))).toBe(true)
  })
  it('geboren einen Tag vor Stichtag ist nicht berechtigt', () => {
    expect(isU21ForListB(player({ birthDate: '2004-12-31' }))).toBe(false)
  })
})

describe('isListBEligible', () => {
  it('zu alt -> nie berechtigt', () => {
    const p = player({
      birthDate: '2003-01-01',
      contracts: [
        contract({ startDate: '2018-01-01', endDate: '2024-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p)).toBe(false)
  })

  it('(a) 2 Jahre ununterbrochen FC_SALZBURG seit dem 15. Geburtstag', () => {
    const p = player({
      birthDate: '2006-01-01', // 15. Geburtstag 2021-01-01
      contracts: [
        contract({ startDate: '2021-01-01', endDate: '2023-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p)).toBe(true)
  })

  it('nur 1 Jahr FC_SALZBURG reicht nicht', () => {
    const p = player({
      birthDate: '2006-01-01',
      contracts: [
        contract({ startDate: '2021-01-01', endDate: '2022-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p)).toBe(false)
  })

  it('(b) 3 Jahre mit einer kurzen Leihe an einen Verbandsverein', () => {
    const p = player({
      birthDate: '2006-01-01',
      contracts: [
        contract({ startDate: '2021-01-01', endDate: '2022-06-30', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2022-07-01', endDate: '2023-06-30', clubCategory: 'ASSOCIATION_CLUB', isLoan: true }),
        contract({ startDate: '2023-07-01', endDate: '2024-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p)).toBe(true)
  })

  it('Leihe laenger als 1 Jahr bricht die (b)-Regel', () => {
    const p = player({
      birthDate: '2006-01-01',
      contracts: [
        contract({ startDate: '2021-01-01', endDate: '2021-06-30', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2021-07-01', endDate: '2023-01-01', clubCategory: 'ASSOCIATION_CLUB', isLoan: true }),
        contract({ startDate: '2023-01-02', endDate: '2024-06-30', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p)).toBe(false)
  })

  it('(a) abgeschlossener 2-Jahres-Zeitraum zaehlt auch bei spaeterem Wechsel', () => {
    // 2 Jahre ununterbrochen beim Verein, danach Auslandswechsel: bleibt B-faehig.
    const asOf = parseDate('2026-06-15')
    const p = player({
      birthDate: '2007-06-01', // 15. Geburtstag 2022-06-01
      contracts: [
        contract({ startDate: '2022-06-01', endDate: '2024-06-01', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2024-06-01', endDate: '2026-06-01', clubCategory: 'FOREIGN_CLUB' }),
      ],
    })
    expect(isListBEligible(p, undefined, asOf)).toBe(true)
  })

  it('nur Zeit ab dem 15. Geburtstag zaehlt (Phase 14-16 = nur 1 Jahr anrechenbar)', () => {
    const asOf = parseDate('2026-09-01')
    const p = player({
      birthDate: '2009-06-01', // 15. Geburtstag 2024-06-01
      contracts: [
        contract({ startDate: '2023-06-01', endDate: '2025-06-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    // Nur 2024-06-01 .. 2025-06-01 = 12 Monate zaehlen, Spieler ist 17 (keine 16-Ausnahme).
    expect(isListBEligible(p, undefined, asOf)).toBe(false)
  })

  it('(c) Ausnahme: 16-Jaehriger mit 2 Jahren ununterbrochen beim Verein', () => {
    const asOf = parseDate('2026-06-01')
    const p = player({
      birthDate: '2010-01-01', // am Stichtag 16 Jahre alt
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2027-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p, undefined, asOf)).toBe(true)
  })

  it('(c) Ausnahme greift nicht bei nur 1 Jahr Vereinszugehoerigkeit', () => {
    const asOf = parseDate('2026-06-01')
    const p = player({
      birthDate: '2010-01-01',
      contracts: [
        contract({ startDate: '2025-06-01', endDate: '2027-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p, undefined, asOf)).toBe(false)
  })

  it('Leihe an einen Auslandsverein unterbricht die 3-Jahres-Regel', () => {
    const asOf = parseDate('2026-06-01')
    const p = player({
      birthDate: '2007-01-01',
      contracts: [
        contract({ startDate: '2022-01-01', endDate: '2023-06-30', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2023-07-01', endDate: '2024-06-30', clubCategory: 'FOREIGN_CLUB', isLoan: true }),
        contract({ startDate: '2024-07-01', endDate: '2025-06-30', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(isListBEligible(p, undefined, asOf)).toBe(false)
  })

  it('(b) zwei Verbandsleihen: gueltiges 3-Jahres-Fenster mit nur 1 Leihe genuegt', () => {
    const asOf = parseDate('2026-06-01')
    const p = player({
      birthDate: '2005-01-01', // 15. Geburtstag 2020-01-01
      contracts: [
        contract({ startDate: '2020-01-01', endDate: '2021-06-30', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2021-07-01', endDate: '2022-06-30', clubCategory: 'ASSOCIATION_CLUB', isLoan: true }),
        contract({ startDate: '2022-07-01', endDate: '2023-06-30', clubCategory: 'FC_SALZBURG' }),
        contract({ startDate: '2023-07-01', endDate: '2024-06-30', clubCategory: 'ASSOCIATION_CLUB', isLoan: true }),
        contract({ startDate: '2024-07-01', endDate: '2025-06-30', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    // Kein 2-Jahres-Vereinsblock (a), aber z. B. 2020-01-01..2023-01-01 = 3 Jahre mit nur 1 Leihe.
    expect(isListBEligible(p, undefined, asOf)).toBe(true)
  })
})

// --- Projektion: Status erreichbar? ---------------------------------------

describe('projectUefaStatus', () => {
  it('NON_LOCAL kann CTP erreichen (Datum wird berechnet)', () => {
    const asOf = parseDate('2026-01-01')
    const p = player({
      birthDate: '2009-01-01', // 15. Geburtstag 2024-01-01
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2029-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    const proj = projectUefaStatus(p, asOf)
    expect(proj.current).toBe('NON_LOCAL')
    expect(proj.canImprove).toBe(true)
    expect(proj.futureStatus).toBe('CTP')
    expect(proj.date).toBe('2027-01-01') // 36 Monate ab 2024-01-01
  })

  it('NON_LOCAL kann ueber Verbandsverein ATP erreichen', () => {
    const asOf = parseDate('2026-01-01')
    const p = player({
      birthDate: '2009-01-01',
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2029-01-01', clubCategory: 'ASSOCIATION_CLUB' }),
      ],
    })
    const proj = projectUefaStatus(p, asOf)
    expect(proj.canImprove).toBe(true)
    expect(proj.futureStatus).toBe('ATP')
    expect(proj.date).toBe('2027-01-01')
  })

  it('ATP kann spaeter noch CTP erreichen', () => {
    const asOf = parseDate('2026-01-01')
    const p = player({
      birthDate: '2007-01-01', // 15. Geburtstag 2022, 21. Geburtstag 2028
      contracts: [
        contract({ startDate: '2022-01-01', endDate: '2025-01-01', clubCategory: 'ASSOCIATION_CLUB' }),
        contract({ startDate: '2025-01-01', endDate: '2028-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    const proj = projectUefaStatus(p, asOf)
    expect(proj.current).toBe('ATP')
    expect(proj.canImprove).toBe(true)
    expect(proj.futureStatus).toBe('CTP')
    expect(proj.date).toBe('2028-01-01')
  })

  it('nicht erreichbar, wenn bis zum 21. Geburtstag zu wenig Zeit bleibt', () => {
    const asOf = parseDate('2025-01-01')
    const p = player({
      birthDate: '2009-01-01',
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2026-06-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    const proj = projectUefaStatus(p, asOf)
    expect(proj.current).toBe('NON_LOCAL')
    expect(proj.canImprove).toBe(false)
  })

  it('CTP kann sich nicht weiter verbessern', () => {
    const proj = projectUefaStatus(makeCtp())
    expect(proj.current).toBe('CTP')
    expect(proj.canImprove).toBe(false)
  })

  it('dateStatusReached gibt null, wenn Schwelle nie erreicht wird', () => {
    const p = player({
      birthDate: '2009-01-01',
      contracts: [
        contract({ startDate: '2024-01-01', endDate: '2025-01-01', clubCategory: 'FC_SALZBURG' }),
      ],
    })
    expect(dateStatusReached(p, ['FC_SALZBURG'])).toBeNull()
  })
})

describe('List B – Praxisfall Christian Zawieschitzky', () => {
  const asOf = parseDate('2026-07-16')

  it('Salzburg seit 04.09.2024: heute noch keine B-Liste, erreichbar ab 04.09.2026', () => {
    const p = player({
      name: 'Christian Zawieschitzky',
      birthDate: '2007-05-02',
      position: 'GK',
      contracts: [
        contract({
          startDate: '2020-07-01',
          endDate: '2024-09-03',
          clubCategory: 'ASSOCIATION_CLUB',
          clubName: 'FC Liefering',
        }),
        contract({
          startDate: '2024-09-04',
          endDate: '2030-06-30',
          clubCategory: 'FC_SALZBURG',
          clubName: 'FC Red Bull Salzburg',
        }),
      ],
    })
    expect(isListBEligible(p, LIST_B_BIRTH_CUTOFF, asOf)).toBe(false)
    expect(dateListBReached(p)?.toISOString().slice(0, 10)).toBe('2026-09-04')
    const proj = projectUefaStatus(p, asOf)
    expect(proj.listBEligible).toBe(false)
    expect(proj.listBDate).toBe('2026-09-04')
  })

  it('ab 04.09.2026 ist die B-Liste erreicht', () => {
    const p = player({
      birthDate: '2007-05-02',
      position: 'GK',
      contracts: [
        contract({
          startDate: '2024-09-04',
          endDate: '2030-06-30',
          clubCategory: 'FC_SALZBURG',
        }),
      ],
    })
    expect(isListBEligible(p, LIST_B_BIRTH_CUTOFF, parseDate('2026-09-04'))).toBe(
      true,
    )
    expect(projectUefaStatus(p, parseDate('2026-09-04')).listBDate).toBeUndefined()
  })
})

// --- A-Listen-Validierung --------------------------------------------------

describe('validateListA', () => {
  function buildSquad(ctp: number, atp: number, nonLocal: number, gk: number): Player[] {
    const squad: Player[] = []
    for (let i = 0; i < ctp; i++) squad.push(makeCtp(i < gk ? 'GK' : 'DEF'))
    for (let i = 0; i < atp; i++) squad.push(makeAtp('MID'))
    for (let i = 0; i < nonLocal; i++) squad.push(makeNonLocal('FWD'))
    return squad
  }

  it('gueltiger Kader: 25 Spieler, 2 GK auf A + 1 GK auf B', () => {
    const squad = buildSquad(4, 4, 17, 2)
    const listB = [makeCtp('GK')]
    const res = validateListA(squad, new Date(), listB)
    expect(res.total).toBe(25)
    expect(res.maxAllowed).toBe(25)
    expect(res.goalkeepers).toBe(2)
    expect(res.goalkeepersTotal).toBe(3)
    expect(res.nonLocalMax).toBe(17)
    expect(res.clubTrained).toBe(4)
    expect(res.associationTrained).toBe(4)
    expect(res.effectiveLocallyTrained).toBe(8)
    expect(res.errors).toHaveLength(0)
    expect(res.isValid).toBe(true)
  })

  it('mehr als 25 Spieler -> Fehler', () => {
    const squad = buildSquad(4, 4, 18, 2)
    const res = validateListA(squad, new Date(), [makeCtp('GK')])
    expect(res.total).toBe(26)
    expect(res.isValid).toBe(false)
    expect(res.errors.some((e) => e.includes('Maximum'))).toBe(true)
  })

  it('weniger als 2 Torhüter auf A-Liste -> Fehler', () => {
    const squad = buildSquad(4, 4, 17, 0)
    const res = validateListA(squad, new Date(), [makeCtp('GK')])
    expect(res.goalkeepers).toBe(0)
    expect(res.errors.some((e) => e.includes('A-Liste'))).toBe(true)
    expect(res.isValid).toBe(false)
  })

  it('weniger als 3 Torhüter gesamt (A+B) -> Fehler', () => {
    const squad = buildSquad(4, 4, 17, 2)
    const res = validateListA(squad) // keine B-Listen-Torhüter
    expect(res.goalkeepers).toBe(2)
    expect(res.goalkeepersTotal).toBe(2)
    expect(res.errors.some((e) => e.includes('insgesamt'))).toBe(true)
    expect(res.isValid).toBe(false)
  })

  it('zu wenige locally-trained reduzieren das Maximum', () => {
    const squad = buildSquad(2, 0, 6, 2) // 2 CTP -> effektiv 2 LTP
    const res = validateListA(squad, new Date(), [makeCtp('GK')])
    expect(res.effectiveLocallyTrained).toBe(2)
    expect(res.maxAllowed).toBe(19) // 25 - (8 - 2)
    expect(res.nonLocalMax).toBe(17) // 19 - 2 CTP - 0 ATP
    expect(res.total).toBe(8)
    expect(res.isValid).toBe(true)
    expect(res.warnings.length).toBeGreaterThan(0)
  })

  it('association-trained ueber 4 zaehlt nur 4 auf die 8 Plaetze und reduziert Non-Local-Limit', () => {
    const squad = buildSquad(3, 5, 16, 2)
    const res = validateListA(squad, new Date(), [makeCtp('GK')])
    expect(res.clubTrained).toBe(3)
    expect(res.associationTrained).toBe(5)
    // 3 CTP + min(5,4)=4 -> 7 effektiv -> shortfall 1 -> max 24
    expect(res.effectiveLocallyTrained).toBe(7)
    expect(res.maxAllowed).toBe(24)
    // Non-Local-Limit: 24 - 3 - 5 = 16 (5. ATP belegt trotzdem einen Platz)
    expect(res.nonLocalMax).toBe(16)
  })
})
