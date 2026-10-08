# Projektanweisungen für Codex

## Projektkontext

Lies zu Beginn jeder neuen Projektsitzung `CLAUDE.md`, insbesondere „Technische Konventionen“, „Testing“, „Bekannte Fallstricke & Konventionen“ und „Weitere Projektdateien“. Lies für die konkrete Aufgabe die betroffenen Architekturabschnitte und `project/TODO.md`; für Entscheidungen/Roadmap `project/PROJECT.md`, für Hintergründe gezielt `project/CHANGELOG.md`. Nach Kontextverlust fehlende relevante Informationen erneut lesen.

`CLAUDE.md` ist die zentrale, gemeinsam gepflegte Projektkontextdatei. Diese AGENTS.md ist der Einstieg für Codex; Architektur nicht hier duplizieren. Falls Vorgaben veraltet wirken, mit aktuellem Code und Nutzerentscheidungen abgleichen und dokumentiert aktualisieren.

## Wesentliche Regeln

- Foundry v14; Aventuria und Universal Tabletop System ergänzen, Abhängigkeiten nicht ändern.
- Alle Mitspieler haben die Foundry-Rolle Gamemaster. GM-Rolle niemals als Ausschlusskriterium für Spieler-/Heldenauswahl verwenden. `game.users.activeGM` koordiniert Vorgänge, die genau einmal oder serialisiert ausgeführt werden müssen.
- Keine geplanten Backlog-Features ohne Nutzerauftrag implementieren.
- Den bestehenden Checkout nutzen; laufende Foundry-Packs nicht überschreiben. Keine Veröffentlichungen oder Versions-Bumps ohne entsprechenden Auftrag.
- Automatische Syntax-/Mock-Prüfungen und echte Foundry-Tests getrennt ausweisen; nicht geprüfte Darstellung/Mehrclient-Verhalten als offen dokumentieren.

## Dokumentationspflege

Nach abgeschlossenen Features, Fixes und Entscheidungen gemäß CLAUDE.md aktualisieren:
- `project/TODO.md`: aktive Aufgaben und konkrete verbleibende Tests, erledigte Historie kürzen.
- `project/PROJECT.md`: Status und geltende Entscheidungen/Roadmap synchron halten.
- `CLAUDE.md`: aktueller Architekturstand und wichtige Konventionen.
- `project/CHANGELOG.md`: interne Details unter der Version aus `module.json`.
- `CHANGES.md` und `CHANGES-en.md`: spielrelevante Änderungen, verständlich und ohne interne Details.
- `manual-de.md` und `manual-en.md`: Bedienung neuer/geänderter Funktionen.
- Nach Handbuch-/Changelog-Änderungen `npm run build:guide` und `npm run build:changelog` für die Journal-Quellen ausführen. Kompilierte Packs nur bei gestopptem Foundry bzw. im Release-Workflow bauen.

CLAUDE.md und `project/` bleiben lokale Projektdateien; AGENTS.md enthält nur den Verweis und kurze Arbeitsregeln.
