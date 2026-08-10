# aventuria-helpers

Foundry VTT (v14) Zusatzmodul, das das offizielle **Aventuria**-Modul (`aventuria`) ergänzt. Läuft auf dem System **Universal Tabletop System** (`universal-tabletop-system`, kurz UTS), auf dem `aventuria` selbst aufbaut.

## Ziel des Moduls

- Zusätzliche **Macros** für den Spielablauf bereitstellen (ergänzend zu den bereits vorhandenen Aventuria-Macros).
- Ein **komplett neues Actor-Sheet** für den Aventuria-Actor-Typ `hero`, das das generische, schema-getriebene Standard-Sheet von UTS ersetzt bzw. ergänzt.
- Keine Veränderung an `aventuria` oder `universal-tabletop-system` selbst – reines Zusatzmodul (Dependency-Modul), das sich sauber deaktivieren lässt.

## Umgebung / Abhängigkeiten

Lokale Foundry-User-Data unter `v14-aventuria/Data/`:

- `modules/aventuria/` – offizielles Aventuria-Modul, v0.1.1, `id: "aventuria"`. Kompiliert (`dist/index.js`, minifiziert/gebündelt via Rolldown). **Nicht editieren.**
- `systems/universal-tabletop-system/` – UTS-System, v1.2.1, `id: "universal-tabletop-system"`. Unkompiliertes ESM (`uts.mjs`). **Nicht editieren.**
- `modules/aventuria-helpers/` – **dieses Modul** (neu, leer).

Beide o.g. Pakete sind bereits lokal vorhanden und wurden für die Planung inspiziert (Quellcode, `module.json`/`system.json`, Sprachdateien). Kein weiterer externer Zugriff nötig, um die Datenmodelle/Struktur zu verstehen – Details siehe unten.

`aventuria` benötigt laut eigenem `module.json` zusätzlich `complete-card-management` (Karten-UI) – für unser Modul nicht direkt relevant, außer wir wollen ebenfalls mit dessen Sheets interagieren.

## Bekannte Datenstruktur (aus Analyse von `dist/index.js` + `lang/de.json`)

Actor-Subtype `aventuria.hero` (`AventuriaHero extends AventuriaActor extends foundry.abstract.TypeDataModel`):

- `lifePoints.value` / `lifePoints.max` – Lebenspunkte
- `profession` – Profession
- `close` / `ranged` / `magic` – Kampf-Eigenschaften
- `dodge` – Ausweichen-Eigenschaft
- `level` – Stufe
- `skills.body`, `.craft`, `.knowledge`, `.perception`, `.persuade`, `.stealth`, `.survival`, `.willpower` – Talente
- `basicEquipment` / `secondEquipment` – je `{ name, damage, attackType, endurance, exhaust }`
- `specialAbility` – `{ name, description }` (description ist ein HTML-Feld)
- `skillImage` – Bildpfad der Talentkarte
- `categories` – erlaubte Aktionskarten
- `edition`, `serialNumber`, `serialNumberSkill` – Set-Zuordnung

Weitere Dokumenttypen von `aventuria`: Item-Subtype `title` (Heldentitel), Card-Subtypes `action`, `leader`, `wildcard`, `timeScale`, `henchman`, `special`, `demon`.

Aktuelles Sheet für `hero`: **kein eigenes Sheet-Klasse in `aventuria`** – es läuft über `UTSActorSheet` (`uts.mjs`), ein generisches, ApplicationV2/Handlebars-basiertes Sheet, das dynamisch `actor.schema.fields` rendert (daher "Universal"). Das neue Sheet in diesem Modul soll dieses generische Sheet für `hero`-Actors durch ein maßgeschneidertes ersetzen (Registrierung vermutlich via `foundry.applications.apps.DocumentSheetConfig.registerSheet` bzw. `Actors.registerSheet` für den Subtype `aventuria.hero`).

Vorhandene Macros in der `aventuria`-Compendium (`packs/macros`, Referenz für Namensgebung/Umfang neuer Macros): `PreparePlayer`, `PrepareBoard`, `HenchDeck`, `EventDeck`, `LeaderDeck`, `RollTest`, `RollDamage`, `Exhaust`/`Ready`.

## Technische Konventionen für dieses Modul

- **Foundry-Version:** v14 (min. Kompatibilität wie `aventuria`: `"minimum": "14"`).
- **Kein Build-Zwang:** Analog zu `complete-card-management` (einfaches `ccm.mjs`/`ccm.css` ohne Bundler) reicht für den Umfang dieses Moduls voraussichtlich plain ESM ohne Bundler/TypeScript – einfacher zu warten, kein Build-Schritt nötig. Nur bei Bedarf (z.B. TS gewünscht) umstellen.
- **Modul-ID:** `aventuria-helpers`.
- **Sprachen:** `aventuria` pflegt `de` und `en` parallel – falls dieses Modul mehrsprachig sein soll, gleiche Struktur (`lang/de.json`, `lang/en.json`) verwenden.
- **Registrierung von Sheets/Macros:** über `Hooks.once("init", ...)`, Abhängigkeit von `aventuria` und `universal-tabletop-system` in `module.json` unter `relationships.requires` bzw. `relationships.systems` eintragen, damit Foundry die Ladereihenfolge sicherstellt.
- Keine Änderungen an `modules/aventuria/` oder `systems/universal-tabletop-system/` vornehmen – nur additiv über das eigene Modul arbeiten (Hooks, eigene Sheet-Klasse, eigene Macro-Compendium/Macro-Verzeichnis).

## Testing

Es gibt keine automatisierten Tests für Foundry-Module dieser Art. Funktionalität wird manuell im laufenden Foundry (v14, Welt mit `aventuria` + `universal-tabletop-system`) geprüft. Ich (Claude) kann keinen Browser/Foundry-Client bedienen – Tests und Screenshots liefert der Nutzer.

## Entscheidungen (Stand 2026-08-10)

- **Reihenfolge:** Erst das neue Hero-Sheet umsetzen, Macros folgen in einer späteren Phase.
- **Sheet-Registrierung:** Das neue Sheet ersetzt das generische `UTSActorSheet` **nicht** als Default, sondern wird als **wählbare Alternative** registriert (Nutzer kann pro Actor per Rechtsklick > "Sheet konfigurieren" wechseln). D.h. Registrierung über `DocumentSheetConfig.registerSheet(Actor, "aventuria-helpers", HeroSheet, { types: ["aventuria.hero"], makeDefault: false })` (kein Eingriff in die Default-Zuordnung von `aventuria`/UTS).
- **Design:** Nutzer liefert Referenz/Beschreibung für das Sheet-Layout (steht noch aus).
- **Versionierung:** lokales Git-Repo wurde initialisiert (`git init`, noch kein erster Commit).

## Status

Projekt befindet sich in der Planungsphase. Noch kein `module.json`, kein Code. Nächster Schritt: Nutzer beschreibt gewünschtes Sheet-Layout, danach Umsetzung des Hero-Sheets (Phase 2 aus dem Projektablauf).
