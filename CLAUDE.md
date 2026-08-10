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

## Layout des Hero-Sheets (Stand 2026-08-10, v2 "Almanach")

Die erste Version (v1) lehnte sich eng an die physischen Karten an (Icon-Badges, Pergament-Textur, Original-Icons/-Fonts von `aventuria`). Der Nutzer fand das Ergebnis "nicht schick" (siehe Screenshot-Feedback: die Ausrüstungs-Zeile mit 4 nativen Formularelementen nebeneinander war unübersichtlich). Daraufhin wurden drei Gestaltungsrichtungen als Artifact-Mockup vorgelegt (A "Kartennah", B "Almanach", C "Feldbuch") – **Nutzer hat sich für B entschieden.**

v2 "Almanach"-Look: flache, ruhige Fläche statt Pergament-Textur, weiße Kachel-Panels mit dünnen Rahmen, ein einziger Akzentton (Petrol/Verdigris `#2f5d57`), Georgia-Serif für den Namen, Segoe UI für UI-Labels. **Verzichtet bewusst auf Bild-Icons** (kein `assets/icons/*.webp` mehr im Sheet) – Eigenschaften/Kategorien werden über Text-Label + große Zahl bzw. Punkt-Pips/Text-Chips dargestellt statt über Icons. Struktur (`templates/hero-sheet.hbs`):

1. Header: Portrait, Name, Profession, Stufe als Badge-Pille (Select im Badge-Look), Buttons "Probe würfeln"/"Schadenswurf" (rufen `actor.system.rollTest()`/`rollDamage()` auf).
2. Eigenschaften-Reihe: 5 Kacheln (Nahkampf/Fernkampf/Magie/Ausweichen/Lebenspunkte), Label + große Zahl, kein Icon.
3. Grundausrüstung + Sekundäre Ausrüstung als Kachel-Paar: Name + Angriffstyp als Tag-Select, darunter Kosten/Schaden/Erschöpfen-Toggle (Checkbox+Label-Pattern, IDs mit `actor.id` präfixiert wegen möglicher mehrfach offener Sheets).
4. Sonderfertigkeit (Name + Rich-Text-Editor für die Beschreibung).
5. Talente (8 Werte als Kachel-Grid) + Talentkarten-Bild + Kategorien als Punkt-Pips (Nahkampf/Fernkampf/Rüstung/Zauber/Liturgie, je nach Gewichtsklasse) und Text-Chips (Sonstiges: Ausrüstung/Vorteil/Nachteil/Talent/Begleiter) – beide klickbar zum Umschalten.
6. Footer: Set, Set-Nummer, Talente-Set-Nummer als reiner Text.

Gottheits-/Professions-Icon (Peraine-Symbol etc.) weiterhin bewusst weggelassen.

Datenmodell-Referenz (`AventuriaHero.defineSchema()` in `modules/aventuria/dist/index.js`, Subtype-Key `aventuria.hero`): `skillImage`, `lifePoints.{value,max}`, `profession`, `close`/`ranged`/`magic`/`dodge` (Number, teils `initial:null`), `level` (Choices 1/2/3 → "I"/"II"/"III"), `basicEquipment`/`secondEquipment.{name,damage,attackType,endurance,exhaust}`, `specialAbility.{name,description}` (description = HTMLField), `skills.{body,craft,knowledge,perception,persuade,stealth,survival,willpower}`, `categories` (SetField, Werte aus `CONFIG.Aventuria.cardCategories`), `edition`, `serialNumber`, `serialNumberSkill`.

## Registrierte Sheet-API (bestätigt aus `uts.mjs`/`dist/index.js` dieser konkreten Foundry-v14-Installation)

- Basis-Klasse: `foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheet)`.
- Registrierung: `foundry.documents.collections.Actors.registerSheet(scope, SheetClass, { types, makeDefault, label })` (nicht mehr `DocumentSheetConfig.registerSheet`).
- Rich-Text: `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.
- Bild-Editieren: `data-action="editImage" data-edit="<path>"` auf einem `<img>` – funktioniert generisch für jeden Dateipfad (nicht nur `img`), genutzt für `system.skillImage`.

## Status

v2 "Almanach"-Version des Hero-Sheets ist implementiert und im laufenden Foundry mit einem echten Hero-Actor (Karmal Eternius) getestet worden – v1 lief funktional korrekt, wurde aber optisch überarbeitet. **Das neue CSS/Template (v2) ist noch nicht im Browser gegenprüft**, nur v1 wurde bereits live gesehen. Nächster Schritt: Nutzer testet v2, dann Feinschliff, danach Phase 3 (Macros).
