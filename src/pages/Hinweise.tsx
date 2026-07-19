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
        <h1 className="text-2xl font-bold">Hinweise & Rechtliches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kurzüberblick für Betrieb und GitHub-Hosting. Keine Rechtsberatung.
        </p>
      </div>

      <Section title="Inoffizielles Fan-Tool">
        <p>
          Dieses Projekt ist <strong className="text-foreground">nicht</strong>{' '}
          mit UEFA, ÖFB, FC Red Bull Salzburg, Red Bull oder verbundenen Marken
          verbunden, von ihnen genehmigt oder unterstützt. Alle genannten Marken
          und Namen gehören den jeweiligen Rechteinhabern.
        </p>
        <p>
          Die App ersetzt keine offizielle Registrierung und keine Auskunft der
          Verbände/Clubs. Regelauswertung ist eine Planungshilfe und kann vom
          aktuellen Reglement oder Einzelfallentscheidungen abweichen.
        </p>
      </Section>

      <Section title="Keine Anmeldung, nur lokale Daten">
        <p>
          Es gibt keinen Account und keinen gemeinsamen Online-Kader. Spieler,
          Phasen und Draft werden im{' '}
          <strong className="text-foreground">LocalStorage deines Browsers</strong>{' '}
          gespeichert. Andere Nutzer sehen deine Änderungen nicht. Löschen von
          Browserdaten, anderes Gerät oder anderer Browser = leerer Stand (außer
          du importierst ein JSON-Backup).
        </p>
        <p>
          Import/Export in der Kader-Verwaltung dient dem Backup und dem
          Austausch von Dateien unter eigener Verantwortung.
        </p>
      </Section>

      <Section title="Datenschutz (DSGVO-Kurz)">
        <p>
          Der Betreiber der gehosteten Seite speichert durch diese Client-App
          typischerweise <strong className="text-foreground">keine</strong>{' '}
          Kaderdaten auf einem eigenen Server – die Logik läuft im Browser.
          GitHub Pages liefert nur statische Dateien; GitHub kann dabei übliche
          Server-/Zugriffsprotokolle führen (siehe GitHub-Datenschutz).
        </p>
        <p>
          Namen und Geburtsdaten im Template bzw. in deinem Export sind
          personenbezogene Daten. Du bist dafür verantwortlich, was du speicherst,
          exportierst oder weitergibst. Für eine öffentliche Demo: Template nur
          aus öffentlich bekannten Squad-Infos pflegen und bei Bedarf anonymisieren
          oder entfernen.
        </p>
      </Section>

      <Section title="Was beim GitHub-Hosting relevant ist">
        <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
          <li>
            <strong>Marken / Logos:</strong> Keine offiziellen Club-/UEFA-Wappen
            oder geschützten Assets ohne Erlaubnis verwenden. Text und generische
            Icons sind unkritischer als Logos.
          </li>
          <li>
            <strong>UEFA-Reglement:</strong> Kurze, eigene Erklärungen zur
            Planung sind üblich; das Reglement nicht als Volltext
            weiterveröffentlichen. Keine „offizielle UEFA-Auskunft“ behaupten.
          </li>
          <li>
            <strong>Template-Kader:</strong> Öffentliche Squad-Daten (Namen,
            oft auch Geburtsdaten) sind in Fan-Tools verbreitet, aber nicht
            risikofrei – besonders bei Minderjährigen. Bei Abmahnung/Template
            anpassen oder entfernen.
          </li>
          <li>
            <strong>GitHub ToS:</strong> Keine rechtswidrigen Inhalte; bei
            DMCA/Markenbeschwerden kann GitHub Inhalte entfernen.
          </li>
          <li>
            <strong>Haftung:</strong> Keine Gewähr für Richtigkeit der
            Regelauswertung oder Template-Daten. Nutzung auf eigene Gefahr.
          </li>
        </ul>
      </Section>

      <Section title="Lizenz der Software">
        <p>
          Der Quellcode steht unter MIT (siehe <code>LICENSE</code> im
          Repository). Das gilt für den Code, nicht für Club-/Verbands-Marken und
          nicht für fremde Regeltexte.
        </p>
      </Section>
    </div>
  )
}
