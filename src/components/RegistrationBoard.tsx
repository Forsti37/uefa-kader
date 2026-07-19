import { forwardRef, useMemo } from 'react'
import { compareByPosition, POSITION_LABELS, type Player } from '@/types'
import { useKaderStore } from '@/store'
import {
  isAssociationTrained,
  isClubTrained,
  isListBEligible,
  isLocallyTrained,
  ASSOCIATION_TRAINED_MAX,
  LIST_A_MAX,
  LOCALLY_TRAINED_REQUIRED,
} from '@/lib/uefaUtils'

// Farben 1:1 aus dem Dark-Theme des Forums (forum.wirsansoizburg.at) uebernommen,
// damit das exportierte Bild nahtlos im Post verschmilzt:
// --body-bg: #1a1a1a, --control-bg: #212121, --text-color: #ddd.
// Kategorienfarben wie in der restlichen App: Club-Trained = gruen (success),
// Association-Trained = gelb (warning), Non-Locally = grau, B-Liste = rot.
const THEME = {
  bg: '#1a1a1a',
  box: '#212121',
  row: '#292929',
  rowMuted: '#1d1d1d',
  border: '#333333',
  text: '#dddddd',
  textMuted: '#999999',
  pillBg: 'rgba(255,255,255,0.09)',
  pillBorder: 'rgba(255,255,255,0.16)',
  pillText: '#cfcfcf',
}

/** Muss identisch zum THEME.bg sein, damit der PNG-Export nahtlos wirkt. */
export const BOARD_BG = THEME.bg

const COLORS = {
  club: 'hsl(142, 60%, 40%)',
  association: 'hsl(38, 92%, 48%)',
  rest: 'hsl(240, 4%, 46%)',
  blist: 'hsl(350, 78%, 50%)',
}

function PlayerRow({
  player,
  labels,
  muted,
}: {
  player: Player
  labels: string[]
  muted?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        height: 30,
        borderRadius: 6,
        border: `1px solid ${THEME.border}`,
        background: muted ? THEME.rowMuted : THEME.row,
        padding: '0 8px',
        fontSize: 14,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          color: muted ? THEME.textMuted : THEME.text,
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: 600 }}>{player.name}</span>{' '}
        <span style={{ color: THEME.textMuted }}>
          {POSITION_LABELS[player.position]}
        </span>
      </span>
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {labels.map((l) => (
          <span
            key={l}
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              lineHeight: 1,
              color: THEME.pillText,
              background: THEME.pillBg,
              border: `1px solid ${THEME.pillBorder}`,
              borderRadius: 4,
              padding: '3px 5px',
              whiteSpace: 'nowrap',
            }}
          >
            {l}
          </span>
        ))}
      </span>
    </div>
  )
}

function Box({
  title,
  accent,
  assigned,
  available,
  labelFor,
  countLabel,
}: {
  title: string
  accent: string
  assigned: Player[]
  available: Player[]
  labelFor: (p: Player) => string[]
  /** z. B. "3/4" statt nur der Anzahl. */
  countLabel: string
}) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${THEME.border}`,
        overflow: 'hidden',
        background: THEME.box,
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: accent,
          color: '#ffffff',
          padding: '7px 11px',
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {title}{' '}
        <span style={{ opacity: 0.85, fontWeight: 600 }}>({countLabel})</span>
      </div>
      <div
        style={{
          padding: 9,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          minHeight: 48,
        }}
      >
        {assigned.map((p) => (
          <PlayerRow key={p.id} player={p} labels={labelFor(p)} />
        ))}
        {assigned.length === 0 && (
          <span style={{ fontSize: 13, color: THEME.textMuted }}>
            Keine Spieler zugeteilt
          </span>
        )}
      </div>
      <div
        style={{
          borderTop: `1px dashed ${THEME.border}`,
          background: 'rgba(0,0,0,0.22)',
          padding: 9,
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            color: THEME.textMuted,
          }}
        >
          Berechtigt, nicht zugeteilt
        </div>
        {available.map((p) => (
          <PlayerRow key={p.id} player={p} labels={labelFor(p)} muted />
        ))}
        {available.length === 0 && (
          <span style={{ fontSize: 13, color: THEME.textMuted }}>-</span>
        )}
      </div>
    </div>
  )
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        color: THEME.textMuted,
      }}
    >
      {children}
    </div>
  )
}

function LegendItem({
  color,
  title,
  desc,
}: {
  color: string
  title: string
  desc: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 3,
          background: color,
          marginTop: 3,
          flexShrink: 0,
        }}
      />
      <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
        <span style={{ fontWeight: 700, color: THEME.text }}>{title}</span>
        <span style={{ color: THEME.textMuted }}> - {desc}</span>
      </div>
    </div>
  )
}

export const RegistrationBoard = forwardRef<
  HTMLDivElement,
  { asOf?: Date }
>(function RegistrationBoard({ asOf = new Date() }, ref) {
  const players = useKaderStore((s) => s.players)
  const draft = useKaderStore((s) => s.draft)

  const groups = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]))
    const resolve = (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p))

    const listA = resolve(draft.listA)
    const listB = resolve(draft.listB)
    const assigned = new Set([...draft.listA, ...draft.listB])
    const available = players.filter((p) => !assigned.has(p.id))
    const byPos = (list: Player[]) => [...list].sort(compareByPosition)

    return {
      clubA: byPos(listA.filter((p) => isClubTrained(p, asOf))),
      assocA: byPos(
        listA.filter(
          (p) => isAssociationTrained(p, asOf) && !isClubTrained(p, asOf),
        ),
      ),
      restA: byPos(listA.filter((p) => !isLocallyTrained(p, asOf))),
      listB: byPos(listB),
      availClub: byPos(available.filter((p) => isClubTrained(p, asOf))),
      availAssoc: byPos(
        available.filter(
          (p) => isAssociationTrained(p, asOf) && !isClubTrained(p, asOf),
        ),
      ),
      availRest: byPos(available.filter((p) => !isLocallyTrained(p, asOf))),
      availB: byPos(
        available.filter((p) => isListBEligible(p, undefined, asOf)),
      ),
      listACount: listA.length,
      listBCount: listB.length,
    }
  }, [players, draft, asOf])

  const countedAssoc = Math.min(groups.assocA.length, ASSOCIATION_TRAINED_MAX)
  const effectiveLtp = groups.clubA.length + countedAssoc
  const ltpShortfall = Math.max(
    0,
    LOCALLY_TRAINED_REQUIRED - Math.min(effectiveLtp, LOCALLY_TRAINED_REQUIRED),
  )
  const maxAllowed = LIST_A_MAX - ltpShortfall
  // ATP ueber die 4 anrechenbaren hinaus belegen trotzdem A-Listen-Plaetze.
  const nonLocalMax = Math.max(
    0,
    maxAllowed - groups.clubA.length - groups.assocA.length,
  )
  // Kurze, fixe Kuerzel statt langer Texte: so bleibt jede Zeile exakt gleich
  // hoch, unabhaengig davon, ob und wie viele Zusatz-Labels ein Spieler hat.
  const dummyLabel = (p: Player) => (p.isDummy ? ['DUMMY'] : [])
  const aListLabels = (p: Player) => [
    ...dummyLabel(p),
    ...(isListBEligible(p, undefined, asOf) ? ['+B'] : []),
  ]
  const bListLabels = (p: Player) => {
    const extra = isClubTrained(p, asOf)
      ? ['+CTP']
      : isAssociationTrained(p, asOf)
        ? ['+ATP']
        : []
    return [...dummyLabel(p), ...extra]
  }

  const stand = asOf.toLocaleDateString('de-AT', { timeZone: 'UTC' })

  return (
    <div
      ref={ref}
      style={{
        width: 920,
        minWidth: 920,
        background: THEME.bg,
        color: THEME.text,
        padding: 0,
        fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 0,
          padding: '12px 12px 8px',
          borderBottom: `3px solid ${COLORS.blist}`,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            FC Red Bull Salzburg - UEFA-Registrierung
          </div>
          <div style={{ fontSize: 13, color: THEME.textMuted }}>
            Champions League 2026/27 - Artikel 30 / 31 - Stand {stand}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700 }}>
          <div>
            A-Liste: {groups.listACount} / {maxAllowed}
          </div>
          <div style={{ color: THEME.textMuted }}>
            B-Liste: {groups.listBCount}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: 8,
          alignItems: 'start',
          width: '100%',
          padding: '10px 0 0',
          boxSizing: 'border-box',
        }}
      >
        {/* Links: Locally Trained (Club + Association) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <ColumnHeading>Locally Trained</ColumnHeading>
          <Box
            title="Club-Trained"
            accent={COLORS.club}
            assigned={groups.clubA}
            available={groups.availClub}
            labelFor={aListLabels}
            countLabel={`${groups.clubA.length}/${ASSOCIATION_TRAINED_MAX}`}
          />
          <Box
            title="Association-Trained"
            accent={COLORS.association}
            assigned={groups.assocA}
            available={groups.availAssoc}
            labelFor={aListLabels}
            countLabel={`${groups.assocA.length}/${ASSOCIATION_TRAINED_MAX}`}
          />
        </div>

        {/* Mitte: A-Liste Rest */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <ColumnHeading>A-Liste (übrige)</ColumnHeading>
          <Box
            title="Non-Locally Trained"
            accent={COLORS.rest}
            assigned={groups.restA}
            available={groups.availRest}
            labelFor={aListLabels}
            countLabel={`${groups.restA.length}/${nonLocalMax}`}
          />
        </div>

        {/* Rechts: B-Liste */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <ColumnHeading>B-Liste</ColumnHeading>
          <Box
            title="B-Liste"
            accent={COLORS.blist}
            assigned={groups.listB}
            available={groups.availB}
            labelFor={bListLabels}
            countLabel={`${groups.listB.length}`}
          />
        </div>
      </div>

      {/* Legende */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px 10px',
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px 24px',
          }}
        >
          <LegendItem
            color={COLORS.club}
            title="Club-Trained"
            desc="36+ Monate beim FC Salzburg zwischen 15 und 21 Jahren"
          />
          <LegendItem
            color={COLORS.association}
            title="Association-Trained"
            desc="36+ Monate bei ÖFB-Vereinen (z. B. Liefering) zwischen 15 und 21"
          />
          <LegendItem
            color={COLORS.rest}
            title="Non-Locally Trained"
            desc="ohne Ausbildungsbonus, zählt auf die übrigen A-Listen-Plätze"
          />
          <LegendItem
            color={COLORS.blist}
            title="B-Liste"
            desc="geb. ab 2005; ab dem 15. Geburtstag 2 Jahre ununterbrochen (oder 3 Jahre mit max. 1 Leihe) beim Verein"
          />
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: THEME.textMuted,
            lineHeight: 1.45,
          }}
        >
          A-Liste: max. 25 Spieler (reduziert, wenn unter 8 locally-trained),
          davon min. 8 locally-trained (min. 4 club-trained, max. 4
          association-trained anrechenbar) und min. 2 Torhüter auf A sowie min. 3
          Torhüter gesamt (A+B). Box-Zähler: aktuell/Limit. Non-Local-Limit =
          Restplätze nach CTP/ATP (auch ATP über 4 belegen Plätze). Kürzel: +CTP
          / +ATP / +B = zusätzliche Berechtigung, DUMMY = virtueller Transfer.
          Unter jeder Box: berechtigte, aber (noch) nicht zugeteilte Spieler.
        </div>
      </div>
    </div>
  )
})

RegistrationBoard.displayName = 'RegistrationBoard'
