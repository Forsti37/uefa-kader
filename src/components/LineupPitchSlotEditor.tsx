import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical, X } from 'lucide-react'
import {
  LINEUP_PITCH_SLOT_THEME,
} from '@/components/formationPitchLayout'
import { SLOT_HEADER_BG, SLOT_HEADER_FG } from '@/components/lineupSlotStyles'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import type { Player, SquadRole } from '@/types'

const THEME = LINEUP_PITCH_SLOT_THEME

type LineupPitchSlotEditorProps = {
  label: string
  roleId: string | null
  roles: SquadRole[]
  primary: Player | null
  backups: Player[]
  isDropTarget: boolean
  onAssignRole: (roleId: string | null) => void
  onClear: () => void
  onLabelChange: (label: string) => void
  onLayoutPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
}

export function LineupPitchSlotEditor({
  label,
  roleId,
  roles,
  primary,
  backups,
  isDropTarget,
  onAssignRole,
  onClear,
  onLabelChange,
  onLayoutPointerDown,
}: LineupPitchSlotEditorProps) {
  const hasAssignment = Boolean(primary || roleId)

  return (
    <div
      style={boxStyle}
      className={cn(isDropTarget && 'ring-2 ring-primary')}
    >
      <div
        className="flex cursor-grab items-center gap-1 active:cursor-grabbing"
        style={{
          background: SLOT_HEADER_BG,
          color: SLOT_HEADER_FG,
          padding: '5px 6px',
          fontWeight: 800,
          fontSize: 12,
          touchAction: 'none',
          userSelect: 'none',
        }}
        title="Ziehen zum Verschieben"
        onPointerDown={onLayoutPointerDown}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          maxLength={24}
          className="min-w-0 flex-1 cursor-text rounded border-0 bg-white/10 px-1 py-0.5 text-xs font-extrabold text-white outline-none focus:bg-white/20"
          aria-label="Positionsname"
        />
        {hasAssignment && (
          <button
            type="button"
            title="Slot leeren"
            className="shrink-0 cursor-pointer rounded p-0.5 opacity-90 hover:bg-white/15"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Slot leeren</span>
          </button>
        )}
      </div>

      <div className="px-1.5 pt-1.5">
        <Select
          value={roleId ?? ''}
          onChange={(e) =>
            onAssignRole(e.target.value ? e.target.value : null)
          }
          onPointerDown={(e) => e.stopPropagation()}
          className="h-7 border-[#444] bg-[#1a1a1a] px-2 pr-7 text-xs text-[#ddd] shadow-none focus-visible:ring-primary/60"
        >
          <option value="">Rolle / manuell</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>

      <div style={{ padding: '6px 8px 8px' }}>
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
        ) : roleId ? (
          <div style={{ color: THEME.textMuted, fontSize: 12 }}>
            Kein Spieler in Rolle
          </div>
        ) : (
          <div style={{ color: THEME.textMuted, fontSize: 12 }}>
            Spieler hierher ziehen
          </div>
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
      </div>
    </div>
  )
}

const boxStyle: CSSProperties = {
  borderRadius: 6,
  border: `1px solid ${THEME.border}`,
  background: THEME.box,
  overflow: 'hidden',
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
  color: THEME.text,
  width: '100%',
}
