import { useMemo, useRef, useState, type ReactNode } from 'react'
import { toPng } from 'html-to-image'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  ImageDown,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'
import type { Player } from '@/types'
import { POSITION_LABELS, sortByPosition } from '@/types'
import { SQUAD_CATEGORY_TEMPLATE_COUNT, SQUAD_ROLE_TEMPLATE_COUNT, SQUAD_BOARD_WIDTH } from '@/lib/squadRoles'
import { useKaderStore } from '@/store'
import { SalzburgContractEnd } from '@/components/SalzburgContractEnd'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DummyDialog } from '@/components/DummyDialog'
import { BOARD_BG } from '@/components/RegistrationBoard'
import { SquadPlanningBoard } from '@/components/SquadPlanningBoard'
import { PaginatedPlayerList } from '@/components/PaginatedPlayerList'

type ZoneId = `role:${string}`

function poolDragId(playerId: string) {
  return `pool:${playerId}`
}

function sortDragId(roleId: string, playerId: string) {
  return `sort:${roleId}:${playerId}`
}

function parseSortDragId(
  id: string,
): { roleId: string; playerId: string } | null {
  if (!id.startsWith('sort:')) return null
  const parts = id.split(':')
  if (parts.length !== 3) return null
  return { roleId: parts[1], playerId: parts[2] }
}

function roleDragId(roleId: string) {
  return `role-drag:${roleId}`
}

function categoryDropId(categoryId: string) {
  return `category:${categoryId}`
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
        <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <SalzburgContractEnd player={player} compact />
          {POSITION_LABELS[player.position]}
        </span>
      </div>
    </div>
  )
}

export function Kaderplanung() {
  const players = useKaderStore((s) => s.players)
  const squadPlan = useKaderStore((s) => s.squadPlan)
  const addDummyPlayer = useKaderStore((s) => s.addDummyPlayer)
  const loadSquadRoleTemplate = useKaderStore((s) => s.loadSquadRoleTemplate)
  const addSquadCategory = useKaderStore((s) => s.addSquadCategory)
  const updateSquadCategory = useKaderStore((s) => s.updateSquadCategory)
  const removeSquadCategory = useKaderStore((s) => s.removeSquadCategory)
  const moveSquadCategory = useKaderStore((s) => s.moveSquadCategory)
  const addSquadRole = useKaderStore((s) => s.addSquadRole)
  const updateSquadRole = useKaderStore((s) => s.updateSquadRole)
  const setSquadRoleCategory = useKaderStore((s) => s.setSquadRoleCategory)
  const removeSquadRole = useKaderStore((s) => s.removeSquadRole)
  const moveSquadRole = useKaderStore((s) => s.moveSquadRole)
  const addPlayerToRole = useKaderStore((s) => s.addPlayerToRole)
  const removePlayerFromRole = useKaderStore((s) => s.removePlayerFromRole)
  const reorderPlayersInRole = useKaderStore((s) => s.reorderPlayersInRole)
  const resetSquadAssignments = useKaderStore((s) => s.resetSquadAssignments)
  const exportSquadPlanJSON = useKaderStore((s) => s.exportSquadPlanJSON)
  const importSquadPlanJSON = useKaderStore((s) => s.importSquadPlanJSON)

  const [dummyOpen, setDummyOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const byId = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) map.set(p.id, p)
    return map
  }, [players])

  const playersSorted = useMemo(() => sortByPosition(players), [players])

  const roleSections = useMemo(() => {
    const sections: {
      key: string
      categoryId: string | null
      label: string
      roles: typeof squadPlan.roles
      canEditCategory: boolean
    }[] = []

    for (let ci = 0; ci < squadPlan.categories.length; ci++) {
      const cat = squadPlan.categories[ci]
      sections.push({
        key: cat.id,
        categoryId: cat.id,
        label: cat.label,
        roles: squadPlan.roles.filter((r) => r.categoryId === cat.id),
        canEditCategory: true,
      })
    }

    const known = new Set(squadPlan.categories.map((c) => c.id))
    const uncategorized = squadPlan.roles.filter(
      (r) => !r.categoryId || !known.has(r.categoryId),
    )
    if (uncategorized.length > 0) {
      sections.push({
        key: '__none__',
        categoryId: null,
        label: 'Ohne Kategorie',
        roles: uncategorized,
        canEditCategory: false,
      })
    }

    if (sections.length === 0 && squadPlan.roles.length > 0) {
      sections.push({
        key: '__flat__',
        categoryId: null,
        label: 'Rollen',
        roles: squadPlan.roles,
        canEditCategory: false,
      })
    }

    return sections
  }, [squadPlan.categories, squadPlan.roles])

  function canMoveRoleInSection(
    roleId: string,
    direction: 'up' | 'down',
    sectionRoles: typeof squadPlan.roles,
  ) {
    const idx = sectionRoles.findIndex((r) => r.id === roleId)
    if (idx < 0) return false
    return direction === 'up' ? idx > 0 : idx < sectionRoles.length - 1
  }

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 4000)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const activeStr = String(e.active.id)
    const overStr = e.over ? String(e.over.id) : ''
    if (!overStr) return

    if (activeStr.startsWith('pool:')) {
      const playerId = activeStr.slice('pool:'.length)
      if (overStr.startsWith('role:')) {
        addPlayerToRole(overStr.slice('role:'.length), playerId)
        return
      }
      if (overStr.startsWith('sort:')) {
        const target = parseSortDragId(overStr)
        if (target) addPlayerToRole(target.roleId, playerId)
      }
      return
    }

    if (activeStr.startsWith('role-drag:')) {
      const roleId = activeStr.slice('role-drag:'.length)
      if (overStr.startsWith('category:')) {
        setSquadRoleCategory(roleId, overStr.slice('category:'.length))
      }
      return
    }

    if (activeStr.startsWith('sort:') && overStr.startsWith('sort:')) {
      const from = parseSortDragId(activeStr)
      const to = parseSortDragId(overStr)
      if (!from || !to || from.roleId !== to.roleId) return
      const ids = squadPlan.assignments[from.roleId] ?? []
      const fromIndex = ids.indexOf(from.playerId)
      const toIndex = ids.indexOf(to.playerId)
      if (fromIndex >= 0 && toIndex >= 0) {
        reorderPlayersInRole(from.roleId, fromIndex, toIndex)
      }
    }
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
      a.download = `kaderplanung-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  function handleExportJson() {
    const blob = new Blob([exportSquadPlanJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaderplanung-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importSquadPlanJSON(String(reader.result))
      flash(
        result.ok
          ? 'Planung importiert (nur lokal in diesem Browser).'
          : `Import fehlgeschlagen: ${result.error}`,
      )
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleLoadTemplate() {
    if (
      squadPlan.roles.length > 0 &&
      !window.confirm(
        `Kategorien und Rollen durch das Standard-Template (${SQUAD_CATEGORY_TEMPLATE_COUNT} Kategorien, ${SQUAD_ROLE_TEMPLATE_COUNT} Positionen) ersetzen? Spieler werden, soweit im Kader vorhanden, den Rollen zugewiesen.`,
      )
    ) {
      return
    }
    loadSquadRoleTemplate()
    flash(
      `Template geladen (${SQUAD_CATEGORY_TEMPLATE_COUNT} Kategorien, ${SQUAD_ROLE_TEMPLATE_COUNT} Rollen) inkl. Standard-Zuweisungen.`,
    )
  }

  const activePlayer = useMemo(() => {
    if (!activeId) return undefined
    if (activeId.startsWith('pool:')) {
      return byId.get(activeId.slice('pool:'.length))
    }
    const parsed = parseSortDragId(activeId)
    return parsed ? byId.get(parsed.playerId) : undefined
  }, [activeId, byId])

  const activeRoleLabel = useMemo(() => {
    if (!activeId?.startsWith('role-drag:')) return undefined
    const roleId = activeId.slice('role-drag:'.length)
    return squadPlan.roles.find((r) => r.id === roleId)?.label
  }, [activeId, squadPlan.roles])

  const isRoleDragActive = Boolean(activeId?.startsWith('role-drag:'))
  const noRoles = squadPlan.roles.length === 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kaderplanung</h1>
          <p className="text-sm text-muted-foreground">
            Mehrere Spieler pro Rolle · Reihenfolge = Priorität (per Drag
            sortieren) · ein Spieler in mehreren Rollen möglich
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload /> Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJson}
            disabled={noRoles && Object.keys(squadPlan.assignments).length === 0}
          >
            <Download /> Export
          </Button>
          <Button variant="outline" onClick={() => setDummyOpen(true)}>
            <UserPlus /> Dummy-Spieler
          </Button>
          <Button variant="outline" onClick={handleLoadTemplate}>
            <LayoutTemplate /> Kategorien-Template
          </Button>
          <Button variant="outline" onClick={() => addSquadCategory()}>
            <Plus /> Kategorie
          </Button>
          <Button variant="outline" onClick={() => addSquadRole()}>
            <Plus /> Rolle
          </Button>
          <Button variant="outline" onClick={resetSquadAssignments}>
            <RotateCcw /> Zuweisungen leeren
          </Button>
        </div>
      </div>

      {notice && (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm">{notice}</p>
      )}

      {noRoles && (
        <div className="rounded-lg border border-dashed bg-card px-5 py-8 text-center">
          <LayoutTemplate className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Noch keine Rollen</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Starte leer wie beim Kader. Lade das Kategorien-Template (Tor,
            Abwehr, Mittelfeld, Angriff) oder lege Struktur manuell an.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={handleLoadTemplate}>
              <LayoutTemplate /> Kategorien-Template (
              {SQUAD_CATEGORY_TEMPLATE_COUNT})
            </Button>
            <Button variant="outline" onClick={() => addSquadRole()}>
              <Plus /> Erste Rolle anlegen
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <Upload /> JSON importieren
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_1fr]">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Kader</h3>
              <Badge variant="secondary">{players.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Spieler auf eine Rolle ziehen (mehrfach möglich).
            </p>
            {players.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Spieler. Template oder Import in der Kader-Verwaltung.
              </p>
            ) : (
              <PaginatedPlayerList
                items={playersSorted}
                getKey={(p) => p.id}
                renderItem={(p) => <DraggablePlayerCard player={p} />}
              />
            )}
          </div>

          <div className="space-y-4">
            {roleSections.map((section) => {
              const catIndex = section.categoryId
                ? squadPlan.categories.findIndex(
                    (c) => c.id === section.categoryId,
                  )
                : -1

              return (
              <CategoryDropZone
                key={section.key}
                categoryId={section.canEditCategory ? section.categoryId : null}
                highlight={isRoleDragActive}
              >
              <div
                className="space-y-2 rounded-lg border bg-muted/10 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {section.canEditCategory ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={catIndex <= 0}
                          onClick={() =>
                            moveSquadCategory(section.categoryId!, 'up')
                          }
                          aria-label="Kategorie nach oben"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={
                            catIndex < 0 ||
                            catIndex >= squadPlan.categories.length - 1
                          }
                          onClick={() =>
                            moveSquadCategory(section.categoryId!, 'down')
                          }
                          aria-label="Kategorie nach unten"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={section.label}
                        onChange={(e) =>
                          updateSquadCategory(
                            section.categoryId!,
                            e.target.value,
                          )
                        }
                        className="h-9 max-w-[12rem] font-semibold"
                        aria-label="Kategoriename"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSquadRole('Neu', section.categoryId)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Rolle
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() =>
                          removeSquadCategory(section.categoryId!)
                        }
                        aria-label="Kategorie entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Label className="text-sm font-semibold">
                      {section.label}
                    </Label>
                  )}
                  {section.canEditCategory && isRoleDragActive && (
                    <span className="text-xs text-muted-foreground">
                      Rolle hierher ziehen
                    </span>
                  )}
                </div>

                {section.roles.length === 0 && section.canEditCategory && (
                  <p className="text-sm text-muted-foreground">
                    Noch keine Rollen in dieser Kategorie.
                  </p>
                )}

                {section.roles.map((role) => {
                  const assignedIds = squadPlan.assignments[role.id] ?? []
                  const dropId = `role:${role.id}` as ZoneId

                  return (
                    <RoleRowEditor
                      key={role.id}
                      dropId={dropId}
                      role={role}
                      assignedPlayerIds={assignedIds}
                      byId={byId}
                      categories={squadPlan.categories}
                      canMoveUp={canMoveRoleInSection(
                        role.id,
                        'up',
                        section.roles,
                      )}
                      canMoveDown={canMoveRoleInSection(
                        role.id,
                        'down',
                        section.roles,
                      )}
                      players={playersSorted}
                      onLabelChange={(label) =>
                        updateSquadRole(role.id, label)
                      }
                      onCategoryChange={(categoryId) =>
                        setSquadRoleCategory(role.id, categoryId)
                      }
                      onRemoveRole={() => removeSquadRole(role.id)}
                      onMoveUp={() => moveSquadRole(role.id, 'up')}
                      onMoveDown={() => moveSquadRole(role.id, 'down')}
                      onAddPlayer={(playerId) =>
                        addPlayerToRole(role.id, playerId)
                      }
                      onRemovePlayer={(playerId) =>
                        removePlayerFromRole(role.id, playerId)
                      }
                    />
                  )
                })}
              </div>
              </CategoryDropZone>
            )
            })}

            {squadPlan.roles.length > 0 && squadPlan.categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Tipp: Kategorien anlegen oder das Kategorien-Template laden, um
                Rollen zu gruppieren (Tor, Abwehr, …).
              </p>
            )}
          </div>
        </div>

        <DragOverlay>
          {activePlayer ? (
            <div className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{activePlayer.name}</span>
            </div>
          ) : activeRoleLabel ? (
            <div className="rounded-md border bg-card px-3 py-2 text-sm font-semibold shadow-lg">
              Rolle: {activeRoleLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Planungs-Übersicht</CardTitle>
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
            <div className="mx-auto w-full" style={{ maxWidth: SQUAD_BOARD_WIDTH }}>
              <SquadPlanningBoard ref={boardRef} />
            </div>
          </div>
        </CardContent>
      </Card>

      <DummyDialog
        open={dummyOpen}
        onClose={() => setDummyOpen(false)}
        onCreate={(data) => {
          addDummyPlayer(data)
        }}
      />
    </div>
  )
}

function CategoryDropZone({
  categoryId,
  highlight,
  children,
}: {
  categoryId: string | null
  highlight: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: categoryId ? categoryDropId(categoryId) : 'category:__none__',
    disabled: !categoryId,
  })

  return (
    <div
      ref={categoryId ? setNodeRef : undefined}
      className={cn(
        'rounded-lg transition-shadow',
        highlight &&
          categoryId &&
          isOver &&
          'ring-2 ring-primary ring-offset-2 ring-offset-background',
        highlight && categoryId && !isOver && 'ring-1 ring-dashed ring-muted-foreground/40',
      )}
    >
      {children}
    </div>
  )
}

function RoleRowEditor({
  dropId,
  role,
  assignedPlayerIds,
  byId,
  categories,
  canMoveUp,
  canMoveDown,
  players,
  onLabelChange,
  onCategoryChange,
  onRemoveRole,
  onMoveUp,
  onMoveDown,
  onAddPlayer,
  onRemovePlayer,
}: {
  dropId: ZoneId
  role: { id: string; label: string; categoryId?: string | null }
  assignedPlayerIds: string[]
  byId: Map<string, Player>
  categories: { id: string; label: string }[]
  canMoveUp: boolean
  canMoveDown: boolean
  players: Player[]
  onLabelChange: (label: string) => void
  onCategoryChange: (categoryId: string | null) => void
  onRemoveRole: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddPlayer: (playerId: string) => void
  onRemovePlayer: (playerId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId })
  const {
    attributes,
    listeners,
    setNodeRef: setRoleDragRef,
    isDragging: isRoleDragging,
  } = useDraggable({ id: roleDragId(role.id) })
  const [pick, setPick] = useState('')

  const sortableIds = assignedPlayerIds.map((pid) =>
    sortDragId(role.id, pid),
  )

  const cancelDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3',
        isOver && 'border-primary ring-1 ring-primary/30',
        isRoleDragging && 'opacity-50',
      )}
    >
      <div
        ref={setRoleDragRef}
        {...listeners}
        {...attributes}
        className="flex touch-none cursor-grab flex-wrap items-center gap-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div
          className="flex items-center gap-1"
          data-dnd-cancel
          onPointerDown={cancelDrag}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            aria-label="Rolle nach oben"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            aria-label="Rolle nach unten"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={role.label}
          onChange={(e) => onLabelChange(e.target.value)}
          onPointerDown={cancelDrag}
          className="h-9 w-24 font-semibold uppercase"
          aria-label="Rollenbezeichnung"
        />
        {categories.length > 0 && (
          <div
            className="flex items-center gap-1.5"
            onPointerDown={cancelDrag}
          >
            <Label className="sr-only">Kategorie</Label>
            <Select
              value={role.categoryId ?? ''}
              onChange={(e) =>
                onCategoryChange(e.target.value ? e.target.value : null)
              }
              className="h-9 w-[9.5rem]"
              aria-label="Kategorie"
            >
              <option value="">Ohne Kategorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div
          className="min-w-[10rem] flex-1"
          onPointerDown={cancelDrag}
        >
          <Select
            value={pick}
            onChange={(e) => {
              const id = e.target.value
              if (id) onAddPlayer(id)
              setPick('')
            }}
            className="h-9"
          >
            <option value="">+ Spieler hinzufügen</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDummy ? ' (Dummy)' : ''} · {POSITION_LABELS[p.position]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive"
          onPointerDown={cancelDrag}
          onClick={onRemoveRole}
          aria-label="Rolle entfernen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {assignedPlayerIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Spieler auf die Rolle oder die Liste ziehen. Rolle per Griffzeile auf
          eine Kategorie ziehen oder Kategorie wählen.
        </p>
      ) : (
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {assignedPlayerIds.map((pid, index) => {
              const p = byId.get(pid)
              if (!p) return null
              return (
                <SortableAssignedPlayer
                  key={sortDragId(role.id, pid)}
                  id={sortDragId(role.id, pid)}
                  player={p}
                  rank={index + 1}
                  onRemove={() => onRemovePlayer(pid)}
                />
              )
            })}
          </ul>
        </SortableContext>
      )}
    </div>
  )
}

function SortableAssignedPlayer({
  id,
  player,
  rank,
  onRemove,
}: {
  id: string
  player: Player
  rank: number
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex touch-none cursor-grab select-none items-center gap-2 rounded-md border bg-muted/30 py-1.5 pl-2 pr-1 text-sm active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
        {rank}.
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
      {player.isDummy && (
        <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px]">
          Dummy
        </Badge>
      )}
      <span className="hidden shrink-0 items-center gap-2.5 text-xs text-muted-foreground sm:inline-flex">
        <SalzburgContractEnd player={player} compact />
        {POSITION_LABELS[player.position]}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label={`${player.name} von Rolle entfernen`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  )
}
