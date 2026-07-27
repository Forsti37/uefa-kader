import { forwardRef, useMemo } from 'react'
import { BOARD_BG } from '@/components/RegistrationBoard'
import { PitchSvg } from '@/components/PitchSvg'
import {
  FORMATION_PITCH_W,
  formationPitchHeight,
} from '@/components/formationPitchLayout'
import {
  LineupPitchSlotCard,
  lineupPitchSlotPositionStyle,
} from '@/components/LineupPitchSlotCard'
import { getFormationDisplayName } from '@/lib/formationTemplates'
import { resolveSlotPlayers } from '@/lib/lineup'
import { SQUAD_BOARD_RED } from '@/lib/squadRoles'
import { useKaderStore } from '@/store'

const PITCH_W = FORMATION_PITCH_W
const PITCH_H = formationPitchHeight(PITCH_W)
/** Rand um das Feld – Bildbreite = Feld + dieser Padding. */
const PITCH_PAD = 14
const PITCH_BORDER = 4

export const FORMATION_BOARD_WIDTH = PITCH_W + PITCH_PAD * 2 + PITCH_BORDER * 2

const THEME = {
  text: '#dddddd',
  textMuted: '#999999',
}

export const FormationBoard = forwardRef<HTMLDivElement>(
  function FormationBoard(_props, ref) {
    const players = useKaderStore((s) => s.players)
    const squadPlan = useKaderStore((s) => s.squadPlan)
    const lineup = useKaderStore((s) => s.lineup)
    const customFormations = useKaderStore((s) => s.customFormations)

    const playersById = useMemo(() => {
      const map = new Map<string, (typeof players)[0]>()
      for (const p of players) map.set(p.id, p)
      return map
    }, [players])

    const stand = new Date().toLocaleDateString('de-AT')
    const formationLabel = getFormationDisplayName(
      lineup.formationId,
      customFormations,
    )

    return (
      <div
        ref={ref}
        style={{
          width: FORMATION_BOARD_WIDTH,
          minWidth: FORMATION_BOARD_WIDTH,
          boxSizing: 'border-box',
          background: BOARD_BG,
          color: THEME.text,
          fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            padding: '12px 14px 10px',
            borderBottom: `3px solid ${SQUAD_BOARD_RED}`,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>
            FC Red Bull Salzburg – Aufstellung
          </div>
          <div style={{ fontSize: 13, color: THEME.textMuted, marginTop: 2 }}>
            {formationLabel} · Stand {stand}
            {lineup.showBackups ? ' · inkl. Backups' : ''}
          </div>
        </div>

        <div style={{ padding: PITCH_PAD }}>
          <div
            style={{
              position: 'relative',
              width: PITCH_W,
              height: PITCH_H,
              borderRadius: 4,
              border: `${PITCH_BORDER}px solid rgba(255,255,255,0.9)`,
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
              boxSizing: 'content-box',
            }}
          >
            <PitchSvg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
              }}
              patternId="pitch-export"
            />
            {lineup.slots.map((slot) => {
              const { primary, backups } = resolveSlotPlayers(
                slot,
                squadPlan,
                playersById,
                lineup.showBackups,
              )
              return (
                <div
                  key={slot.key}
                  style={lineupPitchSlotPositionStyle(slot.x, slot.y)}
                >
                  <LineupPitchSlotCard
                    label={slot.label}
                    primary={primary}
                    backups={backups}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  },
)
