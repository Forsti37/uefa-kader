import { X } from 'lucide-react'
import {
  TEMPLATE_CONTENT_NOTES,
  TEMPLATE_CONTENT_TITLE,
  TEMPLATE_CONTENT_VERSION,
} from '@/lib/templateContentVersion'
import { useKaderStore } from '@/store'
import { Button } from '@/components/ui/button'

type TemplateUpdateBannerProps = {
  onOpenVerwaltung: () => void
  onOpenPlanung: () => void
}

export function TemplateUpdateBanner({
  onOpenVerwaltung,
  onOpenPlanung,
}: TemplateUpdateBannerProps) {
  const hydrated = useKaderStore((s) => s._hasHydrated)
  const seen = useKaderStore((s) => s.seenTemplateContentVersion)
  const dismiss = useKaderStore((s) => s.dismissTemplateContentUpdate)

  if (!hydrated || seen >= TEMPLATE_CONTENT_VERSION) return null

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 text-sm text-foreground">
      <div className="mx-auto flex max-w-7xl gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="font-semibold">{TEMPLATE_CONTENT_TITLE}</div>
          <p className="text-muted-foreground">
            Die mitgelieferten Vorlagen wurden aktualisiert. Dein lokaler Kader
            bleibt unverändert – lade die Templates bei Bedarf neu.
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            {TEMPLATE_CONTENT_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" onClick={onOpenVerwaltung}>
              Zur Kader-Verwaltung
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onOpenPlanung}>
              Zur Kaderplanung
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              Später
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={dismiss}
          aria-label="Hinweis schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
