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

v3 "Kartenpaar"-Look wurde live getestet (B-Palette, zwei Karten nebeneinander) – Nutzer-Feedback danach: **"wir brauchen doch 2 Tabs"** (das breite Zwei-Karten-Fenster war unhandlich) **und die Farben sollen näher an die physische Karte** statt der flachen Petrol-Palette. Daraufhin dritte Mockup-Runde: erst Kartenfarben als Text-auf-Ton (schlecht lesbar, "nicht modern"), dann überarbeitet auf deckende Flächen (Feedback: "geht in die richtige Richtung"), dann auf Wunsch echte Aventuria-Icons eingebaut (Tabs als Icon-Leiste seitlich, Kategorien-Tabelle mit echten Symbolen, Eigenschaften mit Icon-Medaillons) plus Fix, dass beide Tabs gleich hoch bleiben (CSS-Grid-Stack-Trick) und sich die Fenstergröße beim Tab-Wechsel nicht ändert. **Diese v4-Version wurde final freigegeben und umgesetzt.**

v4 "Icon-Tabs"-Look (Struktur in `templates/hero-sheet.hbs`):

- **Icon-Leiste links** (`.tab-rail`, schmale Spalte im Fenster, kein separates Popup): zwei Icon-Buttons (Schwert-Icon = "Held"-Tab, Talentkarten-Icon = "Talente"-Tab), aktiver Tab farblich hervorgehoben. Aktiver Tab wird als `tab`-Property auf der Sheet-Instanz gehalten (`AventuriaHelpersHeroSheet#tab`, Default `"held"`) und übersteht dadurch auch Re-Renders nach Feldänderungen (`submitOnChange`).
- **Beide Tab-Inhalte liegen in derselben CSS-Grid-Zelle** (`.tab-stack`, `grid-area: 1 / 1`) und werden nur per `visibility`/`pointer-events` ein-/ausgeblendet statt `display:none` – dadurch richtet sich die Höhe des Sheets immer nach dem größeren Tab, und die Fenstergröße bleibt beim Wechseln stabil. Scrollbar ist `.tab-stack` selbst (`PARTS.sheet.scrollable`).
- **Farbpalette:** an der physischen Karte orientiert, aber als **deckende Flächen** statt Text-auf-Ton (Kontrast-Fix nach Nutzer-Feedback): warmes Pergament (`--paper`), weiße Panels (`--panel`), vier Edelstein-Farben als Chip-Hintergrund mit hellem Text (Rubinrot `--ruby` = Nahkampf, Bernstein `--amber` = Fernkampf, Amethyst `--amethyst` = Magie, Verdigris `--verdigris` = Ausweichen). Serife (Georgia) nur beim Namen, sonst Segoe UI.
- **Kopf** (immer sichtbar, nicht Teil der Tabs): Portrait (nur einmal), Name, Profession, Stufe als Icon-Pille (`level-N.webp`), Buttons "Probe würfeln"/"Schadenswurf".
- **Tab "Held":** Eigenschaften als Icon-Medaillon + Zahl (weißer Kreis mit Original-Icon auf der Farbfläche), Grundausrüstung/Sekundäre Ausrüstung (Angriffstyp-Icon neben dem Tag-Select, Ausdauerkosten-Icon, Erschöpfen-Icon+Toggle), Sonderfertigkeit (Rich-Text-Editor, `flex:1` füllt die Resthöhe).
- **Tab "Talente":** 8 Talente als Kachel-Grid, Kategorien-Tabelle mit echten Original-Icons (Nahkampf/Fernkampf/Rüstung je leicht/mittel/schwer, Zauber/Liturgie je leicht/komplex, Sonstiges = Ausrüstung/Vorteil/Nachteil/Talent/Begleiter). Für `disadvantage` gibt es kein Icon im Basismodul → Font-Awesome-Fallback (`fa-thumbs-down`). **Kein Talentkarten-Bild** (`system.skillImage`) – bewusst ausgelassen.
- **Fuß** (immer sichtbar): Set, Set-Nummer, Talente-Set-Nummer, mit Kelch-Icon (`magic-chalice.webp`) vor den beiden Nummern.

Alle Icons werden ganz normal per Pfad aus `modules/aventuria/assets/icons/` referenziert (kein Duplizieren von Assets) – nur in den Design-Mockups (Artifacts) wurden sie zu Vorschauzwecken als Base64 eingebettet, das betrifft nicht den echten Modul-Code. Gottheits-/Professions-Icon (Peraine-Symbol etc.) weiterhin bewusst weggelassen. `system.skillImage` ist im Datenmodell vorhanden, aber aktuell in keinem Feld des Sheets gebunden – bei Bedarf später ergänzen.

Datenmodell-Referenz (`AventuriaHero.defineSchema()` in `modules/aventuria/dist/index.js`, Subtype-Key `aventuria.hero`): `skillImage`, `lifePoints.{value,max}`, `profession`, `close`/`ranged`/`magic`/`dodge` (Number, teils `initial:null`), `level` (Choices 1/2/3 → "I"/"II"/"III"), `basicEquipment`/`secondEquipment.{name,damage,attackType,endurance,exhaust}`, `specialAbility.{name,description}` (description = HTMLField), `skills.{body,craft,knowledge,perception,persuade,stealth,survival,willpower}`, `categories` (SetField, Werte aus `CONFIG.Aventuria.cardCategories`), `edition`, `serialNumber`, `serialNumberSkill`.

## Registrierte Sheet-API (bestätigt aus `uts.mjs`/`dist/index.js` dieser konkreten Foundry-v14-Installation)

- Basis-Klasse: `foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheet)`.
- Registrierung: `foundry.documents.collections.Actors.registerSheet(scope, SheetClass, { types, makeDefault, label })` (nicht mehr `DocumentSheetConfig.registerSheet`).
- Rich-Text: `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.
- Bild-Editieren: `data-action="editImage" data-edit="<path>"` auf einem `<img>` – funktioniert generisch für jeden Dateipfad (nicht nur `img`), genutzt für `system.skillImage`.

## Status

v4 "Icon-Tabs"-Version wurde live in Foundry getestet (Karmal Eternius, beide Tabs per Screenshot geprüft). Grundlayout funktioniert, Icons/Farben kommen an. Erste Live-Test-Runde ergab 5 Detail-Korrekturen (umgesetzt):

- Footer-Textfeld für `edition` war fix auf 3.2rem (wie die Zahlenfelder) und schnitt lange Set-Namen ab → eigene, breitere Breite für `input[type="text"]` im Footer.
- Beide Tabs brauchten internes Scrollen → Ursache war die feste Fenster-Default-Höhe (640px) kombiniert mit `.tab-stack{overflow-y:auto}`. Scrollbarkeit entfernt (`.tab-stack` ohne `flex`/`overflow`, `.sheet-main` ohne `overflow:hidden`), Fenster-Default auf `height:800` erhöht (`scripts/sheets/hero-sheet.mjs`) – Inhalt bestimmt jetzt natürlich die Höhe, kein erzwungener innerer Scrollbereich mehr.
- "Probe würfeln"/"Schadenswurf" standen nebeneinander → jetzt `.s-actions{flex-direction:column}`, untereinander.
- Lebenspunkte- und Eigenschaften-Werte (Nahkampf/Fernkampf/Magie/Ausweichen) waren linksbündig in ihren Zahlenfeldern → `text-align:center` ergänzt.
- Icon auf dem Angriffstyp-Tag ("Magie") und dem Erschöpfen-Toggle war auf der farbigen Pille kaum sichtbar (volltonige Original-Icons auf Amethyst/Verdigris-Fläche) → gleicher weißer Kreis-Hintergrund wie bei den Eigenschaften-Medaillons ergänzt (`.icon-badge`).

**"Spielmodus"/Sheet-Sperre ergänzt:** ursprünglich als Header-Control (Schloss-Icon in der Fenster-Titelleiste) umgesetzt, auf Nutzerwunsch aber durch einen **Switch unten im linken Icon-Rail** ersetzt (`.lock-switch`, Action weiterhin `toggleLock`). Zustand kommt aus dem `locked`-Getter (`AventuriaHelpersHeroSheet#locked`, liest `actor.getFlag("aventuria-helpers","locked")`) – dieses Flag persistiert (nicht nur Render-State) und gilt für alle Betrachter des Actors. `isEditable` ist überschrieben (`super.isEditable && !this.locked`) – dadurch greift die Sperre automatisch überall dort, wo das Sheet bereits `editable`/`this.isEditable` prüft (alle Formularfelder, Bild-Editieren, Rich-Text-Editor, Kategorien-Toggle), ohne dass jedes Feld einzeln angefasst werden musste. Würfel-Buttons und Tab-Wechsel bleiben bewusst auch im gesperrten Zustand nutzbar (keine Werteänderung); der Switch selbst bleibt immer klickbar, um wieder zu entsperren. Gesperrte Felder werden **nicht** abgedunkelt (Lesbarkeit), stattdessen bekommen bearbeitbare Felder einen dezenten Hover/Fokus-Hintergrund + Unterstrich (`currentColor`/`color-mix`, funktioniert auf weißen Panels wie auf den farbigen Eigenschaften-Kacheln gleichermaßen).

**Wichtiger Bugfix beim Switch:** Nutzer meldete, der Switch sehe "komisch" aus und lasse sich einmal gesperrt nicht mehr zurückschalten. Ursachen:
1. `.knob` hatte kein `position:absolute` – Layout des Track/Knopf-Verbunds war dadurch instabil.
2. **Selbstblockade:** Sobald `isEditable` false wird, deaktiviert das Foundry-Framework offenbar automatisch alle Formular-Elemente im Sheet (`form.elements`), inkl. reiner `<button>`-Elemente – also auch den eigenen Lock-Switch, die Tab-Rail-Buttons und die Würfel-Buttons, obwohl die bewusst immer nutzbar bleiben sollen. Fix: `_onRender()`-Override, das `.lock-switch`, `.railbtn` und `.s-btn` nach jedem Render explizit wieder `disabled = false` setzt. `.cat-toggle` (Kategorien) ist bewusst NICHT in dieser Liste, da das Umschalten von Kategorien im Spielmodus weiterhin gesperrt bleiben soll.

Nächster Schritt: Nutzer testet Switch-Optik und dass sich der Spielmodus jetzt wieder normal ein-/ausschalten lässt, danach ggf. weiterer Feinschliff.

## Eigenständige Attribut-Proben (Stand 2026-08-11)

Ergänzt: pro Eigenschaft (Nahkampf/Fernkampf/Magie/Ausweichen) ist das Icon-Medaillon auf dem Held-Tab jetzt anklickbar und würfelt eine eigene Probe – **unabhängig** vom bestehenden generischen "Probe würfeln"-Button im Header (der weiterhin `actor.system.rollTest()` aus `aventuria` selbst aufruft, inkl. Talente/Ausweichen-Auswahl). Die neue Logik ist komplett modul-eigen, da `aventuria`/`dist/index.js` nicht verändert werden darf.

- **Magie ist nur klickbar, wenn `system.magic` einen Wert hat** – sonst bleibt das Medaillon ein normales `<span>` (kein Button), Grid-Layout bleibt dadurch unangetastet (kein bedingtes Ein-/Ausblenden der ganzen Kachel, nur der Klickbarkeit).
- **Neues Modul** `scripts/attribute-roll.mjs`, exportiert `rollAttribute(actor, key)` – bewusst aus der Sheet-Klasse ausgelagert, damit spätere Macros (Phase 3) dieselbe Funktion wiederverwenden können.
- **Ablauf:** Dialog fragt einen Modifikator ab (`foundry.applications.api.Dialog.input(...)`, gleiche API wie `aventuria`s eigenes `rollTest()`), eigene Klasse `probe-dialog` fürs Styling (Palette wie das Sheet, aber eigene CSS-Variablen, da der Dialog eine eigene Application/eigener DOM-Baum ist). Formel: `1d20`, davon wird der Modifikator abgezogen (`total = d20 - modifier`) – positive Werte erleichtern (werden abgezogen), negative erschweren (Abzug einer negativen Zahl = Addition). Erklärtext dazu steht im Dialog. Erfolg = `total <= Eigenschaftswert` (roll-under, wie bei den anderen Aventuria-Proben).
- **Chat-Karte** `templates/chat/probe-card.hbs` (eigenes Template, per `renderTemplate` gerendert, nicht das Foundry-Standard-Würfel-Layout) zeigt Icon, Eigenschaft, Zielwert, Rechenweg (Wurf → Modifikator → Ergebnis) und ein deutliches Bestanden/Nicht-bestanden-Badge (verdigris/ruby). Der `Roll` wird trotzdem über `rolls:[roll]` an die ChatMessage gehängt, damit Dice So Nice (installiertes Sibling-Modul) weiterhin animiert – nur das visuelle Chat-Karten-Layout ist eigenständig, nicht die Würfel-Mechanik.
- Die Roll-Medaillons (`.roll-badge`) mussten in dieselbe `_onRender()`-Reaktivierungsliste wie Lock-Switch/Tab-Rail/Würfel-Buttons aufgenommen werden (sonst hätte sie derselbe "Framework deaktiviert alle Formularelemente im Spielmodus"-Bug getroffen wie zuvor beim Lock-Switch) – Proben würfeln bleibt also auch im Spielmodus möglich (ändert ja keine Werte).

Nächster Schritt: Nutzer testet die vier Attribut-Proben live (Dialog-Optik, Modifikator-Vorzeichen, Chat-Karte, Dice-So-Nice-Integration), danach Phase 3 (Macros).
