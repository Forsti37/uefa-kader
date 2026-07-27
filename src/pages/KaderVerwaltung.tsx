import { useMemo, useRef, useState } from 'react'
import {
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { POSITION_LABELS, type Player, sortByPosition } from '@/types'
import {
  TEMPLATE_PLAYER_COUNT,
  TEMPLATE_PLAYER_COUNT_CORE,
  useKaderStore,
} from '@/store'
import { getAge } from '@/lib/uefaUtils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog } from '@/components/ui/dialog'
import { PlayerForm } from '@/components/PlayerForm'
import { PlayerCategoryBadges } from '@/components/UefaBadges'
import { SalzburgContractEnd } from '@/components/SalzburgContractEnd'

export function KaderVerwaltung() {
  const players = useKaderStore((s) => s.players)
  const hydrated = useKaderStore((s) => s._hasHydrated)
  const addPlayer = useKaderStore((s) => s.addPlayer)
  const updatePlayer = useKaderStore((s) => s.updatePlayer)
  const removePlayer = useKaderStore((s) => s.removePlayer)
  const exportJSON = useKaderStore((s) => s.exportJSON)
  const importJSON = useKaderStore((s) => s.importJSON)
  const loadSalzburgTemplate = useKaderStore((s) => s.loadSalzburgTemplate)
  const loadSalzburgCoreTemplate = useKaderStore(
    (s) => s.loadSalzburgCoreTemplate,
  )
  const clearKader = useKaderStore((s) => s.clearKader)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Player | undefined>(undefined)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const realPlayers = useMemo(
    () => sortByPosition(players.filter((p) => !p.isDummy)),
    [players],
  )
  const isEmpty = hydrated && realPlayers.length === 0

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 4000)
  }

  function openNew() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(player: Player) {
    setEditing(player)
    setDialogOpen(true)
  }

  function handleSubmit(player: Player) {
    if (editing) updatePlayer(player)
    else addPlayer(player)
    setDialogOpen(false)
  }

  function handleExport() {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `uefa-kader-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importJSON(String(reader.result))
      flash(
        result.ok
          ? 'Import erfolgreich. Daten liegen nur lokal in diesem Browser.'
          : `Import fehlgeschlagen: ${result.error}`,
      )
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleLoadTemplate() {
    if (
      realPlayers.length > 0 &&
      !window.confirm(
        'Aktuellen lokalen Kader durch das FC-Salzburg-Template (vollständig) ersetzen?',
      )
    ) {
      return
    }
    loadSalzburgTemplate()
    flash(
      `Vollständiges Template geladen (${TEMPLATE_PLAYER_COUNT} Spieler). Nur lokal in diesem Browser gespeichert.`,
    )
  }

  function handleLoadCoreTemplate() {
    if (
      realPlayers.length > 0 &&
      !window.confirm(
        'Aktuellen lokalen Kader durch das Salzburg-Kernkader-Template (ohne Liefering/gelistete Spieler) ersetzen?',
      )
    ) {
      return
    }
    loadSalzburgCoreTemplate()
    flash(
      `Kernkader geladen (${TEMPLATE_PLAYER_COUNT_CORE} Spieler). Nur lokal in diesem Browser gespeichert.`,
    )
  }

  function handleClear() {
    if (
      !window.confirm(
        'Gesamten lokalen Kader und Draft löschen? (Export vorher empfohlen.)',
      )
    ) {
      return
    }
    clearKader()
    flash('Lokaler Kader geleert.')
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">Kader-Verwaltung</h1>
          <p className="text-sm text-muted-foreground">
            {hydrated
              ? `${realPlayers.length} Spieler · nur lokal in diesem Browser`
              : 'Lade lokalen Stand …'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            size="sm"
            className="sm:h-9 sm:px-4 sm:text-sm"
            onClick={() => fileInput.current?.click()}
          >
            <Upload /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="sm:h-9 sm:px-4 sm:text-sm"
            onClick={handleExport}
            disabled={!hydrated || players.length === 0}
          >
            <Download /> Export
          </Button>
          {!isEmpty && (
            <Button
              variant="outline"
              size="sm"
              className="sm:h-9 sm:px-4 sm:text-sm"
              onClick={handleLoadTemplate}
            >
              <Users />{' '}
              <span className="hidden sm:inline">Template voll</span>
              <span className="sm:hidden">Voll</span>
            </Button>
          )}
          {!isEmpty && (
            <Button
              variant="outline"
              size="sm"
              className="sm:h-9 sm:px-4 sm:text-sm"
              onClick={handleLoadCoreTemplate}
            >
              <Users /> Kernkader
            </Button>
          )}
          {!isEmpty && (
            <Button
              variant="outline"
              size="sm"
              className="sm:h-9 sm:px-4 sm:text-sm"
              onClick={handleClear}
            >
              Leeren
            </Button>
          )}
          <Button
            size="sm"
            className="sm:h-9 sm:px-4 sm:text-sm"
            onClick={openNew}
          >
            <Plus /> Spieler
          </Button>
        </div>
      </div>

      {notice && (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm">{notice}</p>
      )}

      {isEmpty && (
        <div className="rounded-lg border border-dashed bg-card px-5 py-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Noch kein Kader</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Es gibt keinen gemeinsamen Online-Kader. Alles bleibt auf deinem
            Gerät. Du kannst ein Salzburg-Template laden, JSON importieren oder
            Spieler manuell anlegen.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={handleLoadCoreTemplate}>
              <Users /> Kernkader laden ({TEMPLATE_PLAYER_COUNT_CORE})
            </Button>
            <Button variant="outline" onClick={handleLoadTemplate}>
              <Users /> Vollständiges Template ({TEMPLATE_PLAYER_COUNT})
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload /> JSON importieren
            </Button>
            <Button variant="outline" onClick={openNew}>
              <Plus /> Ersten Spieler anlegen
            </Button>
          </div>
        </div>
      )}

      {(!hydrated || !isEmpty) && (
        <div className="rounded-lg border bg-card">
          <Table className="table-fixed text-xs sm:text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32%] px-2 sm:w-auto sm:px-3">
                  Name
                </TableHead>
                <TableHead className="w-[18%] px-2 sm:w-auto sm:px-3">
                  Position
                </TableHead>
                <TableHead className="w-[10%] px-1 sm:w-auto sm:px-3">
                  Alter
                </TableHead>
                <TableHead className="hidden px-3 md:table-cell">
                  Phasen
                </TableHead>
                <TableHead className="w-[22%] px-2 sm:w-auto sm:px-3">
                  UEFA
                </TableHead>
                <TableHead className="w-[12%] px-1 sm:w-auto sm:px-3">
                  Vertrag
                </TableHead>
                <TableHead className="w-[10%] px-1 text-right sm:w-auto sm:px-3">
                  <span className="hidden sm:inline">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hydrated && (
                <TableRow>
                  <TableCell
                    className="py-8 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    Lade …
                  </TableCell>
                </TableRow>
              )}
              {hydrated &&
                realPlayers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="truncate px-2 font-medium sm:px-3">
                      {p.name}
                    </TableCell>
                    <TableCell className="truncate px-2 sm:px-3">
                      {POSITION_LABELS[p.position]}
                    </TableCell>
                    <TableCell className="px-1 sm:px-3">
                      {getAge(p.birthDate)}
                    </TableCell>
                    <TableCell className="hidden px-3 md:table-cell">
                      {p.contracts.length}
                    </TableCell>
                    <TableCell className="px-2 sm:px-3">
                      <PlayerCategoryBadges player={p} />
                    </TableCell>
                    <TableCell className="px-1 sm:px-3">
                      <SalzburgContractEnd player={p} compact />
                    </TableCell>
                    <TableCell className="px-1 sm:px-3">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removePlayer(p.id)}
                          aria-label="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <PlayerForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </Dialog>
    </div>
  )
}
