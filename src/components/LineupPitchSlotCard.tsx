import type { CSSProperties, ReactNode } from 'react'
import {
  FORMATION_SLOT_W,
  LINEUP_PITCH_SLOT_THEME,
} from '@/components/formationPitchLayout'
import { SLOT_HEADER_BG, SLOT_HEADER_FG } from '@/components/lineupSlotStyles'
import type { Player } from '@/types'

const THEME = LINEUP_PITCH_SLOT_THEME

type LineupPitchSlotCardProps = {
  label: string
  primary: Player | null
  backups: Player[]
  className?: string
  style?: CSSProperties
  onClick?: () => void
  footer?: ReactNode
}

export function LineupPitchSlotCard({
  label,
  primary,
  backups,
  className,
  style,
  onClick,
  footer,
}: LineupPitchSlotCardProps) {
  const inner = (
    <>
      <div
        style={{
          background: SLOT_HEADER_BG,
          color: SLOT_HEADER_FG,
          padding: '5px 8px',
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        {label}
      </div>
      <div style={{ padding: '6px 8px' }}>
        {primary ? (
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              lineHeight: 1.35,
              wordBreak: 'break-word',
            }}
          >
            {primary.name}
          </div>
        ) : (
          <div style={{ color: THEME.textMuted, fontSize: 13 }}>—</div>
        )}
        {backups.map((p, i) => (
          <div
            key={p.id}
            style={{
              color: THEME.textMuted,
              fontSize: 11,
              lineHeight: 1.35,
              marginTop: 3,
              wordBreak: 'break-word',
            }}
          >
            {i + 2}. {p.name}
          </div>
        ))}
        {footer}
      </div>
    </>
  )

  const boxStyle: CSSProperties = {
    borderRadius: 6,
    border: `1px solid ${THEME.border}`,
    background: THEME.box,
    overflow: 'hidden',
    fontSize: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
    color: THEME.text,
    width: '100%',
    textAlign: 'left',
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{ ...boxStyle, ...style, cursor: 'pointer' }}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={className} style={{ ...boxStyle, ...style }}>
      {inner}
    </div>
  )
}

export function lineupPitchSlotPositionStyle(
  x: number,
  y: number,
): CSSProperties {
  return {
    position: 'absolute',
    left: `${x * 100}%`,
    bottom: `${y * 100}%`,
    transform: 'translate(-50%, 50%)',
    width: FORMATION_SLOT_W,
    maxWidth: '26%',
    zIndex: 2,
  }
}
