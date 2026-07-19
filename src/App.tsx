import { useState } from 'react'
import {
  BookOpen,
  ClipboardList,
  Info,
  LayoutGrid,
  ListChecks,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Hinweise } from '@/pages/Hinweise'
import { KaderVerwaltung } from '@/pages/KaderVerwaltung'
import { KaderUebersicht } from '@/pages/KaderUebersicht'
import { RegelUebersicht } from '@/pages/RegelUebersicht'
import { UefaDraft } from '@/pages/UefaDraft'

type PageId = 'verwaltung' | 'uebersicht' | 'draft' | 'regeln' | 'hinweise'

const NAV: { id: PageId; label: string; icon: typeof ClipboardList }[] = [
  { id: 'verwaltung', label: 'Kader-Verwaltung', icon: ClipboardList },
  { id: 'uebersicht', label: 'Kader-Übersicht', icon: LayoutGrid },
  { id: 'draft', label: 'UEFA-Registrierung', icon: ListChecks },
  { id: 'regeln', label: 'Regelübersicht', icon: BookOpen },
  { id: 'hinweise', label: 'Hinweise', icon: Info },
]

function App() {
  const [page, setPage] = useState<PageId>('verwaltung')

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground md:h-svh md:flex-row md:overflow-hidden">
      <aside className="sticky top-0 z-30 flex flex-col gap-1 border-b bg-card p-4 md:static md:h-svh md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="font-bold">Kaderplaner</div>
            <div className="text-xs text-muted-foreground">
              Inoffizielles Planungs-Tool
            </div>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:flex-none',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
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

      <main className="flex-1 overflow-x-hidden md:h-svh md:overflow-y-auto">
        {page === 'verwaltung' && <KaderVerwaltung />}
        {page === 'uebersicht' && <KaderUebersicht />}
        {page === 'draft' && <UefaDraft />}
        {page === 'regeln' && <RegelUebersicht />}
        {page === 'hinweise' && <Hinweise />}
      </main>
    </div>
  )
}

export default App
