import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  listFormations,
  type FormationId,
} from '@/lib/formationTemplates'
import type { CustomFormation, FormationSlotTemplate } from '@/types'
import { useKaderStore } from '@/store'

type FormationManagerDialogProps = {
  open: boolean
  onClose: () => void
  /** Nach Anlegen optional diese Formation aktivieren. */
  onSelectFormation?: (id: FormationId) => void
}

export function FormationManagerDialog({
  open,
  onClose,
  onSelectFormation,
}: FormationManagerDialogProps) {
  const customFormations = useKaderStore((s) => s.customFormations)
  const lineupFormationId = useKaderStore((s) => s.lineup.formationId)
  const createCustomFormation = useKaderStore((s) => s.createCustomFormation)
  const updateCustomFormation = useKaderStore((s) => s.updateCustomFormation)
  const deleteCustomFormation = useKaderStore((s) => s.deleteCustomFormation)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftSlots, setDraftSlots] = useState<FormationSlotTemplate[]>([])
  const [newBaseId, setNewBaseId] = useState<FormationId>('4-2-3-1')

  useEffect(() => {
    if (!open) return
    const active = customFormations.find((f) => f.id === lineupFormationId)
    if (active) setEditingId(active.id)
  }, [open, lineupFormationId, customFormations])

  useEffect(() => {
    if (!editingId) return
    const f = customFormations.find((c) => c.id === editingId)
    if (!f) return
    setDraftName(f.name)
    setDraftSlots(f.slots.map((s) => ({ ...s })))
  }, [editingId, customFormations])

  function startEdit(f: CustomFormation) {
    setEditingId(f.id)
    setDraftName(f.name)
    setDraftSlots(f.slots.map((s) => ({ ...s })))
  }

  function handleCreate() {
    const name = draftName.trim() || 'Eigene Formation'
    const id = createCustomFormation(name, newBaseId)
    onSelectFormation?.(id)
    const created = useKaderStore
      .getState()
      .customFormations.find((f) => f.id === id)
    if (created) {
      setEditingId(created.id)
      setDraftName(created.name)
      setDraftSlots(created.slots.map((s) => ({ ...s })))
    }
  }

  function handleSave() {
    if (!editingId) return
    updateCustomFormation(editingId, {
      name: draftName,
      slots: draftSlots,
    })
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        'Diese Formation löschen? Sie wird aus der Liste entfernt.',
      )
    ) {
      return
    }
    deleteCustomFormation(id)
    if (editingId === id) setEditingId(null)
  }

  function updateSlotLabel(key: string, label: string) {
    setDraftSlots((prev) =>
      prev.map((s) => (s.key === key ? { ...s, label } : s)),
    )
  }

  const allFormations = listFormations(customFormations)

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <div className="flex max-h-[min(92dvh,880px)] flex-col overflow-hidden p-6 pr-12">
        <h2 className="text-lg font-semibold">Eigene Formationen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eigene Formation anlegen (Kopie einer Vorlage). Positionsnamen hier
          oder direkt auf dem Feld ändern — Positionen auf dem Feld am Griff
          verschieben.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-b pb-4">
          {customFormations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine eigenen Formationen.
            </p>
          ) : (
            customFormations.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={editingId === f.id ? 'default' : 'outline'}
                onClick={() => startEdit(f)}
              >
                {f.name}
              </Button>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Neue Formation (Vorlage)</Label>
            <Select
              value={newBaseId}
              onChange={(e) => setNewBaseId(e.target.value as FormationId)}
              className="h-9"
            >
              {allFormations
                .filter((f) => f.builtin)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    Kopie von {f.name}
                  </option>
                ))}
              {customFormations.map((f) => (
                <option key={f.id} value={f.id}>
                  Kopie von {f.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="z. B. 3-4-3 Variante"
              className="h-9"
            />
          </div>
          <Button type="button" onClick={handleCreate} className="h-9">
            <Plus className="h-4 w-4" /> Anlegen
          </Button>
        </div>

        {editingId && draftSlots.length > 0 ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Positionsnamen bearbeiten</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(editingId)}
                >
                  <Trash2 className="h-4 w-4" /> Löschen
                </Button>
                <Button type="button" size="sm" onClick={handleSave}>
                  Speichern
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Anzeigename</th>
                  </tr>
                </thead>
                <tbody>
                  {draftSlots.map((slot) => (
                    <tr key={slot.key} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {slot.key}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={slot.label}
                          onChange={(e) =>
                            updateSlotLabel(slot.key, e.target.value)
                          }
                          className="h-8"
                          maxLength={24}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Nach „Speichern“ gelten die Namen auch im Export. Das Layout
              (x/y) verschiebst du auf dem Aufstellungs-Feld am Griff.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Formation anlegen oder oben auswählen, um Positionsnamen zu ändern.
          </p>
        )}

        <div className="mt-4 flex justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Schliessen
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
