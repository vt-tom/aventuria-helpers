# Changes – Aventuria Helpers

This file lists all gameplay-relevant changes to the module – newest version first.

## 0.1.4.1

### Features
- **New "Import tokens" step** in "First Steps": imports the game's marker tokens (life points, Fertigkeit, plus/minus, fate points, etc.) directly into their own folder in your Actor directory and places them automatically at their spot on the Gameboard.
- **"Prepare Quick Start" now runs as 3 clear steps instead of one big click:** "Prepare Heroes" (hand and Ausdauer cards), "Import Adventure" (imports Aventuria's event cards, places the three needed cards, and opens the adventure journal), and "Prepare Henchmen" (prepares the henchmen deck, places it on the Gameboard, and shuffles it).

### Bugs
- The three buttons in the welcome screen's Aventuria section became too narrow once a third one was added, and the text no longer fit - fixed.
- "Prepare Quick Start" could error out on a second click and leave the remaining heroes untouched - the step can now be run safely more than once, skipping heroes that are already done instead of erroring.
- Ausdauer cards couldn't be placed on the Gameboard for some player slots because the link to that player's Im-Spiel-Stapel was missing - "Place on the Gameboard scene" now repairs that link automatically every time it runs.

## 0.1.4

### Features
- **In-app changelog:** After an update, an overview of the new version now opens automatically the next time you load the game. The new "What's New?" button in the welcome screen (right under the Guide button) lets you revisit the complete version history any time.
- **New guide section "Prepare Quick Start":** Once every participating player has a hero assigned, this new welcome-screen step prepares the entire Quick Start adventure with one click - each of the six Quick Start heroes gets their starting hand drawn and four more cards played out as Ausdauer, the henchmen are prepared in the background, and the adventure journal opens directly on the right page.

## 0.1.3

### Features
- **"Choose a Hero" reworked, now in 2 clear steps:** The first step is now a single screen - pick the player first (if they already have a player slot, it's selected automatically), then their player slot and hero right next to it. Other players' slots are locked and can't be clicked. The hero list shows a profession icon, name, and profession for each hero (e.g. "Karmal Eternius - Tulamydian Mage"), plus warnings if the hero or the player is already taken (an existing assignment for the chosen player is fully replaced, token included, when you continue). The second step anchors Deck, discard pile, Hand, and the freely movable hero token at their spot on the Gameboard with one click, and shuffles the deck along the way. The "Choose hero" button in the Hero Tray now opens this same guide section too, instead of starting directly (and without a player-slot choice). Heroes created this way also open with the Aventuria Helpers' own Hero Sheet right away instead of the generic default sheet.

## 0.1.2

### Features
- **New guide section "Choose a Hero"** right under "First Steps": the gamemaster picks a player and assigns them a hero via "Prepare Player", then anchors that hero's Deck, discard pile and Hand on the Gameboard, and each player finally shuffles their own deck - all via buttons instead of manual work. Anchoring still shows "Player slot not measured yet" until the positions for all player slots have been captured.
- **The guide reopens itself after "Open player management":** This step briefly leaves Foundry for its own page - when you come back (including a reload that triggers), the guide automatically reopens at the same spot instead of staying closed.
- **"First Steps" is now almost fully automated:** The steps "Import the game board" and "Prepare the board" now run their action directly, instead of just opening a compendium or the macro directory. The "Import the macros" step imports the Aventuria macros directly into their own "Aventuria Macros" folder in your macro directory. The "Place decks and stacks" step automatically places the piles and decks created by Prepare Board at their spot on the Gameboard scene, anchors them there, and shuffles the fate deck - the guide is already done after this step.

## 0.1.1

### Features
- **Round-end marker in combat:** The combat tracker now has a fixed slot for "Round End" alongside "Enemy Actions" (e.g. for effects that trigger at the end of a round) - addable via the combat tracker's right-click menu, automatically sorts itself to the very end of the turn order.
- **Cards playable even without Ausdauer:** When playing an action card with an Ausdauer cost, the module now asks whether to pay normally or play the card without Ausdauer instead.

### Bugs
- The Hero Sheet no longer jumps out of the window while editing the special ability: if the text editor is taller than the window, a scrollbar now appears when needed, instead of the set/set number footer getting cut off.
- Hero Tray: the group icon used to close it was replaced with a clearer X.
- Hero Tray: "View deck" now opens directly to the card list, instead of landing on the deck's configuration view.
- Hand view: card images looked pale/sepia-toned at rest - this is now fixed, cards always display at full clarity.

## 0.1.0

First release. Includes:

- **New Hero Sheet** (selectable as an alternative to the default sheet): its own card-styled look with original icons, attributes (Melee/Ranged/Magic/Dodge), equipment, all 8 skills, and the special ability all on one page. Attributes and skills can each be clicked individually to roll a check directly, complete with a clear result chat card. Equipment can be "used" with one click - rolls the attack and damage together and automatically marks the equipment as exhausted afterward.
- **Play-mode lock** for the Hero Sheet: prevents accidental changes during play, without blocking rolling checks, exhausting/readying, or entering life points.
- **Hero Tray** as a replacement for the player list: portrait, card Deck/discard pile/Hand, and available/exhausted Ausdauer at a glance, including drawing, shuffling, and viewing.
- **Own Hand view**: a freely movable window with a card preview, playing cards, and "Play as Ausdauer".
- **Combat initiative**: fixed, rotating turn order instead of rolling (shifts by one seat each round), automatic rank assignment, fixed slot for "Enemy Actions".
- **Aventuria Guide**: a new welcome screen with a step-by-step walkthrough for the one-time world setup.
- **New macro** "Reset card rotations": resets every rotated card on the play surface with one click.
