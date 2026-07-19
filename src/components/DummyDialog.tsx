import { useState } from 'react'
import {
  POSITION_LABELS,
  UEFA_CATEGORY_LABELS,
  type ContractPeriod,
  type Position,
  type UefaCategory,
} from '@/types'
import { uid } from '@/store'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface DummyDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (data: {
    name: string
    birthDate: string
    position: Position
    contracts: ContractPeriod[]
  }) => void
}

/** Verschiebt ein Geburtsdatum um n Jahre (fuer synthetische Vertragsphasen). */
function birthdayPlus(birthDate: string, years: number): string {
  const [y, m, d] = birthDate.split('-')
  return `${Number(y) + years}-${m}-${d}`
}

/**
 * Erzeugt synthetische Vertragsphasen, damit der Dummy die gewaehlte
 * UEFA-Kategorie erfuellt (36 Monate ab dem 15. Geburtstag).
 */
function synthContracts(
  birthDate: string,
  category: UefaCategory,
): ContractPeriod[] {
  if (category === 'NON_LOCAL' || !birthDate) return []
  const start = birthdayPlus(birthDate, 15)
  const end = birthdayPlus(birthDate, 18)
  const isClub = category === 'CTP'
  return [
    {
      id: uid(),
      startDate: start,
      endDate: end,
      clubId: isClub ? 'rbs' : 'assoc',
      clubName: isClub ? 'FC Red Bull Salzburg' : 'ÖFB Verbandsverein',
      clubCategory: isClub ? 'FC_SALZBURG' : 'ASSOCIATION_CLUB',
      isLoan: false,
    },
  ]
}

export function DummyDialog({ open, onClose, onCreate }: DummyDialogProps) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [position, setPosition] = useState<Position>('MID')
  const [category, setCategory] = useState<UefaCategory>('NON_LOCAL')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setBirthDate('')
    setPosition('MID')
    setCategory('NON_LOCAL')
    setError(null)
  }

  function handleCreate() {
    if (!name.trim()) return setError('Bitte einen Namen angeben.')
    if (!birthDate) return setError('Bitte ein Geburtsdatum angeben.')
    onCreate({
      name: name.trim(),
      birthDate,
      position,
      contracts: synthContracts(birthDate, category),
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <div className="space-y-4 overflow-y-auto p-4 pr-12 sm:p-5">
        <div>
          <h2 className="text-base font-semibold sm:text-lg">Dummy-Spieler erstellen</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Virtueller Transfer nur für dieses Szenario - die echte Datenbank
            bleibt unverändert.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="dummy-name">Name</Label>
          <Input
            id="dummy-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Neuer Transfer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dummy-birth">Geburtsdatum</Label>
            <DateInput
              id="dummy-birth"
              value={birthDate}
              onChange={setBirthDate}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dummy-pos">Position</Label>
            <Select
              id="dummy-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
            >
              {(['GK', 'DEF', 'MID', 'FWD'] as Position[]).map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="dummy-cat">Angenommene UEFA-Kategorie</Label>
          <Select
            id="dummy-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as UefaCategory)}
          >
            {(['CTP', 'ATP', 'NON_LOCAL'] as UefaCategory[]).map((c) => (
              <option key={c} value={c}>
                {UEFA_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Es werden passende Vertragsphasen automatisch erzeugt.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleCreate}>Erstellen</Button>
        </div>
      </div>
    </Dialog>
  )
}
