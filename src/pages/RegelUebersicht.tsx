import type { ReactNode } from 'react'
import {
  ASSOCIATION_TRAINED_MAX,
  GOALKEEPERS_REQUIRED,
  GOALKEEPERS_TOTAL_REQUIRED,
  LIST_A_MAX,
  LIST_B_BIRTH_CUTOFF,
  LOCALLY_TRAINED_REQUIRED,
  TRAINED_MIN_MONTHS,
  TRAINED_MIN_SEASONS,
  TRAINING_WINDOW_END_AGE,
  TRAINING_WINDOW_START_AGE,
} from '@/lib/uefaUtils'

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

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-foreground/90">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

const birthCutoffDe = (() => {
  const [y, m, d] = LIST_B_BIRTH_CUTOFF.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('de-AT', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})()

export function RegelUebersicht() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Regelübersicht</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          So wertet dieser Kaderplaner die UEFA Champions League 2026/27 aus
          (Artikel 30 und 31). Die Texte folgen der Logik in der App – nicht
          einer juristischen Vollzitation des Reglements.
        </p>
      </div>

      <Section title="Registrierungskategorien in den Phasen">
        <p>
          Pro Phase zählt nur die offizielle Registrierung, nicht der
          Trainingsort. Der Vereinsname ist für die Auswertung egal.
        </p>
        <RuleList
          items={[
            'FC Red Bull Salzburg: Registrierung beim Club selbst (inkl. Akademie, wenn offiziell für den FCS gemeldet). Zählt für Club-Trained und Association-Trained sowie für die B-Liste.',
            'ÖFB Verbandsverein: anderer Verein des österreichischen Verbands (z. B. Liefering, WAC). Zählt nur für Association-Trained, nicht für Club-Trained und nicht für die B-Liste (außer als zulässige Leihe unter B-Listen-Regel b).',
            'Ausländischer Verein: anderer Verband. Kein Ausbildungsbonus.',
          ]}
        />
      </Section>

      <Section title="Ausbildungsfenster (Art. 30)">
        <p>
          Anrechenbare Ausbildungszeit liegt zwischen dem{' '}
          {TRAINING_WINDOW_START_AGE}. und dem {TRAINING_WINDOW_END_AGE}.
          Lebensjahr – genauer: vom Beginn der Saison, in der der Spieler{' '}
          {TRAINING_WINDOW_START_AGE} wird, bis zum Ende der Saison, in der er{' '}
          {TRAINING_WINDOW_END_AGE} wird (Näherung Saison 1.7.–30.6.).
        </p>
        <p>
          Für den aktuellen Status zählt nur bereits abgeleistete Zeit bis zum
          gewählten Stichtag – künftige Vertragsmonate erhöhen den Status erst,
          wenn sie erreicht sind (außer bei der Status-Projektion).
        </p>
      </Section>

      <Section title="Club-Trained (CTP)">
        <p>
          Erfüllt, wenn im Ausbildungsfenster beim FC Red Bull Salzburg
          mindestens eine der beiden Alternativen gilt:
        </p>
        <RuleList
          items={[
            `mindestens ${TRAINED_MIN_MONTHS} Monate Registrierung, oder`,
            `mindestens ${TRAINED_MIN_SEASONS} volle Saisons durchgehende Registrierung (mit geringer Toleranz am Saisonbeginn).`,
          ]}
        />
        <p>
          Liefering und rein akademische Verbandsregistrierungen ohne FCS-Meldung
          zählen hier nicht.
        </p>
      </Section>

      <Section title="Association-Trained (ATP)">
        <p>
          Erfüllt mit denselben Schwellen ({TRAINED_MIN_MONTHS} Monate oder{' '}
          {TRAINED_MIN_SEASONS} volle Saisons), aber Zeiten beim FC Salzburg und
          bei ÖFB-Verbandsvereinen werden zusammengezählt.
        </p>
        <p>
          Club-Trained hat Vorrang: wer CTP ist, wird als CTP geführt, nicht als
          ATP.
        </p>
      </Section>

      <Section title="Locally-Trained und A-Liste (Art. 30 / 31)">
        <RuleList
          items={[
            `Maximal ${LIST_A_MAX} Spieler auf der A-Liste.`,
            `Davon sind ${LOCALLY_TRAINED_REQUIRED} Plätze für locally-trained Spieler reserviert (CTP oder ATP).`,
            `Von diesen ${LOCALLY_TRAINED_REQUIRED} dürfen höchstens ${ASSOCIATION_TRAINED_MAX} als Association-Trained angerechnet werden; weitere ATP belegen trotzdem A-Listen-Plätze, füllen die Reservierung aber nicht weiter.`,
            'Fehlen anrechenbare locally-trained Spieler, schrumpft die erlaubte A-Listen-Größe um den Fehlbetrag (gesperrte Plätze).',
            'Non-Local-Limit = erlaubte A-Größe minus alle CTP und alle ATP auf der Liste (auch überzählige ATP).',
          ]}
        />
      </Section>

      <Section title="Torhüter (Art. 31)">
        <RuleList
          items={[
            `Mindestens ${GOALKEEPERS_REQUIRED} Torhüter auf der A-Liste.`,
            `Mindestens ${GOALKEEPERS_TOTAL_REQUIRED} Torhüter insgesamt auf A- und B-Liste zusammen.`,
          ]}
        />
      </Section>

      <Section title="B-Liste (Art. 31)">
        <p>
          Ein Spieler darf auf die B-Liste, wenn er am oder nach dem{' '}
          {birthCutoffDe} geboren ist und eine der folgenden Bedingungen erfüllt
          (nur Zeit bis zum Stichtag; nur FC-Salzburg-Registrierung, außer bei
          Regel b):
        </p>
        <RuleList
          items={[
            '(a) Seit dem 15. Geburtstag irgendein ununterbrochener Zeitraum von 2 Jahren beim FC Salzburg – auch wenn dieser Zeitraum schon abgeschlossen ist.',
            '(b) Seit dem 15. Geburtstag 3 aufeinanderfolgende Jahre beim FC Salzburg, wobei höchstens eine Leihe an einen ÖFB-Verbandsverein von maximal einem Jahr die Durchgängigkeit nicht unterbricht.',
            '(c) Ausnahme im 16. Lebensjahr: 2 Jahre ununterbrochen beim FC Salzburg (Zählung darf vor dem 15. Geburtstag beginnen); gilt nur, solange der Spieler 16 ist.',
          ]}
        />
        <p>
          Akademie/Liefering als ÖFB-Verbandsverein erfüllen die
          FC-Salzburg-Anforderung der B-Liste nicht.
        </p>
      </Section>

      <Section title="Phasen pflegen">
        <RuleList
          items={[
            'Phasen sollten lückenlos und ohne sinnlose Überlappungen die Registrierungshistorie abbilden.',
            '„Leihe“ markieren, wenn die Phase eine Leihe war – relevant vor allem für B-Listen-Regel (b).',
            'Stichtag in der UEFA-Registrierung steuert, welche Zeit schon zählt und wie Status/Validierung berechnet werden.',
          ]}
        />
      </Section>
    </div>
  )
}
