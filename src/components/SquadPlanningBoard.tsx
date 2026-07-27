import { forwardRef, useMemo } from 'react'
import type { Player, SquadRole } from '@/types'
import { useKaderStore } from '@/store'
import { BOARD_BG } from '@/components/RegistrationBoard'
import {
  buildCategoryBoardLayout,
  distributeColumnsToLanes,
  maxCategoryColumnsPerRow,
  SQUAD_BOARD_COLUMN_GAP,
  SQUAD_BOARD_CONTENT_PADDING,
  SQUAD_BOARD_RED,
  SQUAD_BOARD_WIDTH,
  type BoardCategoryAccent,
} from '@/lib/squadRoles'
import { salzburgContractEndYear } from '@/lib/uefaUtils'

const THEME = {
  bg: BOARD_BG,
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

function headerBarStyle(accent: BoardCategoryAccent) {
  return {
    background: accent.background,
    color: accent.foreground,
    borderBottom: accent.border ? `1px solid ${accent.border}` : undefined,
  } as const
}

function PlayerRow({
  player,
  rank,
  labels,
}: {
  player: Player
  rank: number
  labels: string[]
}) {
  const contractYear = salzburgContractEndYear(player)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        height: 28,
        borderRadius: 5,
        border: `1px solid ${THEME.border}`,
        background: THEME.row,
        padding: '0 8px',
        fontSize: 13,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          color: THEME.text,
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            minWidth: 16,
            marginRight: 5,
            fontSize: 11,
            fontWeight: 800,
            color: THEME.textMuted,
          }}
        >
          {rank}.
        </span>
        <span style={{ fontWeight: 600 }}>{player.name}</span>
        {contractYear != null && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              marginLeft: 6,
              color: THEME.textMuted,
              fontSize: 11,
              fontWeight: 600,
              verticalAlign: 'middle',
            }}
            title={`Vertragsende FC Salzburg ${contractYear}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
            {contractYear}
          </span>
        )}
      </span>
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {labels.map((l) => (
          <span
            key={l}
            style={{
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              color: THEME.pillText,
              background: THEME.pillBg,
              border: `1px solid ${THEME.pillBorder}`,
              borderRadius: 4,
              padding: '2px 5px',
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

function RoleBox({
  role,
  players,
  accent,
}: {
  role: SquadRole
  players: Player[]
  accent: BoardCategoryAccent
}) {
  return (
    <div
      style={{
        borderRadius: 6,
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
          ...headerBarStyle(accent),
          padding: '5px 10px',
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {role.label}{' '}
        <span style={{ opacity: 0.85, fontWeight: 600 }}>
          ({players.length})
        </span>
      </div>
      <div
        style={{
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minHeight: 0,
        }}
      >
        {players.map((p, idx) => (
          <PlayerRow
            key={p.id}
            player={p}
            rank={idx + 1}
            labels={p.isDummy ? ['DUMMY'] : []}
          />
        ))}
        {players.length === 0 && (
          <span style={{ fontSize: 13, color: THEME.textMuted }}>—</span>
        )}
      </div>
    </div>
  )
}

function CategoryColumn({
  label,
  roles,
  accent,
  playersForRole,
}: {
  label: string | null
  roles: SquadRole[]
  accent: BoardCategoryAccent
  playersForRole: (roleId: string) => Player[]
}) {
  const roleBoxes = (
    <>
      {roles.length === 0 && label !== null && (
        <span style={{ fontSize: 13, color: THEME.textMuted }}>
          Keine Rollen
        </span>
      )}
      {roles.map((role) => (
        <RoleBox
          key={role.id}
          role={role}
          players={playersForRole(role.id)}
          accent={accent}
        />
      ))}
    </>
  )

  if (label === null) {
    return (
      <div
        style={{
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          height: '100%',
        }}
      >
        {roleBoxes}
      </div>
    )
  }

  return (
    <div
      style={{
        minWidth: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          borderRadius: 6,
          border: `1px solid ${accent.border ?? THEME.border}`,
          overflow: 'hidden',
          background: THEME.box,
          minWidth: 0,
          height: '100%',
        }}
      >
        <div
          style={{
            ...headerBarStyle(accent),
            padding: '8px 12px',
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {label}
        </div>
        <div
          style={{
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {roleBoxes}
        </div>
      </div>
    </div>
  )
}

export const SquadPlanningBoard = forwardRef<HTMLDivElement>(
  function SquadPlanningBoard(_props, ref) {
    const players = useKaderStore((s) => s.players)
    const squadPlan = useKaderStore((s) => s.squadPlan)

    const byId = useMemo(() => {
      const map = new Map<string, Player>()
      for (const p of players) map.set(p.id, p)
      return map
    }, [players])

    const boardRows = useMemo(
      () => buildCategoryBoardLayout(squadPlan),
      [squadPlan],
    )

    const boardColumns = useMemo(
      () => boardRows.flatMap((row) => row.columns),
      [boardRows],
    )

    const columnsPerRow = maxCategoryColumnsPerRow()

    const columnLanes = useMemo(
      () => distributeColumnsToLanes(boardColumns, columnsPerRow),
      [boardColumns, columnsPerRow],
    )

    const playersForRole = (roleId: string) => {
      const ids = squadPlan.assignments[roleId] ?? []
      return ids
        .map((id) => byId.get(id))
        .filter((p): p is Player => Boolean(p))
    }

    const stand = new Date().toLocaleDateString('de-AT')
    const hasContent =
      squadPlan.roles.length > 0 || squadPlan.categories.length > 0

    return (
      <div
        ref={ref}
        style={{
          width: SQUAD_BOARD_WIDTH,
          minWidth: SQUAD_BOARD_WIDTH,
          boxSizing: 'border-box',
          background: THEME.bg,
          color: THEME.text,
          padding: 0,
          fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${SQUAD_BOARD_CONTENT_PADDING}px ${SQUAD_BOARD_CONTENT_PADDING}px 8px`,
            borderBottom: `3px solid ${SQUAD_BOARD_RED}`,
          }}
        >
          <div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>
              FC Red Bull Salzburg – Kaderplanung
            </div>
            <div style={{ fontSize: 13, color: THEME.textMuted }}>
              Priorität pro Rolle (1 = höchste) · Stand {stand}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700 }}>
            {squadPlan.categories.length > 0
              ? `${squadPlan.categories.length} Kategorien · `
              : ''}
            {squadPlan.roles.length} Rollen
          </div>
        </div>

        {!hasContent ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: THEME.textMuted,
              fontSize: 14,
            }}
          >
            Keine Rollen definiert.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`,
              gap: SQUAD_BOARD_COLUMN_GAP,
              alignItems: 'start',
              padding: `${SQUAD_BOARD_CONTENT_PADDING}px`,
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {columnLanes.map((lane, laneIdx) => (
              <div
                key={laneIdx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: SQUAD_BOARD_COLUMN_GAP,
                  minWidth: 0,
                }}
              >
                {lane.map((col) => (
                  <CategoryColumn
                    key={
                      col.categoryId ??
                      col.roles.map((r) => r.id).join('-') ??
                      'col'
                    }
                    label={col.label}
                    roles={col.roles}
                    accent={col.accent}
                    playersForRole={playersForRole}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
)
