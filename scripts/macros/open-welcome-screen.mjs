import { AventuriaHelpersWelcomeScreen } from "../apps/welcome-screen.mjs";

/**
 * Opens the welcome screen - step 1 of the planned guided-onboarding tool.
 */
export function openWelcomeScreen() {
  new AventuriaHelpersWelcomeScreen().render({ force: true });
}
