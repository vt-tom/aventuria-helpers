# Änderungen – Aventuria Helfer

Diese Datei listet alle spielrelevanten Neuerungen des Moduls auf – neueste Version zuerst.

## 0.1.6 (Beta)

### Features
- **Kompendien in einem gemeinsamen Ordner:** "Macros", "Aventuria Helpers Guide" und "Changelog" erscheinen im Kompendium-Tab der Sidebar jetzt gebündelt in einem Ordner "Aventuria Helpers" statt einzeln aufgelistet.

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
