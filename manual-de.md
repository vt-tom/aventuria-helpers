# Handbuch: aventuria-helpers (Test-Version)

Dieses Handbuch beschreibt die drei Kernfunktionen des Moduls `aventuria-helpers`: den neuen Charakterbogen, die Heldenablage mit dem neuen Hand-Bogen und die Erweiterungen am Kampf-Tracker. Stand: erste Testversion, Rückmeldungen fließen in die nächste Überarbeitung ein.

## 1. Neuer Charakterbogen

Für Helden-Akteure gibt es ein alternatives, eigens gestaltetes Sheet als Ersatz für das generische Standard-Sheet des Systems. Es öffnet sich automatisch, sobald man den Heldenbogen aufruft (z.B. per Klick auf das Portrait in der Heldenablage, siehe Teil 2) oder lässt sich für einen Akteur per Rechtsklick → "Sheet konfigurieren" auswählen, falls noch das Standard-Sheet aktiv ist.

![Heldenbogen, Talente-Tab](assets/screenshots/actor-sheet.webp)

Links am Rand liegt eine schmale Icon-Leiste mit den Tabs:

- **Held:** Eigenschaften (Nahkampf, Fernkampf, Magie, Ausweichen), Lebenspunkte, Grundausrüstung und ggf. zweite Ausrüstung, Sonderfertigkeit.
- **Talente** (siehe Screenshot oben): die acht Talente sowie eine Tabelle der erlaubten Aktionskarten.
- **Bilder:** Heldenkarte und Talentkarte nebeneinander, per Klick austauschbar bzw. in Großansicht zu öffnen.
- **Items** und **Effekte:** wie vom Standard-Sheet gewohnt.

**Proben würfeln:** Nicht nur der allgemeine "Probe würfeln"-Button oben im Kopf funktioniert – jede Eigenschaft (Klick auf das runde Icon-Medaillon) und jedes Talent (Klick auf den Namen) lässt sich einzeln anklicken und würfelt direkt eine eigene Probe dafür. Bei der Ausrüstung löst das kleine Icon im Angriffsart-Feld Angriffsprobe und Schadenswurf in einem Schritt aus und markiert die Ausrüstung danach automatisch als erschöpft.

**Spielmodus-Schalter:** Unten in der Icon-Leiste lässt sich das Sheet per Schalter sperren, um versehentliche Änderungen während des Spiels zu vermeiden. Lebenspunkte, Proben würfeln und Erschöpfen-Status bleiben auch gesperrt weiter bedienbar, nur die eigentlichen Charakterwerte sind dann schreibgeschützt.

## 2. Heldenablage mit Hand-Bogen

### 2.1 Grundlagen

Die Heldenablage sitzt unten links im Bildschirm, genau dort, wo sonst die normale Foundry-Spielerübersicht (Liste der angemeldeten Spieler) steht. Beide teilen sich denselben Platz – es ist immer nur eine von beiden sichtbar.

**Umschalten zwischen Ablage und Spielerübersicht:**

- Ist gerade die Spielerübersicht sichtbar: rechts daneben schwebt eine kleine runde Schaltfläche mit einem Heldentoken-Symbol. Klick darauf öffnet die Heldenablage.
- Ist die Ablage sichtbar: oben rechts in der Ablage selbst gibt es eine runde Schaltfläche mit einem Personen-Symbol. Klick darauf wechselt zurück zur Spielerübersicht.
- Die zuletzt gewählte Ansicht wird gemerkt (übersteht auch ein Neuladen der Seite).

**Erster Start – Held auswählen:** Ist der Ablage noch kein Held zugewiesen, zeigt sie nur ein rundes, gestricheltes Feld mit einem "Person hinzufügen"-Symbol. Ein Klick darauf startet Aventurias eigenen Ablauf "Bereite Spieler vor" (Heldenauswahl aus dem Kompendium + Spielernummer, wie beim Einrichten eines neuen Charakters gewohnt). Sobald das abgeschlossen ist, füllt sich die Ablage automatisch mit dem neuen Helden.

### 2.2 Deck, Ablage und Hand im Überblick

Sobald ein Held zugewiesen ist, zeigt die Ablage oben das Heldenportrait (Spielername darüber, Heldenname darunter; Klick darauf öffnet den Heldenbogen aus Teil 1), darunter drei Kacheln:

![Gefüllte Heldenablage mit Deck-, Ablage- und Hand-Kachel](assets/screenshots/tray-filled.webp)

**Deck** (Kartenrückseiten-Symbol, Zahl = verbleibende Karten im Deck):

- Hand-Symbol – **Karte ziehen**: zieht eine Karte vom Deck in die Hand.
- Misch-Symbol – **Deck mischen**.
- Augen-Symbol – **Kartenvorschau**: fragt nach einer Anzahl und zeigt die obersten X Karten des Decks an, ohne sie zu ziehen.
- Stapel-Symbol – **Deck ansehen**: öffnet die vollständige Deck-Ansicht (Complete Card Management).

**Ablage** (Ablage-Symbol, Zahl = Karten im Ablagestapel):

- Augen-Symbol – **Ablage ansehen**: öffnet den Ablagestapel.

**Hand** (Hand-Symbol, Zahl = Karten in der Hand):

- Augen-Symbol – **Hand ansehen**: öffnet das eigene Hand-Fenster (siehe Abschnitt 2.3).

Alle Zahlen aktualisieren sich automatisch, sobald sich etwas an den eigenen Karten ändert (Ziehen, Mischen, Spielen usw.).

**Held/Hand konfigurieren:** Das Zahnrad-Symbol oben in der Ablage (neben dem Umschalt-Button) öffnet Foundrys Nutzer-Einstellungen mit zwei relevanten Feldern: welcher Held zugewiesen ist ("Character") und welche Hand als eigene Hand gilt ("Player Hand"). Nützlich, um ohne erneuten "Bereite Spieler vor"-Durchlauf auf einen bereits vorhandenen Helden oder eine bereits vorhandene Hand umzustellen.

### 2.3 Der neue Hand-Bogen

Über "Hand ansehen" öffnet sich ein eigenes kleines Fenster mit allen Karten der aktuellen Hand, nebeneinander als Reihe.

![Hand-Fenster mit großer Kartenvorschau beim Darüberfahren](assets/screenshots/hand-preview.webp)

- **Verschieben:** Das Fenster hat keinen Titeltext, aber links in der Kopfleiste ein kleines Griff-Symbol (senkrechte Linien) – dort (oder irgendwo sonst in der Kopfleiste außerhalb der Buttons) klicken und ziehen, um das Fenster frei zu positionieren.
- **Vorschau:** Fährt man mit der Maus über eine Karte, öffnet sich daneben eine große, gut lesbare Vorschau der Karte (siehe Screenshot oben).
- **Ausspielen:** Auf einer Karte erscheint beim Darüberfahren ein Play-Symbol in der Mitte – Klick darauf spielt die Karte aus.
- **Ziehen/Ablegen:** Karten lassen sich weiterhin wie gewohnt per Drag & Drop verschieben (z.B. auf die Spieloberfläche).
- **Rechtsklick** auf eine Karte öffnet ein Menü zum Umdrehen bzw. zur nächsten/vorherigen Kartenseite (sofern die Karte mehrere Seiten hat).
- Das Fenster hat keinen sichtbaren Schließen-Button mehr – schließen per **Esc**-Taste. Ein erneuter Klick auf "Hand ansehen" öffnet kein zweites Fenster, sondern holt ein bereits offenes nur wieder nach vorne.

## 3. Kampf-Tracker

### 3.1 Rotierende Reihenfolge statt Würfeln

Aventuria würfelt normalerweise keine Initiative – das übernimmt der Kampf-Tracker jetzt automatisch:

- Wird ein Kämpfer zum Tracker hinzugefügt, bekommt er automatisch eine Initiative-Zahl passend zur Hinzufüge-Reihenfolge. Manuelles Würfeln ist nicht mehr nötig.
- Sobald "Kampf beginnen" gedrückt wird, friert der Tracker die aktuelle Reihenfolge ein. Ab dann dreht sie sich jede Runde um genau einen Platz weiter: wer in Runde 1 zuerst dran war, ist in Runde 2 als Letztes dran, usw.

### 3.2 Gegneraktionen hinzufügen

Nur für die Spielleitung: Über das Zahnrad-/Drei-Punkte-Menü oben im Kampf-Tracker gibt es den neuen Eintrag "Gegneraktionen hinzufügen".

![Kampf-Tracker-Menü mit dem Eintrag "Gegneraktionen hinzufügen"](assets/screenshots/combat-add-enemy-actions.webp)

Er fügt einen Platzhalter-Eintrag "Gegneraktionen" mit Initiative 0 hinzu (kein eigenes Token nötig). Dieser Eintrag steht immer an letzter Stelle der Reihenfolge und dreht sich – anders als die Helden – nicht mit durch die Runden. Er markiert die Phase, in der die Spielleitung die Aktionen der Gegner abhandelt.

### 3.3 Karten nach der Runde automatisch zurückdrehen

Sobald eine neue Kampfrunde beginnt, fragt die Spielleitung automatisch, ob alle auf der Spieloberfläche liegenden Karten wieder in ihre Ausgangs-Rotation (0°) zurückgedreht werden sollen – nur die Drehung, nicht die Position.

![Abfrage "Sollen alle Karten zurückgedreht werden?" beim Rundenwechsel](assets/screenshots/combat-rotate-back-cards.webp)

Bestätigen dreht alle gedrehten Karten zurück, "Nein" lässt alles wie es ist. Diese Abfrage erscheint nur bei der Spielleitung und nur, wenn Complete Card Management aktiv ist.
