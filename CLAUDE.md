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

## Layout des Hero-Sheets (Stand 2026-08-11, v3 "Kartenpaar")

Die erste Version (v1) lehnte sich eng an die physischen Karten an (Icon-Badges, Pergament-Textur, Original-Icons/-Fonts von `aventuria`). Der Nutzer fand das Ergebnis "nicht schick" (Screenshot-Feedback: die Ausrüstungs-Zeile mit 4 nativen Formularelementen nebeneinander war unübersichtlich). Daraufhin wurden drei Gestaltungsrichtungen als Artifact-Mockup vorgelegt (A "Kartennah", B "Almanach", C "Feldbuch") – Nutzer wählte B. v2 setzte B als einspaltigen "Heldenbogen" um und wurde live in Foundry getestet.

Danach wollte der Nutzer die Optik von B, aber wieder als **zwei Karten nebeneinander** (wie die physischen Held-/Talent-Karten), nicht als eine Spalte. Dafür gab es eine zweite Mockup-Runde (3 Layouts: "Geteilter Kopf", "Kartenpaar", "Kompaktes Duo") plus eine Iteration ("Eigenschaften nach rechts verschoben", wurde verworfen) – **gewählt wurde Layout 1 "Geteilter Kopf", mit der Auflage, dass beide Karten gleich hoch sind.**

v3 "Kartenpaar"-Look (weiterhin B-Palette: flache Fläche, weiße Kachel-Panels, Akzent Petrol/Verdigris `#2f5d57`, Georgia für den Namen, Segoe UI für UI-Labels, keine Bild-Icons). Struktur (`templates/hero-sheet.hbs`):

1. Gemeinsamer Kopf über beiden Karten: Portrait (nur einmal eingebunden), Name, Profession, Stufe als Badge-Pille (Select im Badge-Look), Buttons "Probe würfeln"/"Schadenswurf" (rufen `actor.system.rollTest()`/`rollDamage()` auf).
2. Zwei Karten nebeneinander (`.cardrow`, CSS Grid mit `align-items: stretch` – beide Karten dadurch **gleich hoch**, der jeweils flexibelste Block je Karte (`.ability`/`.cats`, beide `flex:1`) füllt die überschüssige Höhe):
   - **Karte "Held":** Eigenschaften-Reihe (5 Kacheln: Nahkampf/Fernkampf/Magie/Ausweichen/Lebenspunkte), Grundausrüstung + Sekundäre Ausrüstung (Name + Angriffstyp als Tag-Select, Kosten/Schaden/Erschöpfen-Toggle mit `actor.id`-präfixierten IDs wegen ggf. mehrfach offener Sheets), Sonderfertigkeit (Name + Rich-Text-Editor).
   - **Karte "Talente":** 8 Talente als Kachel-Grid, Kategorien als Punkt-Pips (Nahkampf/Fernkampf/Rüstung/Zauber/Liturgie) und Text-Chips (Sonstiges: Ausrüstung/Vorteil/Nachteil/Talent/Begleiter), beide klickbar zum Umschalten. **Kein Talentkarten-Bild** (`system.skillImage`) – bewusst ausgelassen, da Nutzer das Portrait nur einmal wollte.
3. Footer (volle Breite unter beiden Karten): Set, Set-Nummer, Talente-Set-Nummer als reiner Text.

Gottheits-/Professions-Icon (Peraine-Symbol etc.) weiterhin bewusst weggelassen. `system.skillImage` ist im Datenmodell vorhanden, aber aktuell in keinem Feld des Sheets gebunden – bei Bedarf später ergänzen (z.B. als kleines Vorschaubild in der Talente-Karte).

Datenmodell-Referenz (`AventuriaHero.defineSchema()` in `modules/aventuria/dist/index.js`, Subtype-Key `aventuria.hero`): `skillImage`, `lifePoints.{value,max}`, `profession`, `close`/`ranged`/`magic`/`dodge` (Number, teils `initial:null`), `level` (Choices 1/2/3 → "I"/"II"/"III"), `basicEquipment`/`secondEquipment.{name,damage,attackType,endurance,exhaust}`, `specialAbility.{name,description}` (description = HTMLField), `skills.{body,craft,knowledge,perception,persuade,stealth,survival,willpower}`, `categories` (SetField, Werte aus `CONFIG.Aventuria.cardCategories`), `edition`, `serialNumber`, `serialNumberSkill`.

## Registrierte Sheet-API (bestätigt aus `uts.mjs`/`dist/index.js` dieser konkreten Foundry-v14-Installation)

- Basis-Klasse: `foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheet)`.
- Registrierung: `foundry.documents.collections.Actors.registerSheet(scope, SheetClass, { types, makeDefault, label })` (nicht mehr `DocumentSheetConfig.registerSheet`).
- Rich-Text: `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.
- Bild-Editieren: `data-action="editImage" data-edit="<path>"` auf einem `<img>` – funktioniert generisch für jeden Dateipfad (nicht nur `img`), genutzt für `system.skillImage`.

## Status

v3 "Kartenpaar"-Version des Hero-Sheets ist implementiert, **aber noch nicht in Foundry getestet** (v1 und v2 wurden bereits live mit einem echten Hero-Actor, Karmal Eternius, geprüft; v2 lief nicht mehr sichtbar korrekt gegengeprüft, da direkt auf v3 umgestellt wurde). Nächster Schritt: Nutzer testet v3 live, dann Feinschliff, danach Phase 3 (Macros).
