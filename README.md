# Aventuria Helpers

*English | [Deutsch](README-de.md)*

Add-on module for [Foundry VTT](https://foundryvtt.com/) (v14) that extends the official [Aventuria](https://foundryvtt.com/packages/aventuria) module with additional macros and a completely redesigned hero sheet. Runs on the [Universal Tabletop System](https://foundryvtt.com/packages/universal-tabletop-system), which Aventuria itself is built on.

> [!IMPORTANT]
> All code and documentation in this module were created with AI assistance. The images used, however, are **not** AI-generated - they come from the Aventuria module or other sources and are not covered by this repo's [MIT license](#license).

## Features

- **New hero sheet**: Directly rollable checks, a cleaner layout, weapon exhaustion, and special abilities - an early draft, the design is still work in progress.
- **Hero tray**: Deck, discard pile, hand, and played cards at a glance, including endurance management, card preview, and a docked hand/played-cards window.
- **Setup guide**: walks step by step through world setup, hero assignment, quickstart preparation, and running the adventures.
- **Additional macros**: reset card rotations, clean up the board, reopen the guide - most of these are also directly accessible through the other features.
- **Extended combat tracker**: initiative is handled according to the Aventuria rules, with a fixed enemy-actions slot and an end-of-round prompt to keep the flow of combat easy to follow.

A complete description of all features is available in the manual bundled with the module (compendium "Aventuria Helpers Guide", reachable via the setup guide) - source: [manual-de.md](manual-de.md) / [manual-en.md](manual-en.md).

## Requirements

- Foundry VTT v14 (minimum compatibility, same as Aventuria itself)
- Module [Aventuria](https://foundryvtt.com/packages/aventuria)
- Module [Complete Card Management](https://foundryvtt.com/packages/complete-card-management)
- System [Universal Tabletop System](https://foundryvtt.com/packages/universal-tabletop-system)

## Installation

In Foundry, under **Install Module**, paste the following manifest URL:

```
https://github.com/vt-tom/aventuria-helpers/releases/latest/download/module.json
```

Then enable the module for the relevant world.

## Changes

See [CHANGES-en.md](CHANGES-en.md) for a gameplay-relevant changelog per version (also available in-app as a journal, with an automatic "What's new?" notice after an update).

## Report a bug / request a feature

Via this repo's [GitHub Issues](https://github.com/vt-tom/aventuria-helpers/issues).

## License

The code of this module (created entirely with AI assistance) is released under the [MIT license](LICENSE) for free use and reuse. Images/graphics are excluded, see the note above.
