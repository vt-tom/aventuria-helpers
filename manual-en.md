# Manual: aventuria-helpers (Test Version)

This manual describes the four core features of the `aventuria-helpers` module: the new character sheet, the hero tray with the new hand sheet, the combat tracker extensions, and the setup guide. Status: first test version, feedback will flow into the next revision.

## 1. New Character Sheet

Hero actors get an alternative, purpose-built sheet as a replacement for the system's generic default sheet. It opens automatically once you open the hero sheet (e.g. by clicking the portrait in the hero tray, see part 2), or can be selected for an actor via right-click → "Configure Sheet" if the default sheet is still active.

![Hero sheet, Skills tab](assets/screenshots/actor-sheet.webp)

A narrow icon rail sits on the left edge with the tabs:

- **Hero** (see screenshot above): attributes (melee, ranged, magic, dodge), life points, basic equipment and, if present, second equipment (share one combined exhausted status - Aventuria rule: using a weapon exhausts the whole hero card), the eight skills, special ability.
- **Allowed action cards:** a table of which action card categories this hero is allowed to play, according to their hero card.
- **Images:** hero card and skill card side by side, swappable by click or openable in a large view.
- **Items** and **Effects:** as familiar from the default sheet.

**Rolling checks:** it's not just the general "Roll check" button at the top of the header that works - every attribute (click on the round icon medallion) and every skill (click on the name) can be clicked individually and rolls its own check right away. For equipment, the small icon in the attack type field triggers an attack check and a damage roll in one step, then automatically marks the equipment as exhausted afterward.

**Play mode switch:** at the bottom of the icon rail, a switch lets you lock the sheet to prevent accidental changes during play. Life points, rolling checks, and the exhausted status all remain usable even while locked - only the actual character values become read-only.

## 2. Hero Tray with Hand Sheet

### 2.1 Basics

The hero tray sits in the bottom left of the screen, exactly where Foundry's normal player list (the list of logged-in players) usually sits. Both share the same spot - only one of the two is ever visible at a time.

**Switching between the tray and the player list:**

- If the player list is currently visible: a small round button with a hero token icon floats next to it. Clicking it opens the hero tray.
- If the tray is visible: a round button with a person icon sits in the top right of the tray itself. Clicking it switches back to the player list.
- The most recently chosen view is remembered (survives a page reload, too).

**First launch - choosing a hero:** if the tray doesn't yet have a hero assigned, it just shows a round, dashed field with an "add person" icon. Clicking it starts Aventuria's own "Prepare Player" flow (choosing a hero from the compendium plus a player number, just like setting up a new character normally). Once that's done, the tray fills in automatically with the new hero.

### 2.2 Deck, Discard Pile, and Hand at a Glance

Once a hero is assigned, the tray shows the hero's portrait at the top (player name above, hero name below; clicking it opens the hero sheet from part 1) with a trash-can icon next to it - **Delete hero**: after a confirmation prompt, permanently deletes the hero along with their deck, discard pile, hand, and Im-Spiel-Stapel. Below that follow several tiles:

![Filled hero tray with deck, discard pile, and hand tiles](assets/screenshots/tray-filled.webp)

**Deck** (card-back icon, number = cards remaining in the deck):

- Hand icon - **Draw card**: draws one card from the deck into the hand.
- Shuffle icon - **Shuffle deck**.
- Eye icon - **Card preview**: asks for an amount and shows the top X cards of the deck without drawing them.
- Stack icon - **View deck**: opens the full deck view (Complete Card Management).

**Discard pile** (discard icon, number = cards in the discard pile):

- Eye icon - **View discard pile**: opens the discard pile.

**Hand** (hand icon, number = cards in hand):

- Eye icon - **View hand**: opens your own hand window (see section 2.3).

**Ausdauer** (two tiles, ready/exhausted, number = cards in that state):

- Rotate icon on the "Ready" tile - **Exhaust Ausdauer**: manually rotates one ready Ausdauer card 90°.
- Rotate icon on the "Exhausted" tile - **Ready Ausdauer**: rotates one exhausted Ausdauer card back.

All numbers update automatically as soon as anything changes about your own cards (drawing, shuffling, playing, etc.).

**Configure hero/hand:** the gear icon at the top of the tray (next to the toggle button) opens Foundry's user settings with two relevant fields: which hero is assigned ("Character") and which hand counts as your own hand ("Player Hand"). Useful for switching to an already-existing hero or hand without running through "Prepare Player" again.

### 2.3 The New Hand Sheet

"View hand" opens its own small window with all the cards of the current hand, laid out side by side in a row.

![Hand window with a large card preview on hover](assets/screenshots/hand-preview.webp)

- **Moving:** the window has no title text, but there's a small grip icon (vertical lines) on the left of the header bar - click and drag there (or anywhere else in the header outside the buttons) to freely position the window.
- **Preview:** hovering the mouse over a card opens a large, easy-to-read preview of the card next to it (see screenshot above).
- **Playing:** hovering over a card reveals a play icon in the middle - clicking it plays the card. If the card costs Ausdauer, a small dialog first asks whether to pay the Ausdauer normally or play the card for free instead ("without Ausdauer").
- **Play as Ausdauer:** a second icon lays the card down face-down as Ausdauer instead of playing it normally.
- **Dragging/dropping:** cards can still be moved via drag & drop as usual (e.g. onto the scene).
- **Right-click** on a card opens a menu to flip it or move to the next/previous card face (if the card has multiple faces).
- The window no longer has a visible close button - close it with **Esc**. Clicking "View hand" again doesn't open a second window, it just brings an already-open one back to the front.

## 3. Combat Tracker

### 3.1 Rotating Order Instead of Rolling

Aventuria normally doesn't roll for initiative - the combat tracker now handles that automatically:

- When a combatant is added to the tracker, they automatically get an initiative number matching the order they were added in. No manual rolling needed.
- As soon as "Begin Combat" is pressed, the tracker freezes the current order. From then on it rotates by exactly one seat every round: whoever went first in round 1 goes last in round 2, and so on.

### 3.2 Adding Fixed Phase Entries

GM only: the gear/three-dot menu at the top of the combat tracker has two new entries, "Add enemy actions" and "Add round end".

![Combat tracker menu with the "Add enemy actions" entry](assets/screenshots/combat-add-enemy-actions.webp)

Both add a placeholder entry with no token that always stays at the very end of the order and - unlike the heroes - doesn't rotate along with the rounds: "Enemy Actions" (initiative 0) marks the phase in which the GM handles the enemies' actions, "Round End" (initiative -1, so it sorts even further back) marks the phase for effects that resolve at the end of a round (e.g. expiring conditions).

### 3.3 Automatically Resetting Card Rotations After the Round

As soon as a new combat round begins, the GM is automatically asked whether all cards lying on the scene should be rotated back to their starting rotation (0°) - only the rotation, not the position.

![Prompt "Should all cards be rotated back?" on round change](assets/screenshots/combat-rotate-back-cards.webp)

Confirming rotates all rotated cards back, "No" leaves everything as it is. This prompt only appears for the GM, and only if Complete Card Management is active.

## 4. Setup Guide

A dedicated window walks you step by step through setting up an Aventuria table. Open it via the question-mark icon at the top of the hero tray (part 2), or via the "Aventuria-Guide öffnen" macro.

Besides the title button to this manual and a "What's New?" button (opens the version history, see 4.5), the home page offers three entry points:

### 4.1 First Steps

One-time base setup of the world by the GM, seven steps: create a user with the Gamemaster role for every player, set the language, import the Gameboard scene, import the Aventuria macros, prepare the Gameboard (creates the discard piles/decks), place the decks and stacks on the scene, and import and place the marker tokens (life points, Fertigkeit, etc.). Each step briefly explains what it does and has its own run button.

### 4.2 Choose a Hero

Repeated for every participating player, two steps: first pick the player, table slot, and hero on one screen - the hero sheet and deck are created automatically (an existing hero for that player is replaced). Then the hero's deck, discard pile, hand, and token are placed at their spot on the Gameboard with one click, and the deck is shuffled.

### 4.3 Prepare Quick Start

Once, after every participating player has a hero assigned, four steps: prepare heroes (draws the starting hand for each of the six Quick Start heroes and plays four cards as Ausdauer), import adventure (the event card deck plus the three cards needed to get started), prepare henchmen (creates, places, and shuffles the henchmen deck), and finally opens the adventure journal.

### 4.4 Navigating Between Pages

Each section shows one page per step, with "Back"/"Next" and a page selector at the bottom. Once a step's action succeeds, the guide automatically advances to the next page - no extra click on "Next" needed. On a section's last page, the button reads "Finish" and returns to the home page, from where the next section can be started right away.

### 4.5 In-App Changelog

After updating to a new version, a short overview of what's new opens automatically the next time you load the game. The "What's New?" button on the guide's home page lets you revisit the complete version history any time.
