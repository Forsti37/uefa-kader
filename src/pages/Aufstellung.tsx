import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { GripVertical, ImageDown, LayoutGrid, RotateCcw } from 'lucide-react'
import type { Player } from '@/types'
import { POSITION_LABELS, sortByPosition } from '@/types'
import { listFormations, type FormationId } from '@/lib/formationTemplates'
import { lineupHasAssignments } from '@/lib/lineup'
import { FormationManagerDialog } from '@/components/FormationManagerDialog'
import {
  FormationField,
  parseLineupSlotDropId,
} from '@/components/FormationField'
import { PaginatedPlayerList } from '@/components/PaginatedPlayerList'
import { FormationBoard } from '@/components/FormationBoard'
import { BOARD_BG } from '@/components/RegistrationBoard'
import { useKaderStore } from '@/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

function poolDragId(playerId: string) {
  return `pool:${playerId}`
}

function DraggablePlayerCard({ player }: { player: Player }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: poolDragId(player.id),
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex touch-none cursor-grab select-none items-center gap-2 rounded-md border bg-card p-2 text-sm active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{player.name}</span>
          {player.isDummy && (
            <Badge variant="outline" className="px-1 py-0 text-[10px]">
              Dummy
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {POSITION_LABELS[player.position]}
        </span>
      </div>
    </div>
  )
}

export function Aufstellung() {
  const players = useKaderStore((s) => s.players)
  const squadPlan = useKaderStore((s) => s.squadPlan)
  const lineup = useKaderStore((s) => s.lineup)
  const customFormations = useKaderStore((s) => s.customFormations)
  const setFormation = useKaderStore((s) => s.setFormation)
  const setLineupShowBackups = useKaderStore((s) => s.setLineupShowBackups)
  const assignLineupPlayer = useKaderStore((s) => s.assignLineupPlayer)
  const assignLineupRole = useKaderStore((s) => s.assignLineupRole)
  const clearLineupSlot = useKaderStore((s) => s.clearLineupSlot)
  const clearLineupAll = useKaderStore((s) => s.clearLineupAll)
  const moveCustomFormationSlot = useKaderStore((s) => s.moveCustomFormationSlot)
  const renameCustomFormationSlot = useKaderStore(
    (s) => s.renameCustomFormationSlot,
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [formationManagerOpen, setFormationManagerOpen] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const formationOptions = useMemo(
    () => listFormations(customFormations),
    [customFormations],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const playersSorted = useMemo(() => sortByPosition(players), [players])

  const playersById = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) map.set(p.id, p)
    return map
  }, [players])

  const activePlayer = useMemo(() => {
    if (!activeId?.startsWith('pool:')) return undefined
    return playersById.get(activeId.slice('pool:'.length))
  }, [activeId, playersById])

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const activeStr = String(e.active.id)
    const overStr = e.over ? String(e.over.id) : ''
    if (!overStr || !activeStr.startsWith('pool:')) return
    const slotKey = parseLineupSlotDropId(overStr)
    if (!slotKey) return
    const slot = lineup.slots.find((s) => s.key === slotKey)
    if (!slot || slot.roleId) return
    assignLineupPlayer(slotKey, activeStr.slice('pool:'.length))
  }

  function handleFormationChange(next: FormationId) {
    if (next === lineup.formationId) return
    if (
      lineupHasAssignments(lineup) &&
      !window.confirm(
        'Formation wechseln? Zuweisungen bleiben nur an Slots mit gleichem Schlüssel (z. B. ST, TW).',
      )
    ) {
      return
    }
    setFormation(next)
  }

  async function handleExportImage() {
    if (!boardRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(boardRef.current, {
        pixelRatio: 2.5,
        backgroundColor: BOARD_BG,
        cacheBust: true,
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `aufstellung-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Aufstellung</h1>
          <p className="text-sm text-muted-foreground">
            Tor unten, Sturm oben · Rolle am Feld wählen oder Spieler
            hineinziehen
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <Label
              htmlFor="formation"
              className="shrink-0 text-xs text-muted-foreground"
            >
              Formation
            </Label>
            <Select
              id="formation"
              value={lineup.formationId}
              onChange={(e) =>
                handleFormationChange(e.target.value as FormationId)
              }
              className="h-9 min-w-0 flex-1 sm:min-w-[10rem] sm:flex-none"
            >
              {formationOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.builtin ? f.name : `${f.name} (eigen)`}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => setFormationManagerOpen(true)}
          >
            <LayoutGrid className="h-4 w-4" /> Formationen
          </Button>
          <label className="flex h-9 shrink-0 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={lineup.showBackups}
              onChange={(e) => setLineupShowBackups(e.target.checked)}
            />
            Backups
          </label>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => clearLineupAll()}
          >
            <RotateCcw className="h-4 w-4" />{' '}
            <span className="hidden sm:inline">Alle Slots leeren</span>
            <span className="sm:hidden">Leeren</span>
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(240px,280px)_1fr]">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Kader</h3>
              <Badge variant="secondary">{players.length}</Badge>
            </div>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Spieler im Kader.
              </p>
            ) : (
              <PaginatedPlayerList
                items={playersSorted}
                getKey={(p) => p.id}
                renderItem={(p) => <DraggablePlayerCard player={p} />}
              />
            )}
          </div>

          <FormationField
            formationId={lineup.formationId}
            slots={lineup.slots}
            showBackups={lineup.showBackups}
            squadPlan={squadPlan}
            roles={squadPlan.roles}
            playersById={playersById}
            onAssignRole={assignLineupRole}
            onClearSlot={clearLineupSlot}
            onMoveSlot={moveCustomFormationSlot}
            onRenameSlot={renameCustomFormationSlot}
          />
        </div>

        <DragOverlay>
          {activePlayer ? (
            <div className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{activePlayer.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Aufstellungs-Übersicht</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vorschau für den Bild-Export (Forum-Stil)
            </p>
          </div>
          <Button onClick={handleExportImage} disabled={exporting}>
            <ImageDown /> {exporting ? 'Exportiere…' : 'Als Bild exportieren'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border bg-background p-2">
            <FormationBoard ref={boardRef} />
          </div>
        </CardContent>
      </Card>

      <FormationManagerDialog
        open={formationManagerOpen}
        onClose={() => setFormationManagerOpen(false)}
        onSelectFormation={(id) => setFormation(id)}
      />
    </div>
  )
}
