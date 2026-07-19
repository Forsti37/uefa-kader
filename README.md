# UEFA Kaderplaner (inoffiziell)

Client-only Web-App zur Kaderplanung und UEFA-Listen-Vorbereitung (Fokus:
Artikel 30 / 31 Champions League 2026/27).

**Nicht** mit UEFA, ÖFB oder FC Red Bull Salzburg verbunden.

- Keine Anmeldung
- Kader nur lokal im Browser (LocalStorage), nicht global
- JSON Import/Export in der Kader-Verwaltung
- Mitgeliefertes **FC-Salzburg-Template** per Button ladbar (wenn der Kader leer
  ist oder bewusst ersetzt wird)

## Tech-Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand (`persist` → LocalStorage)
- dnd-kit, lucide-react, Vitest

## Lokal starten

```bash
npm install
npm run dev      # http://localhost:1933
npm run build
npm run test
npm run preview  # Production-Build lokal ansehen
```

## GitHub Pages hosten

1. Repo auf GitHub anlegen und pushen (Branch `main` oder `master`).
2. Unter **Settings → Pages → Build and deployment** als Source
   **GitHub Actions** wählen.
3. Der Workflow `.github/workflows/deploy-pages.yml` baut und deployed automatisch.
4. URL typischerweise: `https://<user>.github.io/<repo-name>/`

Der Build setzt `VITE_BASE_PATH=/<repo-name>/`. Für eine **User-Site**
(`username.github.io`) oder Custom Domain den Workflow anpassen
(`VITE_BASE_PATH: /`).

## Projektstruktur

- `src/types.ts` – Datenmodell
- `src/lib/uefaUtils.ts` – UEFA-Kalkulation (getestet)
- `src/store.ts` – lokaler Zustand, Template, Import/Export
- `src/data/kader-seed.json` – FC-Salzburg-Template
- `src/pages/` – Verwaltung, Übersicht, Registrierung, Regeln, Hinweise

## Seiten

1. **Kader-Verwaltung** – CRUD, Import/Export, Template laden / Kader leeren
2. **Kader-Übersicht** – Filter und Status-Projektion
3. **UEFA-Registrierung** – A-/B-Listen per Drag & Drop, Validierung, PNG-Export
4. **Regelübersicht** – Erklärung der ausgewerteten Regeln
5. **Hinweise** – Datenschutz, Marken, Hosting-Hinweise

## Rechtliche Hinweise (Kurz)

Details auch in der App unter **Hinweise**. Keine Rechtsberatung.

| Thema | Praxis |
| --- | --- |
| Marken / Logos | Keine offiziellen Club-/UEFA-Wappen ohne Erlaubnis; klar als inoffiziell kennzeichnen |
| UEFA-Reglement | Eigene Kurzerklärungen ok; Reglement nicht als Volltext spiegeln; keine „offizielle Auskunft“ |
| Template-Spielerdaten | Namen/Geburtsdaten = personenbezogene Daten; Template nur aus öffentlich bekannten Infos, bei Minderjährigen besonders vorsichtig; bei Bedarf anonymisieren/entfernen |
| Kein Backend | Kaderdaten bleiben im Browser des Nutzers; GitHub liefert nur statische Dateien (GitHub kann Zugriffe loggen) |
| Haftung | Keine Gewähr für Regelrichtigkeit oder Template-Aktualität |
| Lizenz Code | MIT (`LICENSE`) – gilt nicht für Marken/fremde Texte |

## UEFA-Logik (CL 2026/27)

Konstanten in `src/lib/uefaUtils.ts` (u. a. B-Listen-Geburtsstichtag,
36 Monate / 3 Saisons CTP/ATP, A-Liste 25 mit LTP-Reservierung, Torhüter-Minima).
Ausführlich in der App unter **Regelübersicht**.

**Hinweis Vereinskategorie:** Liefering / rein verbandsbezogene Akademie-Meldung
= ÖFB Verbandsverein, nicht FC Salzburg (relevant für CTP vs. ATP und B-Liste).
