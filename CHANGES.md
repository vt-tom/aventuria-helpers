# Änderungen – Aventuria Helfer

Diese Datei listet alle spielrelevanten Neuerungen des Moduls auf – neueste Version zuerst.

## 0.3.0

### Features
- **Neues Fenster "Ausdauerkarten":** Über den Auge-Button in der Ausdauer-Zeile der Heldenablage öffnet sich ein Fenster mit allen als Ausdauer gespielten Karten. Ein Klick auf eine Karte erschöpft sie bzw. macht sie wieder bereit, der Button darunter nimmt sie zurück auf die Hand, und über das Rechtsklick-Menü lässt sie sich ablegen. Beim Darüberfahren wird die Vorderseite der Karte groß angezeigt (die Karte liegt ja verdeckt). Das Fenster dockt über der Heldenablage an und lässt sich wie die anderen Kartenfenster frei verschieben und per "…"-Menü zurücksetzen.
- **Anderen Helden über die Heldenablage steuern (Solo-Spiel):** Über den neuen Helden-Button in der Kopfleiste der Heldenablage (oder per Rechtsklick auf das Portrait) öffnet sich ein Radialmenü mit allen im Spiel befindlichen Helden. Wählst du dort einen anderen Helden, steuert die Heldenablage ab sofort dessen Karten, Hand, Ausdauer und ausgespielte Karten - praktisch, wenn du solo mehrere Helden führst, ohne dafür einen zweiten Browser zu öffnen. Deine eigene Heldenzuordnung bleibt dabei unverändert; ein rotes Band und ein "Zurück zu meinem Helden"-Button zeigen, dass gerade ein fremder Held gesteuert wird. Beim nächsten Neuladen startet die Ablage wieder bei deinem eigenen Helden.
- **Heldentoken dreht sich mit der Ausrüstung mit:** Wird die Ausrüstung eines Helden erschöpft (per Wurf, Sheet-Button oder Macro), dreht sich sein Token auf der Szene automatisch um 90° im Uhrzeigersinn - beim Bereitmachen (auch automatisch am Ende jeder Kampfrunde) dreht er sich wieder zurück.
- **Abenteuerpunkte & Stufenaufstieg:** Der Charakterbogen hat jetzt einen Bereich "Stufenaufstieg" mit einem Abenteuerpunkte-Konto (manuell per +/- eintragbar) und zwei unabhängigen "Steigern"-Buttons für Heldenkarte und Talentkarte (Kosten: je 3 Abenteuerpunkte, maximal Stufe III). Ein Dialog zeigt vorher genau, welche Werte sich ändern ("Nahkampf 14 → 16" usw.) und muss bestätigt werden, bevor etwas geschrieben wird. Verfügbar für die 12 Schnellstarter-Helden aus "Kelche der Macht".
- **Aktionskarten verbessern:** Im "Stufenaufstieg"-Bereich lässt sich jetzt auch das Heldendeck selbst verbessern - einzelne Aktionskarten gegen die gleichnamige, eine Stufe höhere Karte aus dem Erfahrungsschatz des Helden tauschen (1 Abenteuerpunkt je Karte). Ein neues Fenster zeigt alle möglichen Karten paarweise nebeneinander (aktuelle Karte und Zielkarte, mit vergrößerter Vorschau bei Mouseover), mehrere Karten lassen sich gleichzeitig markieren und in einem Schritt bestätigen. Karten lassen sich auch wieder zurückstufen - die dafür bezahlten Abenteuerpunkte werden dabei vollständig erstattet.

### Bugs
- Eine Karte ausspielen, über das Sheet zurück auf die Hand nehmen und erneut ausspielen ließ die Karte bisher von der Spieloberfläche verschwinden (sie hing unsichtbar im Im-Spiel-Stapel fest); bei Ausdauerkarten tauchte sie danach im falschen Fenster auf. Behoben. Bereits betroffene Welten werden beim nächsten Start automatisch bereinigt – kein manuelles Zurücksetzen nötig.
- Bereits vor dem "Aktionskarten verbessern"-Feature zugewiesene Helden bekommen ihren Erfahrungsschatz jetzt automatisch beim nächsten Weltstart nachgeliefert, statt dass ihn erst jemand über den Hinweis-Button im Dialog manuell anlegen muss.

## 0.2.2

### Features
- **"Karte erschöpfen" im Ausgespielte-Karten-Fenster:** Jede ausgespielte Karte hat jetzt einen eigenen Erschöpfen/Bereit-machen-Button, erkennbar an einer gedimmten Kartendarstellung im erschöpften Zustand. "Ablegen" und "Zurück auf die Hand nehmen" sind dafür (zusammen mit dem bereits vorhandenen "Zurück ins Deck mischen") ins Rechtsklick-Menü der Karte gewandert.
- **Ausgespielte-Karten-Fenster schließt jetzt bündig mit der Heldenablage ab**, statt mit festem Abstand unter der Hand zu docken und dabei sichtbar Leerraum darunter zu lassen.
- **Neue Macros "Held erschöpfen" und "Held bereitmachen":** wirken auf den ausgewählten Heldentoken (oder den eigenen zugewiesenen Helden), gleicher Effekt wie der bereits vorhandene Erschöpfen-Button auf dem Heldenbogen. Am Ende jeder Kampfrunde werden jetzt zusätzlich automatisch alle erschöpften Helden bereitgemacht, zusammen mit der bestehenden Abfrage zum Kartenzurückdrehen.
- **Die "Ansehen"-Buttons in der Heldenablage** (Deck, Ablage, Hand, Ausgespielte Karten) schließen das jeweilige Fenster jetzt auch wieder, wenn man sie bei bereits geöffnetem Fenster erneut anklickt.
- **Hand- und Ausgespielte-Karten-Fenster merken sich jetzt eine per Hand verschobene Position**, auch wenn das Fenster zwischendurch komplett geschlossen und wieder geöffnet wird.

### Bugs
- Wurde das Ausgespielte-Karten-Fenster geöffnet, bevor das Hand-Fenster offen war, blieb es beim späteren Öffnen der Hand dauerhaft auf deren Position stehen statt automatisch darunter zu rutschen (auch "Position zurücksetzen" half nicht) - behoben.
- Eine Erschwernis/Erleichterung bei einer Probe wurde in der Ergebnis-Chatkarte fälschlich als Abzug vom Würfelergebnis dargestellt statt als Änderung des Zielwerts - das Ergebnis (bestanden/nicht bestanden) war davon nicht betroffen, nur die Anzeige ist jetzt korrekt.
- Die Heldenablage hatte ohne zugewiesenen Helden keinen sichtbaren Hintergrund - behoben.
- "Board aufräumen" übersah Karten, die während des Spiels automatisch in den gemeinsamen "Abenteuerkarten im Spiel"- bzw. "Schergen im Spiel"-Stapel gewandert waren - werden jetzt ebenfalls zurück in ihr Deck gemischt.
- Bei kleinem Browserfenster konnte die Heldenablage hinter Foundrys Makro-Leiste verschwinden - behoben.
- Beim Lösen des Hand- oder Ausgespielte-Karten-Fensters in ein eigenes Browser-Fenster ("Detach Window") war die große Karten-Vorschau beim Überfahren einer Karte nicht sichtbar - erscheint jetzt zentriert auf der Spieloberfläche im Hauptfenster.
- Im Dark Mode war die Beschriftung "Modifikator" im Proben-Dialog kaum lesbar - behoben.
- Im Dark Mode waren die Überschrift "Aventuria" und Schritttitel wie "Held zuweisen" im Willkommensbildschirm kaum lesbar - behoben.
- Im Dark Mode waren die Seitentitel "Ausrüstung"/"Sonderfertigkeiten" im Charakterbogen kaum lesbar, und die Tabelle "Erlaubte Aktionskarten" hatte einen schmutzig-grauen statt hellen Hintergrund - behoben.

## 0.2.0 (Beta)

### Features
- **Ruhige Papierfläche statt pixeliger Pergamentgrafik:** Die Bögen und Modulfenster verwenden jetzt die einheitliche Hintergrundfarbe `#EEE3C8`; die niedrig aufgelöste Pergamenttextur wurde entfernt.
- **Neuer Standard-Heldenbogen "Aventuria Helpers Charactersheet":** ein kompakter, an den Aventuria-Heldenkarten orientierter Bogen ist jetzt der Standardbogen und wird neu angelegten Helden automatisch zugewiesen. Sein Kopf bleibt beim Seitenwechsel sichtbar; reine Symbol-Fähnchen führen zu Held, Talenten, erlaubten Karten, Bildern, Items und Effekten. Die komplette Fähnchenleiste lässt sich je Benutzer nach links oder rechts verschieben. Der bisherige Heldenbogen bleibt unter dem Namen "Aventuria Helpers (old)" über „Sheet konfigurieren“ weiterhin wählbar.
- **Passende Hover-Effekte im Karten-Heldenbogen:** Fertigkeitsproben und Grundausstattung werden dezent aufgehellt und wie ein Medaillon fokussiert. Talente erhalten stattdessen eine ruhige Prägung; unter ihrem Wert erscheint ein leicht pulsierendes W20-Symbol. Die Seiten-Fähnchen werden mit einer anthrazitfarbenen Kante hervorgehoben.
- **Ausdauer-Kosten als Kreis:** Die Ausdauer-Kosten der Ausrüstung im Karten-Heldenbogen werden jetzt wie auf den Aventuria-Karten selbst als eingekreiste Zahl dargestellt statt mit separatem Symbol.
- **Sonderfertigkeit mit eigenem Symbol:** Der Bereit/Verwendet-Schalter der Sonderfertigkeit im Karten-Heldenbogen zeigt jetzt zusätzlich das Aventuria-Symbol für Sonderfertigkeiten, im Zustand "Verwendet" eingegraut.
- **Kompendien in einem gemeinsamen Ordner:** "Macros", "Aventuria Helpers Guide" und "Changelog" erscheinen im Kompendium-Tab der Sidebar jetzt gebündelt in einem Ordner "Aventuria Helpers" statt einzeln aufgelistet.
- **Heldenablage im neuen Kartenbogen-Look:** Kopfleiste, Portrait und Deck-/Ablage-/Ausdauer-Zeilen tragen jetzt dieselbe warme Pergament-/Kupfer-Optik wie der neue Charakterbogen, statt der bisherigen schlichteren Optik. Der Umschalt-Button in der Spielerliste ist dabei ebenfalls größer geworden und zeigt beim Überfahren mit der Maus jetzt denselben Doppelring-Leuchteffekt wie die Proben-Medaillons im Charakterbogen.
- **Abenteuer-Tool-Kopfbereich kompakter:** "Vorbereitung", "Verlauf" und "Seiten-Navigation" sind jetzt drei kleine Symbol-Buttons statt drei immer sichtbarer Kästen - ein Klick klappt bei Bedarf das passende Panel auf, alles andere bleibt zusammengeklappt und macht mehr Platz für den eigentlichen Abenteuertext.
- **Hand- und Ausgespielte-Karten-Fenster, Willkommensguide und das restliche Abenteuer-Tool-Fenster im neuen Kartenbogen-Look:** dieselbe warme Pergament-/Kupfer-Optik wie Charakterbogen und Heldenablage, statt der bisherigen schlichteren Optik bzw. (beim Willkommensguide) Foundrys unverändertem Standard-Fenster. Der "Held auswählen"-Dialog übernimmt die neuen Knopf-/Schrift-Farben automatisch mit, da er dieselben Bausteine nutzt.

### Bugs
- Hand- und Im-Spiel-Fenster konnten beim ersten Öffnen übereinander erscheinen; das Im-Spiel-Fenster dockt jetzt sofort korrekt unterhalb der Hand an.
- Die Aktionsbuttons unter Handkarten und ausgespielten Karten konnten leer oder oval erscheinen. Ausdauer spielen, Ablegen und Zurück auf die Hand sind jetzt mit gut erkennbaren Symbolen versehen und bleiben einheitlich kreisrund.
- Im neuen Karten-Heldenbogen wurden die vier Probenmedaillons durch Foundrys globale Button-Darstellung verschoben; Zahl und Beschriftung stehen jetzt wieder sauber untereinander. Die Sonderfertigkeit zeigt im gesperrten Ansichtsmodus außerdem keinen weiterhin bedienbaren Rich-Text-Editor mehr, sondern nur noch den formatierten Inhalt.
- Im Karten-Heldenbogen ließen sich die maximalen Lebenspunkte nicht ändern; jetzt im Bearbeiten-Modus editierbar (die aktuellen Lebenspunkte bleiben wie gehabt jederzeit änderbar, auch gesperrt).
- Im Karten-Heldenbogen ließ sich eine hinzugefügte zweite Ausrüstung nicht mehr entfernen; dafür jetzt ein Papierkorb-Button an der Zeile im Bearbeiten-Modus.
- Kritische Würfe wurden bei Proben nicht berücksichtigt: eine gewürfelte 1 oder 20 zählte bislang wie jedes andere Ergebnis und konnte durch einen Modifikator sogar falsch als Misserfolg bzw. Erfolg gewertet werden. Bei Talentproben zeigt der Chat jetzt korrekt alle vier Ergebnisse (Kritischer Erfolg/Erfolg/Misserfolg/Kritischer Misserfolg); eine 1 ist immer ein kritischer Erfolg, eine 20 immer ein kritischer Misserfolg, unabhängig vom Modifikator. Angriffsproben (Ausrüstung sowie die Nahkampf-/Fernkampf-/Magie-/Ausweichen-Medaillons) zeigen weiterhin nur Erfolg/Misserfolg, werten einen kritischen Wurf aber ebenfalls korrekt aus.
- Der "Abenteuer spielen gesperrt"-Hinweis konnte oben links hängen bleiben und ließ sich dann nicht mehr schließen - behoben.
- Die Sperre des Abenteuer-Tools blieb bestehen, wenn ein Spieler Foundry verlässt statt das Tool bewusst zu schließen - wird jetzt automatisch freigegeben.
- Neue "Seiten-Navigation" im Abenteuer-Tool (eines der drei neuen Symbol-Panels): listet alle Seiten des Abenteuers, damit man auch ohne passenden Weiterführungslink im Text jederzeit weiterspringen kann.
- Nach "Board aufräumen" konnte eine ausgespielte Karte auf der Spieloberfläche zurückbleiben, und entfernte Karten blieben unsichtbar im Im-Spiel-Stapel eines Helden hängen - beides behoben, die Heldendecks werden beim Aufräumen jetzt vollständig zurückgesetzt.
- Hand- und Ausgespielte-Karten-Fenster waren durch die neue Papierfarbe versehentlich blickdicht geworden statt wie vorgesehen leicht durchscheinend über dem Spielbrett zu schweben - wieder durchscheinend.

## 0.1.5

### Features
- **Neuer Willkommensbildschirm-Eintrag "Abenteuer spielen":** Ein eigenes Abenteuer-Tool führt durch die 10 Standard-Abenteuer - Abenteuer auswählen, den Vorbereitungs-Kasten mit den benötigten Karten prominent angezeigt bekommen, Seite für Seite lesen (Verweise auf andere Seiten desselben Abenteuers springen direkt im Tool weiter), jederzeit wieder aussteigen und später fortsetzen. Nur eine Person kann das Tool gleichzeitig benutzen; andere sehen währenddessen eine Sperre mit Namen.
- **Neuer Button "Board aufräumen"** im Willkommensbildschirm (auch als eigenes Macro nutzbar): entfernt alle Abenteuer-spezifisch auf der Spielbrett-Szene liegenden Karten (zurück in ihre Decks/Stapel) und setzt die Spielmarken wieder an ihre Ausgangsposition zurück - fragt vorher einmal nach Bestätigung. Die Decks/Ablagen/Hände der Helden sowie die gemeinsamen Stapel aus "Erste Schritte" bleiben dabei unangetastet stehen.
- **Hand-Karten-Fenster dockt jetzt standardmäßig rechts neben der Heldenablage an** statt irgendwo auf dem Bildschirm zu erscheinen - bleibt beim Öffnen immer an derselben Stelle. Lässt sich bei Bedarf trotzdem wie gewohnt per Ziehen verschieben; ein neuer Eintrag "Position zurücksetzen" im "..."-Menü holt es zurück an seinen Platz.
- **Neue Zeile "Ausgespielte Karten" in der Heldenablage:** zeigt an, wie viele Karten du aktuell ausgespielt hast, und öffnet über den Ansehen-Button ein eigenes Fenster (dockt standardmäßig unterhalb des Hand-Karten-Fensters an, ebenfalls verschiebbar mit Reset-Option) - dort lässt sich jede ausgespielte Karte einzeln ablegen oder zurück ins Deck mischen, beim Überfahren mit der Maus erscheint dieselbe große Vorschau wie im Hand-Fenster. Ausdauerkarten werden hier bewusst nicht angezeigt, die bleiben weiterhin nur als Zähler in der Heldenablage.
- Hand-Karten-Fenster und "Ausgespielte Karten"-Fenster sind jetzt standardmäßig 600 Pixel breit, lassen sich aber am Eck-Ziehgriff jederzeit breiter ziehen - und docken zuverlässig exakt übereinander an, auch wenn nur eines der beiden über "Position zurücksetzen" zurückgesetzt wird.
- Im "Ausgespielte Karten"-Fenster gibt es jetzt statt "Zurück ins Deck mischen" den Button "Zurück auf die Hand nehmen" (der häufigere Fall) - "Zurück ins Deck mischen" ist weiterhin verfügbar, per Rechtsklick auf die Karte.

### Bugs
- Die Heldenablage konnte bei kleinerem Browserfenster unten in die Makro-Leiste hineinragen - sie sitzt jetzt oben im linken Bereich (statt am unteren Bildschirmrand) und kommt der Makro-Leiste dadurch nie mehr in die Quere.
- Das "Ausgespielte Karten"-Fenster klebte optisch direkt am Hand-Karten-Fenster - jetzt mit etwas mehr Abstand dazwischen.
- Das "Ausgespielte Karten"-Fenster hatte spürbar zu viel Leerraum unter den Buttons - ist jetzt kompakter.
- Die Karten im "Ausgespielte Karten"-Fenster hatten einen unschönen Abstand nach oben und links - behoben.
- Hand-Karten-Fenster und "Ausgespielte Karten"-Fenster schlossen sich mit spürbarer Verzögerung (Karten verschwanden, dann dauerte es noch einen Moment) - schließen sich jetzt sofort.
- Die große Karten-Vorschau beim Überfahren mit der Maus konnte bei einer weiter unten im Fenster liegenden Karte über den unteren Bildschirmrand hinausragen - bleibt jetzt immer vollständig sichtbar.

## 0.1.4.1

### Features
- **Neuer Schritt "Marken importieren"** in "Erste Schritte": importiert die Spielmarken (Lebenspunkte, Fertigkeit, Plus/Minus, Schicksalspunkte usw.) direkt in einen eigenen Ordner in deinem Akteur-Verzeichnis und platziert sie automatisch an ihrer Stelle auf dem Spielbrett.
- **"Schnellstarter vorbereiten" läuft jetzt in 3 klaren Schritten statt einem großen Klick:** "Helden vorbereiten" (Hand- und Ausdauerkarten), "Abenteuer importieren" (importiert Aventurias Ereigniskarten, platziert die drei benötigten Karten und öffnet das Abenteuer-Journal) und "Schergen vorbereiten" (Schergen-Deck vorbereiten, auf dem Spielbrett platzieren und mischen).
- **Neuer Button "Held löschen"** in der Heldenablage: löscht nach Bestätigung den aktuell zugewiesenen Helden samt Deck, Ablage, Hand und Im-Spiel-Stapel.

### Bugs
- Die drei Buttons im Aventuria-Bereich des Willkommensbildschirms wurden bei drei Einträgen zu schmal und der Text passte nicht mehr hinein - behoben.
- "Schnellstarter vorbereiten" konnte bei einem erneuten Klick mit einem Fehler abbrechen und dabei die restlichen Helden unbearbeitet lassen - der Schritt lässt sich jetzt gefahrlos mehrfach ausführen, bereits erledigte Helden werden übersprungen statt einen Fehler zu verursachen.
- Bei manchen Spielerplätzen konnten Ausdauerkarten nicht auf dem Spielbrett platziert werden, weil die Verknüpfung zum Im-Spiel-Stapel dieses Spielers fehlte - "Auf der Spielbrett-Szene platzieren" repariert diese Verknüpfung jetzt bei jedem Durchlauf automatisch mit.
- Wurde ein Held außerhalb der Heldenablage gelöscht (z.B. direkt im Akteur-Verzeichnis), zeigte die Heldenablage ihn fälschlich weiter an - sie erkennt gelöschte Helden jetzt zuverlässig und zeigt danach korrekt "kein Held zugewiesen".
- Das "Held zuweisen"-Fenster konnte höher als der sichtbare Bildschirm werden, wodurch die unteren Buttons unerreichbar waren - scrollt jetzt bei Bedarf statt abgeschnitten zu werden.
- Der Button auf der letzten Seite einer Guide-Sektion ("Erste Schritte", "Helden auswählen", "Schnellstarter vorbereiten") heißt jetzt "Beenden" statt "Schließen" und führt zurück zur Willkommensseite, statt das ganze Fenster zu schließen - von dort lässt sich direkt die nächste Sektion starten.

## 0.1.4

### Features
- **Changelog direkt in Foundry:** Nach einem Update öffnet sich beim nächsten Laden automatisch eine Übersicht der neuen Version. Über den neuen Button "Was ist neu?" im Willkommensbildschirm (direkt unter dem Guide-Button) lässt sich die komplette Versionshistorie jederzeit erneut ansehen.
- **Neuer Guide-Abschnitt "Schnellstarter vorbereiten":** Sobald alle teilnehmenden Spieler ihren Helden zugewiesen haben, bereitet dieser neue Schritt im Willkommensbildschirm mit einem Klick das komplette Schnellstarter-Abenteuer vor - jeder der sechs Schnellstarter-Helden bekommt seine Starthand gezogen und vier weitere Karten als Ausdauer ausgespielt, die Schergen werden im Hintergrund vorbereitet, und das Abenteuer-Journal öffnet sich direkt auf der richtigen Seite.

## 0.1.3

### Features
- **"Helden auswählen" überarbeitet, jetzt in 2 klaren Schritten:** Erster Schritt ist jetzt eine einzige Maske - erst den Spieler auswählen (hat er schon einen Spielerplatz, wird dieser automatisch markiert), dann Spielerplatz und Held daneben. Spielerplätze anderer Spieler sind gesperrt und nicht anklickbar. Die Heldenliste zeigt zu jedem Helden ein Profession-Icon, den Namen und die Profession (z.B. "Karmal Eternius - Tulamidischer Magier"), dazu Warnungen, falls der Held oder der Spieler schon vergeben ist (eine bestehende Zuweisung des Spielers wird beim Fortfahren komplett ersetzt, inklusive Token). Zweiter Schritt platziert mit einem Klick Deck, Ablage, Hand und den frei verschiebbaren Held-Token automatisch an ihrer Stelle auf dem Spielbrett und mischt das Deck gleich mit. Der "Bereite Spieler vor"-Button in der Heldenablage öffnet jetzt ebenfalls diesen Guide-Abschnitt, statt direkt (und ohne Spielerplatz-Auswahl) loszulegen. So angelegte Helden öffnen sich außerdem direkt mit dem eigenen Aventuria-Helfer-Heldenbogen statt dem generischen Standard-Sheet.

## 0.1.2

### Features
- **Neue Guide-Sektion "Helden auswählen"** direkt unter "Erste Schritte": die Spielleitung wählt einen Spieler aus und weist ihm über "Bereite Spieler vor" einen Helden zu, verankert danach Deck, Ablage und Hand dieses Helden auf dem Spielbrett, und jeder Spieler mischt zum Schluss selbst sein Deck - alles über Buttons statt Handarbeit. Das Verankern zeigt vorerst noch "Spielerplatz noch nicht eingemessen", bis die Positionen für alle Spielerplätze erfasst sind.
- **Guide öffnet sich nach "Spielerverwaltung öffnen" von selbst wieder:** Dieser Schritt verlässt Foundry kurz auf eine eigene Seite - kommst du zurück (inklusive eines dabei ausgelösten Neuladens), öffnet sich der Guide automatisch wieder an derselben Stelle, statt geschlossen zu bleiben.
- **"Erste Schritte" jetzt fast durchgehend automatisiert:** Die Schritte "Spielbrett importieren" und "Spielbrett vorbereiten" führen ihre Aktion jetzt direkt aus, statt nur ein Kompendium bzw. das Macro-Verzeichnis zu öffnen. Der Schritt "Macros importieren" importiert die Aventuria-Macros direkt in einen eigenen Ordner "Aventuria Macros" im Macro-Verzeichnis. Der Schritt "Decks und Stapel platzieren" setzt die von "Prepare Board" angelegten Ablagen und Decks per Klick automatisch an ihre Stelle auf dem Spielbrett, verankert sie dort und mischt den Schicksalsstapel - die Anleitung ist damit schon nach diesem Schritt fertig.

## 0.1.1

### Features
- **Rundenende-Marker im Kampf:** Der Kampf-Tracker kennt jetzt neben "Gegneraktionen" auch einen festen Platz für "Rundenende" (z. B. für Effekte, die am Ende einer Runde ablaufen) - über das Rechtsklick-Menü der Kampfübersicht hinzufügbar, sortiert sich automatisch ganz ans Ende der Reihenfolge.
- **Karten auch ohne Ausdauer spielbar:** Beim Ausspielen einer Aktionskarte mit Ausdauer-Kosten fragt das Modul jetzt nach, ob normal bezahlt oder die Karte stattdessen ohne Ausdauer gespielt werden soll.

### Bugs
- Der Heldenbogen springt beim Bearbeiten der Sonderfertigkeit nicht mehr aus dem Fenster: Ist der Text-Editor höher als das Fenster, erscheint jetzt bei Bedarf ein Scrollbalken, statt dass Set/Set-Nummern in der Fußzeile abgeschnitten werden.
- Heldenablage: Das Gruppensymbol zum Schließen wurde durch ein deutlicheres X ersetzt.
- Heldenablage: "Deck ansehen" öffnet jetzt direkt die Kartenliste, statt auf der Konfigurationsansicht des Decks zu landen.
- Handkarten-Ansicht: Die Kartenbilder wirkten im Ruhezustand blass/bräunlich getönt - das ist jetzt behoben, Karten werden immer in voller Klarheit angezeigt.

## 0.1.0

Erste Veröffentlichung. Enthält:

- **Neuer Heldenbogen** (als Alternative zum Standard-Sheet wählbar): eigene Kartenoptik mit Original-Icons, Eigenschaften (Nahkampf/Fernkampf/Magie/Ausweichen), Ausrüstung, alle 8 Talente und Sonderfertigkeit auf einer Seite. Eigenschaften und Talente lassen sich einzeln anklicken, um direkt eine Probe zu würfeln, inklusive übersichtlicher Ergebnis-Chatkarte. Ausrüstung lässt sich mit einem Klick "verwenden" – würfelt Angriff und Schaden zusammen und markiert die Ausrüstung danach automatisch als erschöpft.
- **Spielmodus-Sperre** für den Heldenbogen: verhindert versehentliche Änderungen während des Spiels, ohne Proben würfeln, Erschöpfen/Bereit-Schalten oder das Eintragen von Lebenspunkten zu blockieren.
- **Heldenablage** als Ersatz für die Spielerliste: Portrait, Kartendeck/Ablage/Hand sowie verfügbare/erschöpfte Ausdauer auf einen Blick, inklusive Ziehen, Mischen und Ansehen.
- **Eigene Handkarten-Ansicht**: frei verschiebbares Fenster mit Kartenvorschau, Ausspielen und "Als Ausdauer spielen".
- **Kampf-Initiative**: feste, rotierende Reihenfolge statt Würfeln (dreht sich jede Runde um einen Platz weiter), automatische Rang-Vergabe, fester Platz für "Gegneraktionen".
- **Aventuria-Guide**: neue Willkommensseite mit Schritt-für-Schritt-Anleitung zur einmaligen Welt-Einrichtung.
- **Neues Macro** "Karten zurückdrehen": setzt alle auf der Spieloberfläche gedrehten Karten mit einem Klick zurück.
