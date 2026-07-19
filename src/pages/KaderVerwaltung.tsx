import { useRef, useState } from 'react'
import {
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { POSITION_LABELS, type Player } from '@/types'
import {
  TEMPLATE_PLAYER_COUNT,
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

export function KaderVerwaltung() {
  const players = useKaderStore((s) => s.players)
  const hydrated = useKaderStore((s) => s._hasHydrated)
  const addPlayer = useKaderStore((s) => s.addPlayer)
  const updatePlayer = useKaderStore((s) => s.updatePlayer)
  const removePlayer = useKaderStore((s) => s.removePlayer)
  const exportJSON = useKaderStore((s) => s.exportJSON)
  const importJSON = useKaderStore((s) => s.importJSON)
  const loadSalzburgTemplate = useKaderStore((s) => s.loadSalzburgTemplate)
  const clearKader = useKaderStore((s) => s.clearKader)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Player | undefined>(undefined)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const realPlayers = players.filter((p) => !p.isDummy)
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
        'Aktuellen lokalen Kader durch das FC-Salzburg-Template ersetzen?',
      )
    ) {
      return
    }
    loadSalzburgTemplate()
    flash(
      `Template geladen (${TEMPLATE_PLAYER_COUNT} Spieler). Nur lokal in diesem Browser gespeichert.`,
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
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kader-Verwaltung</h1>
          <p className="text-sm text-muted-foreground">
            {hydrated
              ? `${realPlayers.length} Spieler · nur lokal in diesem Browser`
              : 'Lade lokalen Stand …'}
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
            onClick={handleExport}
            disabled={!hydrated || players.length === 0}
          >
            <Download /> Export
          </Button>
          {!isEmpty && (
            <Button variant="outline" onClick={handleLoadTemplate}>
              <Users /> Template
            </Button>
          )}
          {!isEmpty && (
            <Button variant="outline" onClick={handleClear}>
              Leeren
            </Button>
          )}
          <Button onClick={openNew}>
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
            Gerät. Du kannst das FC-Salzburg-Beispiel laden, JSON importieren
            oder Spieler manuell anlegen.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={handleLoadTemplate}>
              <Users /> FC-Salzburg-Template laden ({TEMPLATE_PLAYER_COUNT})
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Alter</TableHead>
                <TableHead>Phasen</TableHead>
                <TableHead>UEFA-Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hydrated && (
                <TableRow>
                  <TableCell
                    className="py-8 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    Lade …
                  </TableCell>
                </TableRow>
              )}
              {hydrated &&
                realPlayers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{POSITION_LABELS[p.position]}</TableCell>
                    <TableCell>{getAge(p.birthDate)}</TableCell>
                    <TableCell>{p.contracts.length}</TableCell>
                    <TableCell>
                      <PlayerCategoryBadges player={p} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
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
