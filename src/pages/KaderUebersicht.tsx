import { useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, Filter, TrendingUp } from 'lucide-react'
import {
  POSITION_LABELS,
  UEFA_CATEGORY_LABELS,
  type Player,
  type Position,
  type UefaCategory,
} from '@/types'
import { useKaderStore } from '@/store'
import {
  getAge,
  getUefaCategory,
  isListBEligible,
  projectUefaStatus,
  type UefaProjection,
} from '@/lib/uefaUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateInput } from '@/components/ui/date-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PlayerCategoryBadges } from '@/components/UefaBadges'

type PositionFilter = Position | 'ALL'
type CategoryFilter = UefaCategory | 'ALL'
type ListFilter = 'ALL' | 'A_ONLY' | 'B_ELIGIBLE'
type ReachableFilter = 'ALL' | 'YES' | 'NO'

/** Formatiert ein ISO-Datum (YYYY-MM-DD) als deutsches Datum (TT.MM.JJJJ). */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function KaderUebersicht() {
  const players = useKaderStore((s) => s.players)
  const realPlayers = useMemo(
    () => players.filter((p) => !p.isDummy),
    [players],
  )

  const [minAge, setMinAge] = useState('')
  const [maxAge, setMaxAge] = useState('')
  const [position, setPosition] = useState<PositionFilter>('ALL')
  const [category, setCategory] = useState<CategoryFilter>('ALL')
  const [listFilter, setListFilter] = useState<ListFilter>('ALL')
  const [reachable, setReachable] = useState<ReachableFilter>('ALL')
  const [reachableBy, setReachableBy] = useState('')

  // Projektion je Spieler (ob/wann ein besserer UEFA-Status erreichbar ist).
  const projections = useMemo(() => {
    const map = new Map<string, UefaProjection>()
    for (const p of realPlayers) map.set(p.id, projectUefaStatus(p))
    return map
  }, [realPlayers])

  const filtered = useMemo(() => {
    return realPlayers.filter((p) => {
      const age = getAge(p.birthDate)
      if (minAge && age < Number(minAge)) return false
      if (maxAge && age > Number(maxAge)) return false
      if (position !== 'ALL' && p.position !== position) return false
      if (category !== 'ALL' && getUefaCategory(p) !== category) return false
      if (listFilter === 'B_ELIGIBLE' && !isListBEligible(p)) return false
      if (listFilter === 'A_ONLY' && isListBEligible(p)) return false

      const proj = projections.get(p.id)
      const canReachSomething =
        Boolean(proj?.canImprove) || Boolean(proj?.listBDate)
      if (reachable === 'YES' && !canReachSomething) return false
      if (reachable === 'NO' && canReachSomething) return false
      if (reachableBy) {
        const dates = [proj?.date, proj?.listBDate].filter(
          (d): d is string => Boolean(d),
        )
        if (dates.length === 0) return false
        if (!dates.some((d) => d <= reachableBy)) return false
      }
      return true
    })
  }, [
    realPlayers,
    minAge,
    maxAge,
    position,
    category,
    listFilter,
    reachable,
    reachableBy,
    projections,
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Kader-Übersicht</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} von {realPlayers.length} Spielern
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Alter von</Label>
              <Input
                type="number"
                min={0}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="z. B. 18"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alter bis</Label>
              <Input
                type="number"
                min={0}
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="z. B. 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Select
                value={position}
                onChange={(e) => setPosition(e.target.value as PositionFilter)}
              >
                <option value="ALL">Alle</option>
                {(['GK', 'DEF', 'MID', 'FWD'] as Position[]).map((p) => (
                  <option key={p} value={p}>
                    {POSITION_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>UEFA-Kategorie</Label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryFilter)}
              >
                <option value="ALL">Alle</option>
                {(['CTP', 'ATP', 'NON_LOCAL'] as UefaCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {UEFA_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>B-Listen-Berechtigung</Label>
              <Select
                value={listFilter}
                onChange={(e) => setListFilter(e.target.value as ListFilter)}
              >
                <option value="ALL">Alle</option>
                <option value="B_ELIGIBLE">B-Liste berechtigt</option>
                <option value="A_ONLY">Nicht B-Liste berechtigt</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status noch erreichbar</Label>
              <Select
                value={reachable}
                onChange={(e) =>
                  setReachable(e.target.value as ReachableFilter)
                }
              >
                <option value="ALL">Alle</option>
                <option value="YES">Ja</option>
                <option value="NO">Nein</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Erreichbar bis</Label>
              <DateInput
                value={reachableBy}
                onChange={setReachableBy}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            projection={projections.get(p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-md border border-dashed p-8 text-center text-muted-foreground">
            Keine Spieler entsprechen den Filtern.
          </p>
        )}
      </div>
    </div>
  )
}

function PlayerCard({
  player,
  projection,
}: {
  player: Player
  projection?: UefaProjection
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="font-semibold">{player.name}</div>
          <div className="text-sm text-muted-foreground">
            {POSITION_LABELS[player.position]} - {getAge(player.birthDate)} Jahre
          </div>
        </div>
        <PlayerCategoryBadges player={player} />
        <ProjectionLine projection={projection} />
      </CardContent>
    </Card>
  )
}

function ProjectionLine({ projection }: { projection?: UefaProjection }) {
  if (!projection) return null

  const lines: ReactNode[] = []

  if (projection.current === 'CTP') {
    lines.push(
      <div
        key="ctp"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        Höchster Ausbildungsstatus erreicht (Club-Trained)
      </div>,
    )
  } else if (projection.canImprove && projection.futureStatus && projection.date) {
    lines.push(
      <div
        key="improve"
        className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--success))]"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {UEFA_CATEGORY_LABELS[projection.futureStatus]} erreichbar am{' '}
        {formatDate(projection.date)}
      </div>,
    )
  } else {
    lines.push(
      <div
        key="no-improve"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        Kein weiterer Ausbildungsstatus erreichbar
      </div>,
    )
  }

  if (projection.listBDate) {
    lines.push(
      <div
        key="blist"
        className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--success))]"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        B-Liste erreichbar ab {formatDate(projection.listBDate)}
      </div>,
    )
  }

  return <div className="space-y-1">{lines}</div>
}
