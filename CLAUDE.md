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
- Rich-Text **zum Anzeigen** (enrichen von `@UUID`-Links, Rolls etc. in HTML-Feldern): `foundry.applications.ux.TextEditor.implementation.enrichHTML(...)`.
- Rich-Text **zum Bearbeiten**: **nicht** das `<div class="editor" data-edit="...">`-Pattern (das ist AppV1-Legacy, in ApplicationV2 tot – siehe eigener Abschnitt unten). Stattdessen das Custom Element `<prose-mirror name="..." value="..." data-document-uuid="{{actor.uuid}}">`.
- Bild-Editieren: `data-action="editImage" data-edit="<path>"` auf einem `<img>` – funktioniert generisch für jeden Dateipfad (nicht nur `img`), genutzt für `system.skillImage`. (Das ist ein anderer, weiterhin funktionierender `data-edit`-Anwendungsfall als das tote Editor-Div-Pattern – nicht verwechseln.)

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

## Eigenständige Proben für Eigenschaften und Talente (Stand 2026-08-11)

Ergänzt: pro Eigenschaft (Nahkampf/Fernkampf/Magie/Ausweichen) ist das Icon-Medaillon auf dem Held-Tab UND pro Talent (alle 8) der Talent-Name auf dem Talente-Tab jetzt anklickbar und würfelt eine eigene Probe – **unabhängig** vom bestehenden generischen "Probe würfeln"-Button im Header (der weiterhin `actor.system.rollTest()` aus `aventuria` selbst aufruft, inkl. Auswahl-Dropdown). Die neue Logik ist komplett modul-eigen, da `aventuria`/`dist/index.js` nicht verändert werden darf.

- **Magie ist nur klickbar, wenn `system.magic` einen Wert hat** – sonst bleibt das Medaillon ein normales `<span>` (kein Button), Grid-Layout bleibt dadurch unangetastet (kein bedingtes Ein-/Ausblenden der ganzen Kachel, nur der Klickbarkeit). Talente haben keine entsprechende Bedingung (alle 8 immer klickbar).
- **Gemeinsames Modul** `scripts/probe-roll.mjs` (Umbenennung von `attribute-roll.mjs`, da jetzt auch Talente abgedeckt sind) – interne Funktion `rollProbe(actor, label, icon, target)` macht Dialog+Wurf+Chat-Karte, `rollAttribute(actor, key)` und `rollSkill(actor, key)` sind die beiden öffentlichen Einstiegspunkte, die nur Label/Icon/Zielwert auflösen. Talente haben kein eigenes Icon im Aventuria-Modul – alle acht nutzen das generische Talentkarten-Icon (`talent.webp`). Bewusst aus der Sheet-Klasse ausgelagert, damit spätere Macros (Phase 3) dieselben Funktionen wiederverwenden können. Talent-Label wird direkt von `actor.system.schema.getField(["skills", key]).label` übernommen (nicht nochmal durch `localize()` geschickt) – das ist bereits durch `LOCALIZATION_PREFIXES` vorab aufgelöster Klartext, exakt wie es `aventuria`s eigenes `rollTest()` schon macht.
- **Ablauf:** Dialog fragt einen Modifikator ab (`foundry.applications.api.Dialog.input(...)`, gleiche API wie `aventuria`s eigenes `rollTest()`), eigene Klasse `probe-dialog` fürs Styling (Palette wie das Sheet, aber eigene CSS-Variablen, da der Dialog eine eigene Application/eigener DOM-Baum ist). Formel: `1d20`, davon wird der Modifikator abgezogen (`total = d20 - modifier`) – positive Werte erleichtern (werden abgezogen), negative erschweren (Abzug einer negativen Zahl = Addition). Erklärtext dazu steht im Dialog. Erfolg = `total <= Zielwert` (roll-under, wie bei den anderen Aventuria-Proben).
- **Chat-Karte** `templates/chat/probe-card.hbs` (eigenes Template, per `renderTemplate` gerendert, nicht das Foundry-Standard-Würfel-Layout) zeigt Icon, Name, Zielwert, Rechenweg (Wurf → Modifikator → Ergebnis) und ein deutliches Bestanden/Nicht-bestanden-Badge (verdigris/ruby). Der `Roll` wird trotzdem über `rolls:[roll]` an die ChatMessage gehängt, damit Dice So Nice (installiertes Sibling-Modul) weiterhin animiert – nur das visuelle Chat-Karten-Layout ist eigenständig, nicht die Würfel-Mechanik.
- Sowohl die Roll-Medaillons (`.roll-badge`) als auch die klickbaren Talent-Namen (`.skill-roll`) mussten in dieselbe `_onRender()`-Reaktivierungsliste wie Lock-Switch/Tab-Rail/Würfel-Buttons aufgenommen werden (sonst hätte sie derselbe "Framework deaktiviert alle Formularelemente im Spielmodus"-Bug getroffen wie zuvor beim Lock-Switch) – Proben würfeln bleibt also auch im Spielmodus möglich (ändert ja keine Werte).
- **Refactor:** Die bisher hart codierte `_onRender()`-Selektorliste (`.lock-switch, .railbtn, .s-btn, .roll-badge, .skill-roll`) wurde durch eine einzige gemeinsame Klasse `always-active` ersetzt, die alle "trotz Spielmodus nutzbaren" Elemente tragen. Neue Elemente dieser Art brauchen also nur noch die Klasse im Template, keine JS-Änderung mehr.

## "Verwendet"-Toggle für die Sonderfertigkeit (Stand 2026-08-11)

Wie bei den Waffen-Erschöpfen-Toggles, aber für die Sonderfertigkeit: ein Button "Verwendet" unten in der Sonderfertigkeits-Kachel. **Kann nicht als echtes Schema-Feld** umgesetzt werden (aventuria's Datenmodell hat kein `specialAbility.used`-Feld, und `aventuria`/`dist/index.js` darf nicht verändert werden) – daher als Actor-Flag `flags.aventuria-helpers.specialAbilityUsed`, exakt wie schon der Spielmodus-Lock. Eigener Getter `AventuriaHelpersHeroSheet#abilityUsed`, Action `toggleAbilityUsed`.

"Verwendet" soll **auch im Spielmodus nutzbar bleiben** (explizite Nutzeranforderung – das ist eine Session-/Spielverlauf-Markierung, keine Charakterwert-Änderung), trägt daher die `always-active`-Klasse. (Der Erschöpfen-Toggle bei der Ausrüstung wurde kurz danach aus demselben Grund ebenfalls auf `always-active` umgestellt – siehe nächster Abschnitt.)

## Ausrüstungs-Proben + Erschöpfen-Fix (Stand 2026-08-11)

Nutzer-Feedback: Die Erschöpfen-Checkbox bei den Waffen funktionierte nicht zuverlässig. Statt das Checkbox+Label-Pattern zu debuggen, wurde es durch das bereits bei "Verwendet" bewährte Pattern ersetzt: **reiner `<button class="toggle always-active">`** mit Action `toggleExhaust` (setzt `system.<key>.exhaust` direkt per `actor.update()`), statt `<input type="checkbox" name="system....exhaust">` mit nativer Formular-Bindung. Erschöpfen ist jetzt bewusst ebenfalls `always-active` (wie "Verwendet") – ist inhaltlich ohnehin eher Spielzustand als Charakterwert, und soll laut Nutzer "trotzdem manuell nutzbar sein".

**Neue Funktion:** Ausrüstung "verwenden" statt nur die Angriffsart-Auswahl anzuzeigen. Das kleine Icon im Angriffsart-Tag (vorher nur Deko) ist jetzt ein Button (`data-action="rollEquipment"`, Klassen `icon-badge roll-badge always-active`) und löst einen kombinierten Ablauf aus:

1. Dialog (gleiche Optik wie die Attribut-/Talent-Proben) zeigt Zielwert der zugehörigen Eigenschaft (Angriffstyp = close/ranged/magic, direkt deckungsgleich mit den Attribut-Keys – keine Mapping-Tabelle nötig) + eine Vorschau des Schadensfelds + Modifikator-Eingabe.
2. Nach Bestätigen: würfelt **beides** – den Angriffs-Probe-Wurf (`1d20 - Modifikator`, roll-under wie überall) UND den Schadenswurf (das frei eingetragene `damage`-Textfeld wird als Formel geparst; deutsche Würfelschreibweise `1W6` wird zu `1d6` normalisiert, `Roll.validate()` prüft die Formel vorher ab).
3. Beide Würfe landen in einer gemeinsamen Chat-Karte (Angriffs-Rechenweg + Bestanden/Nicht-bestanden-Badge, darunter eine Schaden-Zeile mit Formel + Ergebnis).
4. **Danach wird die Ausrüstung automatisch als erschöpft markiert** (`actor.update({"system.<key>.exhaust": true})`).

Der manuelle Erschöpfen-Button bleibt unabhängig davon weiter bedienbar (z.B. um am Rundenende alle Waffen wieder freizuschalten).

`scripts/probe-roll.mjs` wurde intern refactort: `promptModifier()` (Dialog) und `rollD20()` (Würfeln+Auswertung) sind jetzt eigene kleine Funktionen, die sowohl `rollProbe()` (Attribute/Talente) als auch das neue `rollEquipment()` nutzen. `templates/chat/probe-card.hbs` hat einen optionalen `{{#if damage}}`-Block bekommen, den nur `rollEquipment()` befüllt.

## Zustand vs. Aktion bei den Toggle-Buttons (Stand 2026-08-11)

Nutzer-Feedback: Bei "Erschöpfen" und "Verwendet" war nicht erkennbar, ob der aktuelle (farbige/gefüllte) Zustand "ist bereits erschöpft/verwendet" oder "klicke hier zum Erschöpfen/Verwenden" bedeutet – der Button-Text blieb bisher in beiden Zuständen identisch, nur die Füllfarbe änderte sich.

**Lösung:** Der sichtbare Text wechselt jetzt mit dem Zustand und beschreibt immer den **aktuellen Status** (nicht die Aktion):

- Erschöpfen-Button: `Bereit` (nicht erschöpft) ↔ `Erschöpft` (erschöpft). Neue Keys `AVENTURIA_HELPERS.HeroSheet.Ready`/`.Exhausted`.
- Verwendet-Button: `Bereit` (nicht verwendet) ↔ `Verwendet`.

Beide teilen sich bewusst denselben Status-Begriff "Bereit" für den Grundzustand – ein wiedererkennbares Vokabular über beide Toggles hinweg. Der **Tooltip** beschreibt stattdessen die Klick-**Aktion** ("Als erschöpft markieren" / "Bereit machen" / "Als nicht verwendet markieren") – neue Keys `MarkExhausted`, `MakeReady`, `MarkUnused`. `.toggle` hat jetzt `min-width:5.6rem`, damit der Button beim Textwechsel nicht sichtbar in der Breite springt.

## Lebenspunkte bleiben im Spielmodus editierbar (Stand 2026-08-11)

Nutzerwunsch: Lebenspunkte (aktuell/maximum) sollen sich auch bei aktivem Spielmodus ändern lassen – im Gegensatz zu echten Charakterwerten ändern sich LeP ständig während des Spiels (Schaden, Heilung), sind also eher Spielzustand.

**Wichtiger Unterschied zu den bisherigen `always-active`-Elementen:** Lock-Switch, Verwendet, Erschöpfen etc. sind alle **Flag-basiert** und laufen über eigene Action-Handler (`actor.setFlag()`/gezieltes `actor.update()`), die komplett unabhängig vom Formular-Submit-Mechanismus sind. Die Lebenspunkte sind aber ein **echtes Schema-Feld** (`system.lifePoints.value`/`.max`), das bisher über natives `name="system...."` + Foundry's `submitOnChange`-Formularbindung lief. Nur das `disabled`-Attribut per `_onRender()` zu entfernen hätte hier vermutlich **nicht gereicht** – der Verdacht: Foundry's eigener `_onChangeForm`-Handler prüft beim Absenden vermutlich zusätzlich `this.isEditable` (und nicht nur das `disabled`-Attribut im DOM), und `this.isEditable` ist während des Spielmodus bewusst `false` (siehe Getter-Override). Ein wieder aktiviertes, aber weiterhin `name`-gebundenes Feld hätte also im UI editierbar ausgesehen, aber beim Ändern trotzdem nichts gespeichert.

**Lösung:** Die beiden Felder haben jetzt **kein `name`-Attribut mehr** (raus aus der normalen Formular-Bindung) und tragen stattdessen `class="always-active lp-input" data-field="value|max"`. In `_onRender()` wird ein eigener `change`-Listener angehängt, der direkt `actor.update({"system.lifePoints.<field>": ...})` aufruft – komplett am Formular-Submit-Pfad vorbei, dadurch unabhängig davon, ob/wie tief Foundry intern `isEditable` beim Absenden erneut prüft. Foundries eigene Dokumenten-Berechtigungsprüfung (echte Besitzrechte, nicht das eigene Lock-Flag) greift bei `actor.update()` ganz normal weiter.

**Nebenbei-Fix (Berechtigungs-Korrektheit):** `_onRender()`s Re-Enable-Schleife für `.always-active` prüft jetzt zuerst `super.isEditable` (echte Foundry-Berechtigung, ohne das eigene Lock-Flag) und bricht sonst ab. Vorher wurden Lock-Switch/Proben-Buttons/Toggles auch für Nutzer *ohne* jegliche Bearbeitungsrechte am Actor (z.B. reiner Beobachter-Zugriff) blind wieder aktiviert – die serverseitige Foundry-Berechtigungsprüfung hätte die eigentlichen `update()`/`setFlag()`-Aufrufe zwar ohnehin abgelehnt, aber Chat-Nachrichten (Proben-Würfe) wären z.B. trotzdem ohne echte Berechtigung erstellbar gewesen. Jetzt bleibt für solche Nutzer alles korrekt gesperrt.

## Deutlichere Hover-Effekte (Stand 2026-08-11)

Nutzer-Feedback: Der Hover-Effekt der Eigenschaften-Proben-Medaillons war zu unauffällig, und der reine Textfarb-Wechsel bei den Talent-Proben wirkte nicht überzeugend. Fixes:

- `.roll-badge` (Eigenschaften-Medaillons): kräftigerer Effekt beim Hover/Fokus – skaliert leicht hoch (`scale(1.18)`) plus doppelter Ring (weiß + Gold) plus Schlagschatten, statt nur einem dünnen Insetring.
- `.skill-roll` (Talent-Namen): Da reiner Text ohne Fläche keinen überzeugenden "Button-Effekt" hergibt, wird jetzt beim Hover/Fokus/Active die **gesamte Talent-Kachel** hervorgehoben (Hintergrund-Tönung, Goldrand, Schatten) über `.skill:has(.skill-roll:hover)` – setzt CSS `:has()` voraus, das in dieser Foundry-Installation bereits über `color-mix()` (gleiche Chromium-Mindestversion) bestätigt funktioniert.

## Sonderfertigkeits-Beschreibung war nicht editierbar – `data-edit`-Div ist AppV1-Legacy (Stand 2026-08-11)

Nutzer-Feedback: Die Beschreibung der Sonderfertigkeit (Rich-Text) ließ sich nicht bearbeiten. Root Cause per Recherche im entpackten Foundry-v14-Core-Quellcode (`D:\FoundryVTT\foundry-nodejs-v14\client`) gefunden:

- Das bisher verwendete Pattern `<div class="editor" data-edit="...">{{{enrichedHTML}}}</div>` ist **totes AppV1-Erbe**. Die Klick-zum-Bearbeiten-Aktivierung dafür (`_activateEditor`, Scan nach `.editor-content[data-edit]`) existiert nur noch in `client/appv1/api/form-application-v1.mjs` – es gibt sogar einen eigenen Hook `activateEditorLegacy`, der das als deprecated markiert. `foundry.applications.api.document-sheet.mjs` (die echte ApplicationV2-Basis, von der unser Sheet erbt) scannt **nicht** nach `div[data-edit]` – nur nach `img[data-edit]` (Bild-Picker, anderer Mechanismus, weiterhin gültig) und `prose-mirror`-Elementen für Secret-Blöcke.
- **Korrekter AppV2-Weg:** das Custom Element `<prose-mirror>` (`HTMLProseMirrorElement`, `client/applications/elements/prosemirror-editor.mjs`) – ein formularassoziiertes Custom Element, das sich selbst um Aktivierung, Speichern und `disabled`-Handling kümmert. Beleg aus Foundry-Core (`templates/journal/pages/text/edit.hbs`):
  ```html
  <prose-mirror name="text.content" value="{{ text.content }}" data-document-uuid="{{ uuid }}" collaborate relative></prose-mirror>
  ```
- Der `{{editor}}`-Handlebars-Helper existiert zwar noch, erzeugt aber standardmäßig (ohne registrierte `CONFIG.TextEditor.engines`) exakt das alte, in AppV2 nutzlose Div-Markup – also auch keine Abkürzung.

**Fix:** `templates/hero-sheet.hbs` nutzt jetzt `<prose-mirror name="system.specialAbility.description" value="{{system.specialAbility.description}}" data-document-uuid="{{actor.uuid}}" {{#unless editable}}disabled{{/unless}}></prose-mirror>` – normal ins Formular eingebunden (kein `always-active`, Beschreibung bleibt bewusst im Spielmodus gesperrt, ist echter Charakterinhalt). Die manuelle `enrichHTML()`-Berechnung (`enrichedSpecialAbility`) in `hero-sheet.mjs` wurde entfernt, da `<prose-mirror>` den rohen HTML-Wert direkt selbst rendert/verwaltet. CSS von `.ability .editor` auf `.ability prose-mirror` umgezogen.

**Merke für künftige Rich-Text-Felder in diesem Modul:** immer `<prose-mirror>`, nie `<div data-edit>`.

Nächster Schritt: Nutzer testet, ob sich die Sonderfertigkeits-Beschreibung jetzt bearbeiten und speichern lässt (inkl. Verhalten im Spielmodus – sollte dort gesperrt bleiben), danach Phase 3 (Macros).

## Drei weitere Tabs: Bilder, Items, Effekte (Stand 2026-08-11)

Nutzerwunsch: zusätzlich zu Held/Talente drei weitere Tabs im selben Icon-Rail – Bilder (Charakterbild + Token-Bild nebeneinander), Items und Effekte (letztere "wie im Original-Sheet"). Rail hat jetzt 5 Tab-Icons + Lock-Switch unten. `tab`/`tabs`-Mechanismus (Grid-Stack, gleiche Höhe für alle Tabs, kein Fenster-Resize beim Wechseln) ist bereits generisch für beliebig viele Tabs ausgelegt – keine Änderung an der Kernlogik nötig, nur mehr `<section class="tab">`-Blöcke + mehr Rail-Buttons mit `data-tab="..."`.

- **Bilder-Tab:** Zwei große Bild-Slots nebeneinander (`actor.img` / `system.skillImage` – siehe Korrektur weiter unten, ursprünglich fälschlich `actor.prototypeToken.texture.src`), beide über den bereits bewährten generischen `data-action="editImage" data-edit="<pfad>"`-Mechanismus änderbar (funktioniert für jeden Dokumentpfad, nicht nur `img`).
- **Items- und Effekte-Tab:** "Wie im Original-Sheet" wörtlich umgesetzt – Logik 1:1 aus `UTSActorSheet` (`uts.mjs`) übernommen, da das die vom Nutzer gemeinte Referenz ist: `viewDoc`/`createDoc`/`deleteDoc`/`toggleEffect`-Actions, `_getEmbeddedDocument()`-Helper (Dokument über `[data-document-class]`+`data-item-id`/`data-effect-id`+`data-parent-id` am `<li>` auflösen), `_getItems()` (Items nach Subtyp gruppiert, leere "base"-Gruppe ausgeblendet), `prepareActiveEffectCategories()` (Temporär/Passiv/Inaktiv-Gruppierung). Templates dafür (`items.hbs`/`effects.hbs` von UTS) als Referenz genutzt, aber komplett neu in der eigenen Optik (`.doc-list`/`.doc-group`/`.doc-row`) statt UTS' generischem Grau-Look gebaut.
- Wiederverwendete System-Locale-Keys von `universal-tabletop-system` (da als `relationships.systems`-Abhängigkeit sowieso geladen, genau wie zuvor schon `AVENTURIA.*`-Keys aus `aventuria` wiederverwendet wurden): `UTS.Sheets.Tabs.items`/`.effects` (Rail-Tooltips), `UTS.Effect.Temporary`/`.Passive`/`.Inactive`/`.Toggle`/`.Label`. Plus Foundry-Core-Keys `DOCUMENT.Create`/`.New`/`.Update`/`.Delete`/`.ActiveEffect` (immer verfügbar, systemunabhängig).
- `.doc-rows` hat `max-height:220px; overflow-y:auto` – bewusste Ausnahme vom "kein Scrollen"-Prinzip der Haupt-Tabs, da Items-/Effekte-Listen theoretisch unbegrenzt lang werden können und sonst das ganze Fenster (über den Grid-Stack-Höhenausgleich) unkontrolliert mitwachsen würde.
- `getDocumentClass` als globale Funktion bestätigt genutzt (exakt wie in `uts.mjs`), ebenso `game.documentTypes.Item` (pro Welt/System skaliert, keine Sorge vor "Item-Typ-Flut" durch fremde Module).

Nächster Schritt: Nutzer testet alle drei neuen Tabs live (Bild-Wechsel für Charakter- und Token-Bild, Item anlegen/öffnen/löschen, Effekt anlegen/umschalten/löschen), danach Phase 3 (Macros).

## `<prose-mirror>`-Nachbesserung: Inhalt unsichtbar + Toolbar auch gesperrt sichtbar (Stand 2026-08-11)

Zweite Recherche-Runde im entpackten Foundry-v14-Core (`client/applications/elements/prosemirror-editor.mjs` + `public/css/foundry2.css`) ergab zwei konkrete Bugs in meiner ersten `<prose-mirror>`-Umsetzung:

1. **Inhalt unsichtbar:** Core-CSS setzt `prose-mirror { display: flex; flex-direction: column; }` und darauf aufbauend `.editor-container { flex: 1; ... }` + `.editor-content { position: absolute; ... }` – der Text-Bereich braucht also zwingend den Flex-Kontext vom Host-Element, um überhaupt eine Höhe zu bekommen. Meine eigene Regel `.ability prose-mirror { display: block; ... }` hat genau das kaputt gemacht: `.editor-container` bekam dadurch keine echte Höhe mehr, der absolut positionierte Textbereich kollabierte auf 0px – der Inhalt war im DOM vorhanden, aber unsichtbar. **Fix:** `display` bei `prose-mirror` gar nicht mehr anfassen (Core-Default `flex` bleibt bestehen), nur noch Typografie (`font-family`/`font-size`/`line-height`/`color`) überschreiben. Zusätzlich `--min-height: 90px` gesetzt (von Core selbst als Stellschraube vorgesehen, siehe `.active-effect-config prose-mirror { --min-height: 200px }`).
2. **Toolbar bleibt bei `disabled` sichtbar:** Bestätigt kein Foundry-Bug/Fehlannahme meinerseits, sondern Absicht von Core – `_toggleDisabled` macht nur den Text nicht mehr editierbar, blendet die Formatierungs-Toolbar (`<menu>`) aber bewusst nicht aus. Eigene Regel ergänzt: `prose-mirror[disabled] menu, prose-mirror[disabled] .menu-container { display: none; }`.

Nebenbei: "Charakterbild" im Bilder-Tab auf Nutzerwunsch zu "Heldenkarte" umbenannt (`AVENTURIA_HELPERS.HeroSheet.CharacterArt`).

**Korrektur "Token-Bild ist falsch" (Stand 2026-08-11):** War kein Bug im Sinne von falschem Pfad, sondern eine falsche Annahme meinerseits, WAS ins rechte Bild gehört. `actor.prototypeToken.texture.src` war technisch korrekt verifiziert, aber schlicht das falsche Feld – die "zweite Karte" bei Aventuria ist nicht das Foundry-Token-Bild, sondern die **Talentkarte** (`system.skillImage`). Nutzer-Hinweis: `aventuria` selbst bietet dafür bereits einen Menüpunkt **"View Skill Card"** im Sandwich-Menü (Fenster-Titelleiste) jedes Hero-Sheets. Fund in `aventuria/dist/index.js`:

```js
Hooks.on("getHeaderControlsActorSheetV2", (e, t) => {
  t.push({
    label: "AVENTURIA.Models.Hero.ViewSkillCard",
    icon: "fa-solid fa-dice-d20",
    visible: e.document.type === "aventuria.hero",
    onClick: async (t) => {
      new foundry.applications.apps.ImagePopout({ src: e.document.system.skillImage, uuid: e.document.uuid, window: { title: e.document.name } }).render({ force: true });
    }
  });
});
```
Wichtige Erkenntnis nebenbei: dieser Hook feuert **für unser eigenes Sheet mit**, obwohl unsere Klasse `AventuriaHelpersHeroSheet` heißt, nicht `ActorSheetV2` – Foundry feuert `getHeaderControls<Name>` offenbar auch für die Basisklasse(n) in der Prototypkette, nicht nur für den eigenen Klassennamen (`foundry.applications.sheets.ActorSheet`, von der wir erben, trägt intern offenbar noch den Namen `ActorSheetV2`). Bedeutet: alle `getHeaderControlsActorSheetV2`-Hooks aus `aventuria` gelten automatisch auch für unser Sheet, ohne dass wir etwas dafür tun müssen.

**Fix:** Bilder-Tab rechts zeigt jetzt `system.skillImage` (Talentkarte) statt `actor.prototypeToken.texture.src`, inkl. `data-edit="system.skillImage"`. Wiederverwendet die bereits vorhandenen (aber bis dahin ungenutzten) Locale-Keys `AVENTURIA_HELPERS.HeroSheet.SkillCard`/`.SkillImageTooltip`. `TokenArt`-Locale-Key entfernt (nicht mehr referenziert).

## Bilder im Spielmodus: Klick öffnet Großansicht statt nichts zu tun (Stand 2026-08-11)

Nutzerwunsch: Die beiden Bilder im Bilder-Tab sollen im Spielmodus (nicht editierbar) bei Klick eine Großansicht öffnen, statt (wie bisher) einfach nichts zu tun, da `data-action="editImage"` dort komplett fehlte.

**Fix:** Neue Action `viewImage` (`scripts/sheets/hero-sheet.mjs`), nutzt denselben Mechanismus wie `aventuria`s eigenes "View Skill Card" (`new foundry.applications.apps.ImagePopout({src, uuid, window:{title}}).render({force:true})`). Template zeigt jetzt pro Bild `{{#if editable}}editImage{{else}}viewImage{{/if}}` – editierbar → Datei-Picker (wie gehabt), gesperrt → Großansicht. Keine `always-active`-Klasse nötig: `<img>` ist kein formularassoziiertes Element und wird von der `_onRender()`-Deaktivierungs-Logik (die nur `form.elements` betrifft) gar nicht erst angefasst.

Nächster Schritt: Nutzer testet Bild-Klick sowohl im Normal- (Picker öffnet) als auch im Spielmodus (Großansicht öffnet), danach Phase 3 (Macros).

## Phase 3, erstes Macro: Karten auf der Spieloberfläche zurückdrehen (Stand 2026-08-11)

Erstes richtiges Macro des Moduls (bisher nur das Hero-Sheet). Zweck: Karten, die per **Complete Card Management** (`complete-card-management`, kurz CCM) auf der Spieloberfläche (Canvas) liegen, per Klick wieder auf Rotation 0° zurücksetzen – unabhängig von der bisherigen Proben-/Sheet-Logik.

- **Datenmodell-Fund (per Quellcode-Analyse von `modules/complete-card-management/ccm.mjs`, nicht verändert):** CCM platziert Karten nicht als eigene Scene-Placeable-Dokumente, sondern hängt die Canvas-Daten (`x`, `y`, `rotation`, `sort`, `hidden`, `locked`, `flipped`) als **Flag direkt am `Card`- bzw. `Cards`-Dokument** ab, unter `flags.complete-card-management.<sceneId>` (Konstante `MODULE_ID = "complete-card-management"` in `ccm.mjs`). Es gibt keine öffentliche CCM-API-Funktion zum Zurücksetzen der Rotation (`ccm.api` bietet nur `placeCard`/`removeCard`/`recallCard`/`grid`/`scry`/`triangle` u.ä.), daher komplett eigene Logik.
- **Live-Karten der aktuellen Spieloberfläche:** `canvas.cards.placeables` (CCM registriert dafür einen eigenen `CardLayer` unter `canvas.cards`, `documentName: "Card"`). Jedes Element ist ein `CardObject`, dessen `.document` ein synthetisches `CanvasCard`-DataModel ist; `.document.card` liefert das eigentliche `Card`/`Cards`-Dokument, an dem der Flag hängt.
- **Neue Datei** `scripts/macros/reset-card-rotations.mjs`, Funktion `resetCardRotations()`: prüft CCM aktiv + GM-Rolle + offene Spieloberfläche, iteriert `canvas.cards.placeables`, setzt für jede Karte mit `rotation !== 0` gezielt `flags.complete-card-management.<sceneId>.rotation` per `card.update()` auf `0` zurück (nur betroffene Karten, kein Blind-Update aller), Sammel-Feedback per `ui.notifications`.
- **Registrierung/Aufruf:** nur `game.modules.get("aventuria-helpers").api = { resetCardRotations }` im `init`-Hook – kein automatisch angelegtes Welt-Macro. Auf Nutzerwunsch (2026-08-11) reicht es, dass die Funktion existiert; das eigentliche Macro-Dokument (Aufruf `game.modules.get("aventuria-helpers").api.resetCardRotations();`) kommt später in ein **Modul-Kompendium** (Macro-Pack, analog zu `aventuria`s eigenem `packs/macros`) statt automatisch pro Welt erzeugt zu werden. Der Locale-Key `AVENTURIA_HELPERS.Macros.ResetCardRotations.Name` ist dafür bereits vorbereitet.
- **Absichtlich nur Rotation, nicht Position:** Nutzerwunsch war explizit "zurückdrehen" (Rotation), nicht "an Ausgangsposition verschieben" – Kartenposition bleibt unangetastet, nur der Rotationswinkel wird auf 0 gesetzt.
- `complete-card-management` wurde zusätzlich zu `aventuria` in `module.json` unter `relationships.requires` eingetragen (ist ohnehin transitiv über `aventuria`s eigene `requires` immer aktiv, aber jetzt auch direkt dokumentiert, da `reset-card-rotations.mjs` seine Flags direkt liest/schreibt).

Nächster Schritt: Nutzer testet das Macro live (mehrere Karten auf der Spieloberfläche drehen, Macro ausführen, prüfen dass nur Rotation zurückgesetzt wird und Position/andere Karten unangetastet bleiben).

## Combat Tracker: feste rotierende Initiative statt Würfeln (Stand 2026-08-11)

Aventuria würfelt keine Initiative – die Heldenreihenfolge im Combat Tracker wird einmal fest vorbelegt (z.B. per manuell eingetragenen Initiative-Werten, wie im Standard-Tracker üblich) und dreht sich danach **jede Runde um genau einen Platz weiter**: wer in Runde 1 zuerst dran ist, ist in Runde 2 zuletzt dran, usw. (zyklische Rotation, kein Zufall).

- **Recherche im entpackten Foundry-v14-Core (`client/documents/combat.mjs`):** `Combat#_sortCombatants(a, b)` ist laut eigenem Docstring explizit für System-/Modul-Overrides vorgesehen ("This method can be overridden by a system or module which needs to display combatants in an alternative order") – der korrekte, von Foundry selbst vorgesehene Erweiterungspunkt. Standardmäßig sortiert sie absteigend nach `combatant.initiative`.
- **Wichtiger Fund:** Ein reines Überschreiben von `_sortCombatants` reicht **nicht**, damit sich die Reihenfolge automatisch pro Runde ändert. `Combat#_onUpdate()` ruft `setupTurns()` (das `this.turns` per `_sortCombatants` neu sortiert) nur auf, wenn `"combatants" in changed` ist (also bei Combatant-Änderungen) – bei einem reinen Runden-/Zug-Wechsel (`nextRound()`/`previousRound()`, `changed = {round, turn}`) nimmt der Core-Code den anderen Zweig (`this.current = this._getCurrentState()`) und sortiert `this.turns` **nicht** neu, weil sich `initiative`-Werte zwischen Runden ja normalerweise nicht ändern. Für unsere rundenabhängige Sortierung muss `setupTurns()` deshalb zusätzlich manuell angestoßen werden, sobald sich `round` ändert.
- **UTS-Fund (`systems/universal-tabletop-system/uts.mjs`):** `CONFIG.Combat.documentClass = UTSCombat` wird **innerhalb** von UTS' eigenem `Hooks.once("init")` gesetzt, nicht beim Modul-Laden/Import. Eine eigene Kindklasse muss deshalb ebenfalls **innerhalb eines eigenen `init`-Hooks** gebaut werden (und nicht auf Modul-Ebene per `class X extends CONFIG.Combat.documentClass`), da Foundry `init`-Hooks in Abhängigkeitsreihenfolge feuert (System vor Modulen) – zum Zeitpunkt des `init`-Hooks von `aventuria-helpers` zeigt `CONFIG.Combat.documentClass` bereits korrekt auf `UTSCombat`, beim reinen Modul-Import (vor jedem Hook) aber noch auf die Foundry-Core-Basisklasse. Gleiches Muster wie bei der bereits bestehenden Hero-Sheet-Registrierung (ebenfalls im `init`-Hook, nach dem System).
- **Umsetzung:** Neue Datei `scripts/documents/combat.mjs`, Funktion `registerCombat()` (aufgerufen aus dem `init`-Hook in `aventuria-helpers.mjs`, nach der Sheet-Registrierung), baut zur Laufzeit eine Kindklasse `AventuriaHelpersCombat extends CONFIG.Combat.documentClass` (also von `UTSCombat` erbend) und setzt `CONFIG.Combat.documentClass` darauf um:
  - `startCombat()`: erfasst die aktuelle Zugreihenfolge (`this.turns.map(c => c.id)`, zu diesem Zeitpunkt noch normal nach Initiative sortiert, also genau das, was die Spielleitung manuell vorbelegt hat) als Flag `flags.aventuria-helpers.rotationOrder` auf dem Combat-Dokument, bevor `super.startCombat()` auf Runde 1 setzt. Wird bei jedem `startCombat()`-Aufruf neu erfasst (kein Schutz vor Überschreiben nötig – bei erneutem Start nach `previousRound()` zurück auf Runde 0 liefert das wegen der Rotationsformel ohnehin wieder dieselbe Grundreihenfolge).
  - `_sortCombatants(a, b)`: berechnet pro Combatant einen "Sitzplatz" relativ zur `rotationOrder`-Liste, verschoben um `(Runde - 1) % Anzahl_Plätze`. Combatants, die nicht in `rotationOrder` stehen (z.B. nachträglich zur laufenden Begegnung hinzugefügt), fallen auf die normale initiative-basierte Sortierung zurück und landen dadurch immer hinter allen rotierenden Combatants. Ohne gesetztes Flag (z.B. bevor `startCombat()` je aufgerufen wurde) greift ganz normal `super._sortCombatants()`.
  - `_onUpdate(changed, options, userId)`: ruft nach `super._onUpdate()` bei `"round" in changed` zusätzlich `this.setupTurns()` (löst genau die oben gefundene Lücke) plus `ui.combat.render()`, falls das die gerade betrachtete Begegnung ist.
- **Bewusst nicht eingebaut:** kein Filtern nach Combatant-Typ (`player` vs. `base`) – alle zum Startzeitpunkt vorhandenen Combatants rotieren gemeinsam als Block, unabhängig vom Typ. Kein UI-Eingriff an den Standard-"Initiative würfeln"-Buttons/Feldern des Trackers (bleiben sichtbar, werden aber für den Rotationsmechanismus nicht gebraucht – Werte dienen nur noch als Fallback-Tiebreak für nicht-rotierende Combatants).

Nächster Schritt: Nutzer testet live mit 3 Helden im Combat Tracker (Reihenfolge initial vorbelegen, "Kampf beginnen" klicken, mehrere Runden weiterschalten, prüfen dass die Rotation exakt wie im Beispiel läuft und auch bei "vorherige Runde" korrekt rückwärts funktioniert).

## Nach Rundenende: Abfrage zum Kartenzurückdrehen (Stand 2026-08-11)

Ergänzt: `AventuriaHelpersCombat#nextRound()` (in `scripts/documents/combat.mjs`) überschreibt zusätzlich `nextRound()` – nach `super.nextRound()` (also sobald eine neue Runde beginnt) fragt ein `DialogV2.confirm()`-Dialog die Spielleitung, ob alle Karten auf der Spieloberfläche zurückgedreht werden sollen; bei Bestätigung wird direkt das bereits vorhandene Macro `resetCardRotations()` aus `scripts/macros/reset-card-rotations.mjs` aufgerufen (importiert, nicht über die `game.modules.get(...).api`-Indirektion, da beides im selben Modul liegt).

- Abfrage nur für GM (`game.user.isGM`) und nur, wenn Complete Card Management aktiv ist – sonst macht die Frage keinen Sinn und wird gar nicht erst gestellt.
- Bewusst an `nextRound()` gehängt, nicht an `previousRound()` oder den `_onUpdate`-Hook: `nextRound()` läuft nur bei dem Client, der tatsächlich die Runde weiterschaltet (i.d.R. die Spielleitung selbst), nicht bei jedem verbundenen Client wie es `_onUpdate` täte – Spieler bekommen die Abfrage also nicht zu sehen. Foundry hat im Tracker ohnehin nur einen "Weiter"-Pfeil (`nextTurn()`), der `nextRound()` automatisch aufruft, sobald der letzte Zug der Runde vorbei ist – kein separater "Nächste Runde"-Button nötig, unser Override greift trotzdem korrekt.
- Locale-Keys ergänzt: `AVENTURIA_HELPERS.Macros.ResetCardRotations.ConfirmTitle`/`.ConfirmBody`.

## Bugfix: `_sortCombatants` crashte beim Hinzufügen von Actors (Stand 2026-08-11)

Live-Test ergab einen Absturz ("Cannot read properties of undefined (reading 'getFlag')") beim Hinzufügen von Actors zum Combat Tracker. Ursache: Foundry-Core ruft in `setupTurns()` `this.combatants.contents.sort(this._sortCombatants)` auf – also eine **entkoppelte** Funktionsreferenz, kein gebundener Methodenaufruf. Cores eigene Standardimplementierung kommt damit klar, weil sie kein `this` braucht (nur `a.initiative`/`b.initiative`); meine Override-Version griff aber auf `this.getFlag(...)`/`this.round` zu, wodurch `this` beim Aufruf über `Array.sort` `undefined` war.

**Fix:** `_sortCombatants` ist jetzt kein Prototyp-Methoden-Eintrag mehr, sondern ein **Instanz-Feld mit Arrow-Function** (`_sortCombatants = (a, b) => {...}`) – dadurch bleibt `this` unabhängig vom Aufrufkontext an die Combat-Instanz gebunden. `super._sortCombatants(...)` funktioniert innerhalb von Klassenfeld-Arrow-Functions genauso wie in normalen Methoden (eigenes `[[HomeObject]]`-Binding).

## Initiative wird automatisch vergeben statt gewürfelt (Stand 2026-08-11)

Nutzer-Feedback: Trotz der Rotationslogik musste vor Kampfbeginn weiterhin manuell "Initiative würfeln" geklickt werden – ohne Wurf bleiben neue Combatants ohne Initiative-Wert, wodurch die Vorab-Reihenfolge (später als `rotationOrder` in `startCombat()` eingefroren) effektiv zufällig nach Combatant-ID sortiert wurde statt nach der erwarteten Hinzufüge-Reihenfolge.

**Fix:** `AventuriaHelpersCombat#_onCreateDescendantDocuments()` (überschreibt die gleichnamige Core-Methode, die für Änderungen an der `combatants`-Embedded-Collection zuständig ist) vergibt bei jedem Hinzufügen automatisch fortlaufende Ränge 1 bis X an **alle** aktuell im Combat befindlichen Combatants, gezählt in ihrer natürlichen Sammlungsreihenfolge (= Hinzufüge-Reihenfolge). Absichtlich absteigend vergeben (zuerst hinzugefügter Combatant bekommt die höchste Zahl): Cores Standard-Sortierung (`_sortCombatants`, greift vor Kampfbeginn noch, da `rotationOrder` erst mit `startCombat()` gesetzt wird) sortiert absteigend nach Initiative – höchster Wert zuerst. Kein manuelles Würfeln mehr nötig, die Initiative-Zahlen sind rein technisches Mittel zum Zweck und werden nach `startCombat()` ohnehin komplett von der Rotationslogik ignoriert.

- Guard `game.user.isActiveGM` statt nur `game.user.isGM` – bewusst dem Core-Vorbild in `_onCreateDescendantDocuments` (dort z.B. für `#onEnter`) nachempfunden, verhindert doppelte/racende Schreibzugriffe, falls mehrere GMs gleichzeitig verbunden sind.
- `Combat#_onCreateDescendantDocuments` (die von uns überschriebene Core-Methode) ruft intern bereits `#onModifyCombatants()` auf, was `setupTurns()` + `ui.combat.render()` selbst erledigt – nach dem `updateEmbeddedDocuments()`-Aufruf für die Initiative-Werte ist also kein zusätzlicher manueller Re-Sort/Render-Aufruf nötig (das löst wiederum `_onUpdateDescendantDocuments` aus, das laut Core-Code ebenfalls automatisch `#onModifyCombatants()` aufruft).

Nächster Schritt: Nutzer testet live – mehrere Actors zum Combat Tracker hinzufügen (auch als Mehrfachauswahl auf einmal) und prüfen, dass sofort eine sinnvolle, der Hinzufüge-Reihenfolge entsprechende Initiative-Zahl gesetzt wird, ganz ohne Würfeln.

## Fixer Dummy-Kämpfer "Gegneraktionen" bei Initiative 0 (Stand 2026-08-11)

Nutzerwunsch: ein Platzhalter-Eintrag im Combat Tracker namens "Gegneraktionen", der immer an letzter Stelle steht (Initiative 0) und **nicht** an der Rotation teilnimmt – repräsentiert die Phase, in der die Spielleitung die Gegner-Aktionen abhandelt.

- **Recherche:** Foundrys `CombatTracker._createContextMenu(handler, ".encounter-context-menu", { hookName: "getCombatContextOptions", parentClassHooks: false })` (Core, `client/applications/sidebar/tabs/combat-tracker.mjs`) feuert bei jedem Rechtsklick-Menü-Aufbau `Hooks.callAll("getCombatContextOptions", app, menuItems)` – **unabhängig davon**, welche Subklasse (`UTSCombatTracker`) gerade aktiv ist, und das zurückgegebene `menuItems`-Array (das UTS' bereits eingehängtes "Spieler hinzufügen" enthält) wird per Referenz weitergereicht, sodass ein Hook-Listener eigene Einträge reinschieben kann, ohne `UTSCombatTracker` selbst zu subclassen. Sauberer Erweiterungspunkt, genau wie schon `_sortCombatants` bei `Combat`.
- **Neue Funktion** `registerEnemyPhaseCombatant()` in `scripts/documents/combat.mjs` (aufgerufen im `init`-Hook): hängt sich in genau diesen Hook und ergänzt "Gegneraktionen hinzufügen" (Icon: `fa-dragon`, nur für GM, nur wenn ein Combat aktiv ist – `app.viewed`). Legt beim Klick einen **token-losen** Combatant an (`Combatant.tokenId` ist laut Core-Schema nicht `required`, funktioniert also auch ganz ohne platziertes Token/Actor – analog zu UTS' eigenem "player"-Combatant-Typ, der ebenfalls ohne Token auskommt): `name: "Gegneraktionen"`, `img` wiederverwendet `modules/aventuria/assets/icons/action-opponent.webp` (kein Duplizieren von Assets), `initiative: 0`, sowie Erkennungs-Flag `flags.aventuria-helpers.enemyPhase = true`.
- **Integration in die Rotationslogik (`AventuriaHelpersCombat`, siehe oben):** zwei gezielte Ausnahmen, sonst unverändert:
  - `startCombat()` filtert Combatants mit gesetztem `enemyPhase`-Flag beim Einfrieren von `rotationOrder` heraus.
  - `_onCreateDescendantDocuments()`s Auto-Nummerierung (1..X) lässt geflaggte Combatants ebenfalls aus, damit ihre feste `initiative: 0` nicht überschrieben wird.
  - Kein weiterer Code nötig, damit der Dummy **immer** zuletzt steht: `_sortCombatants()` behandelt jeden nicht in `rotationOrder` enthaltenen Combatant ohnehin schon als "Seat `Infinity`" (fällt hinter alle rotierenden Plätze zurück) – das greift für den Dummy automatisch in jeder Runde, weil er nie Teil von `rotationOrder` wird. Vor Kampfbeginn (`rotationOrder` noch nicht gesetzt) sorgt die normale Initiative-Sortierung selbst dafür, dass `0` niedriger ist als jeder vergebene Rang (1..X) und der Dummy dadurch schon vorab ganz unten steht.

Live getestet (2026-08-11) – funktioniert wie vorgesehen, Dummy bleibt über mehrere Runden fix an letzter Stelle, keine weiteren Korrekturen nötig.
