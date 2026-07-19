import type { ReactNode } from 'react'

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

export function Hinweise() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Hinweise</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kurz und klar, was dieses Tool ist – und was nicht.
        </p>
      </div>

      <Section title="Inoffizielles Planungs-Tool">
        <p>
          Nicht mit UEFA, ÖFB oder FC Red Bull Salzburg verbunden oder von ihnen
          freigegeben. Marken und Namen gehören den jeweiligen Rechteinhabern.
        </p>
        <p>
          Die App ersetzt keine offizielle Listenmeldung. Die Regelauswertung ist
          eine Hilfe und kann vom aktuellen Reglement oder Einzelfällen
          abweichen.
        </p>
      </Section>

      <Section title="Keine Anmeldung">
        <p>
          Du brauchst keinen Account. Es gibt keinen gemeinsamen Online-Kader:
          Spieler und UEFA-Listen liegen nur in{' '}
          <strong className="text-foreground">deinem Browser</strong>{' '}
          (LocalStorage). Andere Nutzer sehen deine Daten nicht.
        </p>
        <p>
          Anderes Gerät, anderer Browser oder gelöschte Browserdaten = wieder
          leer – außer du importierst vorher ein JSON-Backup (Kader-Verwaltung →
          Export/Import).
        </p>
      </Section>

      <Section title="Template & eigene Daten">
        <p>
          Das FC-Salzburg-Template ist ein optionaler Startpunkt. Die
          UEFA-Registrierung (A-/B-Liste) startet dabei leer – die Zuordnung
          machst du selbst.
        </p>
        <p>
          Was du speicherst, exportierst oder weitergibst, liegt in deiner
          Verantwortung.
        </p>
      </Section>

      <Section title="Haftung">
        <p>
          Keine Gewähr für Richtigkeit der Auswertung oder Aktualität des
          Templates. Nutzung auf eigene Gefahr.
        </p>
      </Section>
    </div>
  )
}
