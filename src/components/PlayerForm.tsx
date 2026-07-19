import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  CLUB_CATEGORY_LABELS,
  POSITION_LABELS,
  type ClubCategory,
  type ContractPeriod,
  type Player,
  type Position,
} from '@/types'
import { emptyContract, uid } from '@/store'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface PlayerFormProps {
  initial?: Player
  onSubmit: (player: Player) => void
  onCancel: () => void
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD']
const CATEGORIES: ClubCategory[] = [
  'FC_SALZBURG',
  'ASSOCIATION_CLUB',
  'FOREIGN_CLUB',
]

export function PlayerForm({ initial, onSubmit, onCancel }: PlayerFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '')
  const [position, setPosition] = useState<Position>(
    initial?.position ?? 'MID',
  )
  const [contracts, setContracts] = useState<ContractPeriod[]>(
    initial?.contracts?.length ? initial.contracts : [emptyContract()],
  )
  const [error, setError] = useState<string | null>(null)

  function updateContract(id: string, patch: Partial<ContractPeriod>) {
    setContracts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addContract() {
    setContracts((cs) => [...cs, emptyContract()])
  }

  function removeContract(id: string) {
    setContracts((cs) => cs.filter((c) => c.id !== id))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Bitte einen Namen angeben.')
    if (!birthDate) return setError('Bitte ein Geburtsdatum angeben.')
    for (const c of contracts) {
      if (!c.startDate || !c.endDate) {
        return setError('Jede Phase braucht Von- und Bis-Datum.')
      }
      if (c.endDate < c.startDate) {
        return setError('Bis-Datum darf nicht vor dem Von-Datum liegen.')
      }
    }

    const player: Player = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      birthDate,
      position,
      isDummy: initial?.isDummy ?? false,
      contracts: contracts.map((c) => ({
        ...c,
        clubName: c.clubName.trim() || CLUB_CATEGORY_LABELS[c.clubCategory],
        clubId: c.clubId.trim() || c.clubCategory.toLowerCase(),
      })),
    }
    onSubmit(player)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 max-h-[min(92dvh,880px)] flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b px-4 py-3 pr-12 sm:px-5">
        <h2 className="text-base font-semibold sm:text-lg">
          {initial ? 'Spieler bearbeiten' : 'Neuer Spieler'}
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Phasen mit Von/Bis und Kategorie pflegen. Datum: TT.MM.JJJJ möglich.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_auto_auto] sm:gap-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vorname Nachname"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="position">Position</Label>
            <Select
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthDate">Geburtsdatum</Label>
            <DateInput
              id="birthDate"
              value={birthDate}
              onChange={setBirthDate}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Label>Phasen</Label>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Akademie für FCS gemeldet → FC Salzburg. Liefering/andere ÖFB →
                ÖFB Verbandsverein. B-Liste: nur FC Salzburg.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={addContract}
            >
              <Plus /> Phase
            </Button>
          </div>

          {contracts.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Keine Phasen. Mindestens eine hinzufügen.
            </p>
          )}

          <div className="space-y-2">
            {contracts.map((c, idx) => (
              <div
                key={c.id}
                className="space-y-2 rounded-md border bg-muted/20 p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Phase {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => removeContract(c.id)}
                    aria-label={`Phase ${idx + 1} entfernen`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Kategorie
                  </Label>
                  <Select
                    value={c.clubCategory}
                    onChange={(e) =>
                      updateContract(c.id, {
                        clubCategory: e.target.value as ClubCategory,
                      })
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CLUB_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Von
                    </Label>
                    <DateInput
                      value={c.startDate}
                      onChange={(v) => updateContract(c.id, { startDate: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Bis
                    </Label>
                    <DateInput
                      value={c.endDate}
                      onChange={(v) => updateContract(c.id, { endDate: v })}
                    />
                  </div>
                  <label
                    className="col-span-2 flex h-9 items-center gap-2 self-end text-sm sm:col-span-1 sm:px-1"
                    title="Relevant für die B-Listen-Regel"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      checked={c.isLoan}
                      onChange={(e) =>
                        updateContract(c.id, { isLoan: e.target.checked })
                      }
                    />
                    Leihe
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t px-4 py-3 sm:px-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit">Speichern</Button>
      </div>
    </form>
  )
}
