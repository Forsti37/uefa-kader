import { useDroppable } from '@dnd-kit/core'
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { LineupSlotState, Player, SquadRole } from '@/types'
import type { FormationId } from '@/lib/formationTemplates'
import { resolveSlotPlayers } from '@/lib/lineup'
import type { SquadPlanState } from '@/types'
import { PitchSvg } from '@/components/PitchSvg'
import {
  FORMATION_PITCH_W,
  formationPitchHeight,
} from '@/components/formationPitchLayout'
import { lineupPitchSlotPositionStyle } from '@/components/LineupPitchSlotCard'
import { LineupPitchSlotEditor } from '@/components/LineupPitchSlotEditor'

const PITCH_W = FORMATION_PITCH_W
const PITCH_H = formationPitchHeight(PITCH_W)

export function lineupSlotDropId(slotKey: string) {
  return `lineup-slot:${slotKey}`
}

export function parseLineupSlotDropId(id: string): string | null {
  if (!id.startsWith('lineup-slot:')) return null
  return id.slice('lineup-slot:'.length)
}

type FormationFieldProps = {
  formationId: FormationId
  slots: LineupSlotState[]
  showBackups: boolean
  squadPlan: SquadPlanState
  roles: SquadRole[]
  playersById: Map<string, Player>
  onAssignRole: (slotKey: string, roleId: string | null) => void
  onClearSlot: (slotKey: string) => void
  onMoveSlot: (slotKey: string, x: number, y: number) => void
  onRenameSlot: (slotKey: string, label: string) => void
}

export function FormationField({
  slots,
  showBackups,
  squadPlan,
  roles,
  playersById,
  onAssignRole,
  onClearSlot,
  onMoveSlot,
  onRenameSlot,
}: FormationFieldProps) {
  const pitchRef = useRef<HTMLDivElement>(null)
  const onMoveSlotRef = useRef(onMoveSlot)
  onMoveSlotRef.current = onMoveSlot
  const [dragPreview, setDragPreview] = useState<{
    key: string
    x: number
    y: number
  } | null>(null)

  function pointerToPitchCoords(clientX: number, clientY: number) {
    const el = pitchRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const x = (clientX - rect.left) / rect.width
    const y = 1 - (clientY - rect.top) / rect.height
    return {
      x: Math.min(0.94, Math.max(0.06, x)),
      y: Math.min(0.94, Math.max(0.06, y)),
    }
  }

  function beginLayoutDrag(
    slotKey: string,
    e: ReactPointerEvent<HTMLElement>,
  ) {
    e.preventDefault()
    e.stopPropagation()

    const pointerId = e.pointerId
    const start = pointerToPitchCoords(e.clientX, e.clientY)
    if (start) setDragPreview({ key: slotKey, x: start.x, y: start.y })

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const coords = pointerToPitchCoords(ev.clientX, ev.clientY)
      if (!coords) return
      setDragPreview({ key: slotKey, x: coords.x, y: coords.y })
    }
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      const coords = pointerToPitchCoords(ev.clientX, ev.clientY)
      setDragPreview(null)
      if (coords) onMoveSlotRef.current(slotKey, coords.x, coords.y)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-center text-xs text-muted-foreground">
        Roten Kopf ziehen = Position verschieben · Name im Kopf editieren. Beim
        ersten Verschieben einer System-Formation wird automatisch eine eigene
        Kopie angelegt.
      </p>
      <div className="flex w-full justify-center overflow-x-auto">
        <div
          ref={pitchRef}
          className="relative shrink-0"
          style={{
            width: PITCH_W,
            height: PITCH_H,
            maxWidth: '100%',
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-md border-4 border-white/90 shadow-lg"
            aria-hidden
          >
            <PitchSvg
              className="absolute inset-0 h-full w-full"
              patternId="pitch-ui"
            />
          </div>

          {slots.map((slot) => {
            const preview =
              dragPreview?.key === slot.key ? dragPreview : null
            const x = preview?.x ?? slot.x
            const y = preview?.y ?? slot.y
            return (
              <FormationSlotMarker
                key={slot.key}
                slot={slot}
                x={x}
                y={y}
                dragging={Boolean(preview)}
                showBackups={showBackups}
                squadPlan={squadPlan}
                roles={roles}
                playersById={playersById}
                onAssignRole={onAssignRole}
                onClearSlot={onClearSlot}
                onRenameSlot={onRenameSlot}
                onLayoutPointerDown={(e) => beginLayoutDrag(slot.key, e)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FormationSlotMarker({
  slot,
  x,
  y,
  dragging,
  showBackups,
  squadPlan,
  roles,
  playersById,
  onAssignRole,
  onClearSlot,
  onRenameSlot,
  onLayoutPointerDown,
}: {
  slot: LineupSlotState
  x: number
  y: number
  dragging: boolean
  showBackups: boolean
  squadPlan: SquadPlanState
  roles: SquadRole[]
  playersById: Map<string, Player>
  onAssignRole: (slotKey: string, roleId: string | null) => void
  onClearSlot: (slotKey: string) => void
  onRenameSlot: (slotKey: string, label: string) => void
  onLayoutPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
}) {
  const dropId = lineupSlotDropId(slot.key)
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: dragging,
  })
  const { primary, backups } = resolveSlotPlayers(
    slot,
    squadPlan,
    playersById,
    showBackups,
  )
  const roleLocked = Boolean(slot.roleId)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...lineupPitchSlotPositionStyle(x, y),
        zIndex: dragging ? 40 : isOver && !roleLocked ? 20 : 2,
        opacity: dragging ? 0.95 : 1,
        touchAction: 'none',
      }}
    >
      <LineupPitchSlotEditor
        label={slot.label}
        roleId={slot.roleId}
        roles={roles}
        primary={primary}
        backups={backups}
        isDropTarget={isOver && !roleLocked && !dragging}
        onAssignRole={(roleId) => onAssignRole(slot.key, roleId)}
        onClear={() => onClearSlot(slot.key)}
        onLabelChange={(label) => onRenameSlot(slot.key, label)}
        onLayoutPointerDown={onLayoutPointerDown}
      />
    </div>
  )
}
