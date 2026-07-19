import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  ImageDown,
  Trash2,
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { Player } from '@/types'
import { useKaderStore } from '@/store'
import {
  ASSOCIATION_TRAINED_MAX,
  GOALKEEPERS_REQUIRED,
  GOALKEEPERS_TOTAL_REQUIRED,
  getUefaCategory,
  isListBEligible,
  isU21ForListB,
  LIST_A_MAX,
  LOCALLY_TRAINED_REQUIRED,
  parseDate,
  validateListA,
} from '@/lib/uefaUtils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { DummyDialog } from '@/components/DummyDialog'
import { RegistrationBoard, BOARD_BG } from '@/components/RegistrationBoard'

type ZoneId = 'available' | 'listA' | 'listB'

/** Lokales Kalenderdatum als YYYY-MM-DD (fuer Default „heute“). */
function localTodayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function categoryBadge(player: Player, asOf: Date) {
  const cat = getUefaCategory(player, asOf)
  const label = cat === 'CTP' ? 'CT' : cat === 'ATP' ? 'AT' : '-'
  const variant =
    cat === 'CTP' ? 'success' : cat === 'ATP' ? 'warning' : 'secondary'
  return (
    <Badge variant={variant} className="px-1.5 py-0 text-[10px]">
      {label}
    </Badge>
  )
}

function DraggablePlayer({
  player,
  asOf,
  onAssign,
}: {
  player: Player
  asOf: Date
  onAssign: (list: 'A' | 'B' | null) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {player.position}
          {categoryBadge(player, asOf)}
          {isListBEligible(player, undefined, asOf) && (
            <Badge variant="default" className="px-1 py-0 text-[10px]">
              B
            </Badge>
          )}
        </div>
      </div>
      <div
        className="flex shrink-0 gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-1.5 text-xs"
          onClick={() => onAssign('A')}
        >
          A
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-1.5 text-xs"
          onClick={() => onAssign('B')}
        >
          B
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={() => onAssign(null)}
          aria-label="Entfernen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function DroppableColumn({
  id,
  title,
  subtitle,
  children,
  accent,
}: {
  id: ZoneId
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  accent?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[200px] flex-col gap-2 rounded-lg border bg-card p-3 transition-colors',
        isOver && 'border-primary bg-primary/5',
        accent && 'border-primary/40',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {subtitle}
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  )
}

export function UefaDraft() {
  const players = useKaderStore((s) => s.players)
  const draft = useKaderStore((s) => s.draft)
  const assignToList = useKaderStore((s) => s.assignToList)
  const resetDraft = useKaderStore((s) => s.resetDraft)
  const addDummyPlayer = useKaderStore((s) => s.addDummyPlayer)
  const clearDummies = useKaderStore((s) => s.clearDummies)

  const [dummyOpen, setDummyOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [asOfIso, setAsOfIso] = useState(localTodayISO)
  const boardRef = useRef<HTMLDivElement>(null)

  const asOf = useMemo(() => parseDate(asOfIso), [asOfIso])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const byId = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) map.set(p.id, p)
    return map
  }, [players])

  const resolve = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter((p): p is Player => Boolean(p))

  const listAPlayers = resolve(draft.listA)
  const listBPlayers = resolve(draft.listB)
  const assigned = new Set([...draft.listA, ...draft.listB])
  const available = players.filter((p) => !assigned.has(p.id))

  const validation = useMemo(
    () => validateListA(listAPlayers, asOf, listBPlayers),
    [listAPlayers, listBPlayers, asOf],
  )

  const listBIssues = listBPlayers.filter(
    (p) => !isU21ForListB(p) || !isListBEligible(p, undefined, asOf),
  )

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const overId = e.over?.id as ZoneId | undefined
    if (!overId) return
    const playerId = String(e.active.id)
    if (overId === 'listA') assignToList(playerId, 'A')
    else if (overId === 'listB') assignToList(playerId, 'B')
    else if (overId === 'available') assignToList(playerId, null)
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
      a.download = `uefa-registrierung-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  const activePlayer = activeId ? byId.get(activeId) : undefined

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">UEFA-Registrierung (Art. 30/31)</h1>
          <p className="text-sm text-muted-foreground">
            Spieler per Drag &amp; Drop oder A/B-Buttons zuweisen
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="asOf" className="text-xs text-muted-foreground">
              Stichtag
            </Label>
            <DateInput
              id="asOf"
              value={asOfIso}
              onChange={setAsOfIso}
              className="w-[11.5rem]"
            />
          </div>
          <Button variant="outline" onClick={() => setDummyOpen(true)}>
            <UserPlus /> Dummy-Spieler
          </Button>
          <Button variant="outline" onClick={clearDummies}>
            Dummies entfernen
          </Button>
          <Button variant="outline" onClick={resetDraft}>
            Draft zurücksetzen
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
          {/* Verfuegbarer Kader */}
          <DroppableColumn
            id="available"
            title="Verfügbar"
            subtitle={
              <Badge variant="secondary">{available.length}</Badge>
            }
          >
            {available.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Alle Spieler zugewiesen.
              </p>
            )}
            {available.map((p) => (
              <DraggablePlayer
                key={p.id}
                player={p}
                asOf={asOf}
                onAssign={(list) => assignToList(p.id, list)}
              />
            ))}
          </DroppableColumn>

          {/* Listen */}
          <div className="space-y-4">
            <DroppableColumn
              id="listA"
              title="A-Liste"
              accent
              subtitle={
                <Badge
                  variant={
                    validation.total > validation.maxAllowed
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {validation.total} / {LIST_A_MAX}
                </Badge>
              }
            >
              {listAPlayers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ziehe Spieler hierher (max. {LIST_A_MAX}).
                </p>
              )}
              {listAPlayers.map((p) => (
                <DraggablePlayer
                  key={p.id}
                  player={p}
                  asOf={asOf}
                  onAssign={(list) => assignToList(p.id, list)}
                />
              ))}
            </DroppableColumn>

            <DroppableColumn
              id="listB"
              title="B-Liste"
              subtitle={<Badge variant="secondary">{listBPlayers.length}</Badge>}
            >
              {listBPlayers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Geboren ab 2005; ab dem 15. Geburtstag 2 Jahre ununterbrochen
                  (oder 3 mit max. 1 Leihe) beim Verein.
                </p>
              )}
              {listBPlayers.map((p) => {
                const invalid =
                  !isU21ForListB(p) || !isListBEligible(p, undefined, asOf)
                return (
                  <div key={p.id} className="space-y-1">
                    <DraggablePlayer
                      player={p}
                      asOf={asOf}
                      onAssign={(list) => assignToList(p.id, list)}
                    />
                    {invalid && (
                      <p className="pl-2 text-xs text-destructive">
                        Nicht B-Listen-berechtigt (Stichtag)
                      </p>
                    )}
                  </div>
                )
              })}
            </DroppableColumn>
          </div>

          {/* Validierungs-Panel */}
          <div className="space-y-4">
            <ValidationPanel validation={validation} listBIssues={listBIssues.length} />
          </div>
        </div>

        <DragOverlay>
          {activePlayer ? (
            <div className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{activePlayer.name}</span>
              {categoryBadge(activePlayer, asOf)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Registrierungs-Übersicht</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vorschau des Export-Bildes mit allen Kategorien (Stichtag{' '}
              {asOfIso.split('-').reverse().join('.')})
            </p>
          </div>
          <Button onClick={handleExportImage} disabled={exporting}>
            <ImageDown /> {exporting ? 'Exportiere...' : 'Als Bild exportieren'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border bg-background p-2">
            <div className="w-max max-w-none">
              <RegistrationBoard ref={boardRef} asOf={asOf} />
            </div>
          </div>
        </CardContent>
      </Card>

      <DummyDialog
        open={dummyOpen}
        onClose={() => setDummyOpen(false)}
        onCreate={(data) => {
          const id = addDummyPlayer(data)
          assignToList(id, 'A')
        }}
      />
    </div>
  )
}

function ValidationPanel({
  validation,
  listBIssues,
}: {
  validation: ReturnType<typeof validateListA>
  listBIssues: number
}) {
  const {
    total,
    maxAllowed,
    goalkeepers,
    goalkeepersTotal,
    clubTrained,
    associationTrained,
    effectiveLocallyTrained,
    nonLocalMax,
    errors,
    warnings,
  } = validation

  const hasErrors = errors.length > 0 || listBIssues > 0
  const hasWarnings = warnings.length > 0
  const allOk = !hasErrors && !hasWarnings

  const borderClass = hasErrors
    ? 'border-destructive/50'
    : hasWarnings
      ? 'border-[hsl(var(--warning))]/50'
      : 'border-success/50'

  const countedAssociation = Math.min(
    associationTrained,
    ASSOCIATION_TRAINED_MAX,
  )

  return (
    <Card className={cn(borderClass)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {hasErrors ? (
            <XCircle className="h-5 w-5 text-destructive" />
          ) : hasWarnings ? (
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-success" />
          )}
          A-Listen-Validierung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <StatRow
            label="Spieler"
            value={total}
            limit={maxAllowed}
            ok={total <= maxAllowed}
          />
          <StatRow
            label="Torhüter A-Liste"
            value={goalkeepers}
            limit={GOALKEEPERS_REQUIRED}
            ok={goalkeepers >= GOALKEEPERS_REQUIRED}
            mode="min"
          />
          <StatRow
            label="Torhüter gesamt (A+B)"
            value={goalkeepersTotal}
            limit={GOALKEEPERS_TOTAL_REQUIRED}
            ok={goalkeepersTotal >= GOALKEEPERS_TOTAL_REQUIRED}
            mode="min"
          />
          <StatRow
            label="Locally-trained (anrechenbar)"
            value={effectiveLocallyTrained}
            limit={LOCALLY_TRAINED_REQUIRED}
            ok={effectiveLocallyTrained >= LOCALLY_TRAINED_REQUIRED}
            mode="min"
          />
          <StatRow
            label="davon Club-trained"
            value={clubTrained}
            limit={ASSOCIATION_TRAINED_MAX}
            ok={clubTrained >= ASSOCIATION_TRAINED_MAX}
            mode="min"
          />
          <StatRow
            label="Association-trained (anrechenbar)"
            value={countedAssociation}
            limit={ASSOCIATION_TRAINED_MAX}
            ok
            hint={
              associationTrained > ASSOCIATION_TRAINED_MAX
                ? `${associationTrained} vorhanden`
                : undefined
            }
          />
          <StatRow
            label="Non-Locally (Restplätze)"
            value={Math.max(0, total - clubTrained - associationTrained)}
            limit={nonLocalMax}
            ok={total - clubTrained - associationTrained <= nonLocalMax}
          />
        </div>

        {errors.map((e, i) => (
          <div
            key={`e${i}`}
            className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{e}</span>
          </div>
        ))}
        {warnings.map((w, i) => (
          <div
            key={`w${i}`}
            className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-sm text-[hsl(var(--warning))]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{w}</span>
          </div>
        ))}
        {listBIssues > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {listBIssues} Spieler auf der B-Liste sind nicht berechtigt.
            </span>
          </div>
        )}
        {allOk && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 p-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Alle A-Listen-Regeln erfüllt.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatRow({
  label,
  value,
  limit,
  ok,
  mode = 'max',
  hint,
}: {
  label: string
  value: number
  limit: number
  ok: boolean
  mode?: 'min' | 'max'
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">
        {label}
        {mode === 'min' ? ` (min. ${limit})` : ` (max. ${limit})`}
      </span>
      <span className="flex items-baseline gap-1.5">
        {hint && (
          <span className="text-xs font-normal text-muted-foreground">{hint}</span>
        )}
        <span
          className={cn(
            'font-semibold tabular-nums',
            ok ? 'text-success' : 'text-destructive',
          )}
        >
          {value}/{limit}
        </span>
      </span>
    </div>
  )
}
