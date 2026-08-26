/**
 * Stufe-II/III-Zielwerte fuer die 12 Level-1-Schnellstarter-Helden (Steigern der Heldenkarte
 * bzw. Talentkarte, Feature 1.5 - AP-System, siehe project/TODO.md).
 *
 * Herkunft (Stand 2026-08-26): direkt aus dem offiziellen Kompendium `aventuria.heroes-deutsch`
 * extrahiert (`fvtt package unpack`, siehe project/reference/hero-level-values.md fuer die volle
 * Rohdaten-Tabelle aller drei Stufen), nicht von Hand abgetippt/geraten - der Nutzer hat die
 * Heldenkarte/Talentkarte-Feldaufteilung gegen die physischen Karten bestaetigt.
 *
 * Schluessel = Vorname des Helden, exakt dieselbe Konvention wie `QUICKSTART_HERO_START` in
 * `cards/prepare-quickstart.mjs` (Aventuria-Heldennamen sind "Vorname Nachname").
 *
 * Pro Held zwei unabhaengige Tracks (`hero` = Heldenkarte, `skill` = Talentkarte), pro Track
 * ein Eintrag fuer Stufe 2 und Stufe 3. **Sparse:** nur Felder eintragen, die sich auf dieser
 * Stufe tatsaechlich aendern (gegenueber der vorherigen Stufe) - nicht angegebene Felder
 * bleiben unveraendert. Leeres Objekt `{}`, falls eine Stufe fuer diesen Track keine Aenderung
 * bringt. `null` (statt `{}`) bedeutet dagegen "Zielwerte unbekannt, nicht verfuegbar" - der
 * Levelup-Dialog muss diese Stufe fuer den betroffenen Helden/Track blockieren statt eine
 * folgenlose Steigerung anzubieten.
 *
 * `hero`-Felder (Heldenkarte): `close`, `ranged`, `magic`, `dodge` (Zahlen), `basicEquipment`/
 * `secondEquipment` (Objekt `{name, damage, attackType, endurance, exhaust}`, nur die sich
 * aendernden Unterfelder eintragen - `secondEquipment` typischerweise nur, wenn auf dieser
 * Stufe erstmals eine zweite Waffe hinzukommt), `specialAbility` (Objekt `{name, description}` -
 * beide werden bei einer Aenderung komplett ersetzt, nicht als Text-Diff).
 *
 * `skill`-Felder (Talentkarte): `body`, `craft`, `knowledge`, `perception`, `persuade`,
 * `stealth`, `survival`, `willpower` (Zahlen).
 *
 * Bekannte Kompendium-Abweichungen (bewusst korrigiert bzw. bewusst offen gelassen, nicht
 * geraten):
 * - **Fortran Algolson** hat in beiden Sprachversionen (heroes-deutsch UND heroes-english) gar
 *   keine echte Stufe-III-Karte - nur Stufe 1 (Serial 319/320) und Stufe 2 (Serial 321/322),
 *   dazu ein als "Stufe 2" fehletikettiertes zweites Duplikat mit nicht dazu passender
 *   Serial-Nummer (353/355), das nicht der fortlaufenden Nummerierung seines gegenderten
 *   Pendants Kjaska Sternensegler (319/321/323) folgt - vermutlich derselbe Datenfehlertyp wie
 *   die bereits 2026-08-25 gefundenen "-B-Suffix-Duplikate", die sich ebenfalls als keine
 *   echten Level-II-Karten herausstellten. `hero[3]`/`skill[3]` wurden deshalb zunaechst als
 *   `null` (nicht raten) markiert und am 2026-08-26 vom Nutzer von der physischen Karte
 *   nachgetragen (`project/reference/fortan.md`), statt aus dem Kompendium uebernommen.
 * - **Karmal Eternius** Stufe 2: `basicEquipment.damage` stand im Kompendium als `"1d61"`
 *   (fehlendes `+`). Per Kreuzvergleich mit seinem gegenderten Pendant Selestia saba Okarim
 *   (identischer Heldenkarten-Track auf allen drei Stufen bis auf exakt dieses eine Feld, wo
 *   sie korrekt `"1d6+1"`/`"1d6+2"` hat) auf `"1d6+1"` korrigiert - Nutzerentscheidung
 *   2026-08-26, da ein unkorrigierter Roll-String hier anders als z.B. die bewusst
 *   unveraendert uebernommene Peraine-Schreibweise tatsaechlich einen falschen Schadenswurf
 *   erzeugen wuerde, nicht nur kosmetisch waere.
 */
export const LEVEL_VALUES = {
  Yoleyana: {
    hero: {
      2: {
        close: 9,
        specialAbility: {
          name: "Fokussieren",
          description: "<p>Change you ranged attack test result to a 1 and draw 1 card.</p>",
        },
      },
      3: {
        ranged: 13,
        secondEquipment: { name: "Jagdmesser", damage: "1d6", attackType: "close", endurance: 1, exhaust: true },
      },
    },
    skill: {
      2: { body: 9, craft: 11, survival: 15 },
      3: { knowledge: 9, perception: 13, stealth: 13, survival: 16, willpower: 9 },
    },
  },
  Jandriel: {
    hero: {
      2: {
        close: 9,
        specialAbility: {
          name: "Fokussieren",
          description: "<p>Change you ranged attack test result to a 1 and draw 1 card.</p>",
        },
      },
      3: {
        ranged: 13,
        secondEquipment: { name: "Jagdmesser", damage: "1d6", attackType: "close", endurance: 1, exhaust: true },
      },
    },
    skill: {
      2: { stealth: 11, survival: 15, willpower: 9 },
      3: { body: 11, craft: 9, knowledge: 13, perception: 13, survival: 16 },
    },
  },
  Miraculo: {
    hero: {
      2: {
        ranged: 12,
        specialAbility: {
          name: "Aufmerksamkeit",
          description:
            "<p>Reduce the result of your dodge test by 5. If your dodge test against an attack succeeds, you prevent all damage from the attack.</p>",
        },
      },
      3: {
        dodge: 9,
        secondEquipment: { name: "Wurfmesser", damage: "1d6", attackType: "ranged", exhaust: true },
      },
    },
    skill: {
      2: { body: 11, stealth: 15, willpower: 9 },
      3: { knowledge: 9, perception: 11, persuade: 15, stealth: 16, survival: 9 },
    },
  },
  Tsaiana: {
    hero: {
      2: {
        ranged: 12,
        specialAbility: {
          name: "Alertness",
          description:
            "<p>Reduce the result of your dodge test by 5. If your dodge test against an attack succeeds, you prevent all damage from the attack.</p>",
        },
      },
      3: {
        dodge: 9,
        secondEquipment: { name: "Wurfmesser", damage: "1d6", attackType: "ranged", exhaust: true },
      },
    },
    skill: {
      2: { body: 11, stealth: 15, survival: 9 },
      3: { knowledge: 11, perception: 11, persuade: 13, stealth: 16, willpower: 9 },
    },
  },
  Selestia: {
    hero: {
      2: { close: 7, basicEquipment: { damage: "1d6+1" } },
      3: { magic: 15, basicEquipment: { damage: "1d6+2" } },
    },
    skill: {
      2: { knowledge: 15, stealth: 9, willpower: 11 },
      3: { body: 9, craft: 11, knowledge: 16, perception: 13, persuade: 11 },
    },
  },
  Karmal: {
    hero: {
      2: {
        close: 7,
        // Kompendium-Wert war "1d61" (Tippfehler, fehlendes "+") - siehe Datei-Kommentar oben.
        basicEquipment: { damage: "1d6+1" },
        specialAbility: {
          name: "Gebildet",
          description:
            "<p>During your turn, either shuffle up to 2 cards of your choice from your Discard Pile into your Hero Deck or draw up to 2 cards.</p>",
        },
      },
      3: { magic: 15, basicEquipment: { damage: "1d6+2" } },
    },
    skill: {
      2: { knowledge: 15, perception: 9, survival: 11 },
      3: { body: 9, craft: 9, knowledge: 16, stealth: 13, willpower: 13 },
    },
  },
  Lavalox: {
    hero: {
      2: {
        ranged: 11,
        specialAbility: {
          name: "Nachsetzen",
          description: "<p>During your close attack´s damage roll, raise the damage by 7.</p>",
        },
      },
      3: {
        close: 15,
        ranged: 10,
        basicEquipment: { damage: "1d6+1" },
        specialAbility: {
          name: "Messer",
          description: "<p>During your close attack´s damage roll, raise the damage by 7.</p>",
        },
      },
    },
    skill: {
      2: { craft: 15, knowledge: 13, persuade: 9 },
      3: { body: 11, craft: 16, perception: 9, stealth: 9, willpower: 13 },
    },
  },
  Iridya: {
    hero: {
      2: {
        ranged: 11,
        specialAbility: {
          name: "Nachsetzen",
          description: "<p>During your close attack´s damage roll, raise the damage by 7.</p>",
        },
      },
      3: { close: 15, basicEquipment: { damage: "1d6+1" } },
    },
    skill: {
      2: { body: 11, craft: 15, survival: 9 },
      3: { craft: 16, knowledge: 13, perception: 13, persuade: 9, stealth: 9 },
    },
  },
  Brutack: {
    hero: {
      2: {
        close: 10,
        specialAbility: {
          name: "Geweiht",
          description:
            "<p>Pick one of your liturgical chants. Don´t pay the endurance cost at the end of your turns for this chant for the remainder of the game. Additionally you may turn the top card from your hero deck into an Endurance Card without looking at it.</p>",
        },
      },
      3: { magic: 12, basicEquipment: { damage: "1d6+1" } },
    },
    skill: {
      2: { craft: 15, survival: 9, willpower: 11 },
      3: { body: 13, craft: 16, knowledge: 11, perception: 9, persuade: 13 },
    },
  },
  Peraike: {
    hero: {
      2: {
        close: 10,
        specialAbility: {
          name: "Geweiht",
          description:
            "<p>Pick one of your liturgical chants. Don´t pay the endurance cost at the end of your turns for this chant for the remainder of the game. Additionally, you may turn the top card from your hero deck into an Endurance Card, without looking at it.</p>",
        },
      },
      3: {
        magic: 12,
        basicEquipment: { damage: "1d6+1" },
        specialAbility: {
          name: "Geweiht",
          description:
            "<p>Pick one of your liturgical chants. Don´t pay the endurance cost at the end of your turns for this chant for the remainder of the game. Additionally you may turn the top card from your hero deck into an Endurance Card without looking at it.</p>",
        },
      },
    },
    skill: {
      2: { craft: 15, knowledge: 11 },
      3: { body: 9, craft: 16, persuade: 13, stealth: 9, survival: 13 },
    },
  },
  Kjaska: {
    hero: {
      2: {
        ranged: 11,
        specialAbility: {
          name: "Swafnir´s Atem",
          description: "<p>Discard X of your Endurance Cards to heal (X+2) life points and draw X cards.</p>",
        },
      },
      3: { close: 14, basicEquipment: { damage: "1d6+1" } },
    },
    skill: {
      2: { body: 15, craft: 9, willpower: 11 },
      3: { body: 16, knowledge: 11, perception: 13, persuade: 9, stealth: 11 },
    },
  },
  Fortran: {
    hero: {
      2: {
        ranged: 11,
        secondEquipment: { attackType: "close" },
        specialAbility: {
          name: "Swafnir´s Atem",
          description: "<p>Discard X of your Endurance Cards to heal (X+2) life points and draw X cards.</p>",
        },
      },
      3: { close: 14, basicEquipment: { damage: "1d6+1" } },
    },
    skill: {
      2: { knowledge: 9, perception: 11, survival: 15 },
      3: { body: 13, craft: 13, persuade: 9, stealth: 9, survival: 16 },
    },
  },
};
