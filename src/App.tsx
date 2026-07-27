import { useState } from 'react'
import {
  BookOpen,
  ClipboardList,
  Info,
  LandPlot,
  LayoutGrid,
  ListChecks,
  Shield,
  Users2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplateUpdateBanner } from '@/components/TemplateUpdateBanner'
import { Hinweise } from '@/pages/Hinweise'
import { Kaderplanung } from '@/pages/Kaderplanung'
import { Aufstellung } from '@/pages/Aufstellung'
import { KaderVerwaltung } from '@/pages/KaderVerwaltung'
import { KaderUebersicht } from '@/pages/KaderUebersicht'
import { RegelUebersicht } from '@/pages/RegelUebersicht'
import { UefaDraft } from '@/pages/UefaDraft'

type PageId =
  | 'verwaltung'
  | 'uebersicht'
  | 'planung'
  | 'aufstellung'
  | 'draft'
  | 'regeln'
  | 'hinweise'

const NAV: { id: PageId; label: string; icon: typeof ClipboardList }[] = [
  { id: 'verwaltung', label: 'Kader-Verwaltung', icon: ClipboardList },
  { id: 'uebersicht', label: 'Kader-Übersicht', icon: LayoutGrid },
  { id: 'planung', label: 'Kaderplanung', icon: Users2 },
  { id: 'aufstellung', label: 'Aufstellung', icon: LandPlot },
  { id: 'draft', label: 'UEFA-Registrierung', icon: ListChecks },
  { id: 'regeln', label: 'Regelübersicht', icon: BookOpen },
  { id: 'hinweise', label: 'Hinweise', icon: Info },
]

function App() {
  const [page, setPage] = useState<PageId>('verwaltung')

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground md:h-svh md:flex-row md:overflow-hidden">
      <aside className="sticky top-0 z-30 flex flex-col gap-1 border-b bg-card p-3 sm:p-4 md:static md:h-svh md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-2 flex items-center gap-3 px-2 md:mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground md:h-10 md:w-10">
            <Shield className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="leading-tight">
            <div className="font-bold">Kaderplaner</div>
            <div className="text-xs text-muted-foreground">
              Inoffizielles Planungs-Tool
            </div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors md:flex-none md:px-3',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap md:truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto hidden space-y-2 px-2 text-xs text-muted-foreground md:block">
          <p>
            UEFA Champions League 2026/27
            <br />
            Artikel 30 / 31 · nur lokal gespeichert
          </p>
          <p>
            Nicht mit UEFA / FC Red Bull Salzburg verbunden.{' '}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setPage('hinweise')}
            >
              Mehr
            </button>
          </p>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden md:h-svh md:overflow-y-auto">
        <TemplateUpdateBanner
          onOpenVerwaltung={() => setPage('verwaltung')}
          onOpenPlanung={() => setPage('planung')}
        />
        <div className="min-h-0 flex-1">
          {page === 'verwaltung' && <KaderVerwaltung />}
          {page === 'uebersicht' && <KaderUebersicht />}
          {page === 'planung' && <Kaderplanung />}
          {page === 'aufstellung' && <Aufstellung />}
          {page === 'draft' && <UefaDraft />}
          {page === 'regeln' && <RegelUebersicht />}
          {page === 'hinweise' && <Hinweise />}
        </div>
      </main>
    </div>
  )
}

export default App
