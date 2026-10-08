/** Presentation-only artwork for our tray and card sheet; never changes Actor.img. */
const ART = "modules/aventuria/assets/art/";
export const HERO_PORTRAITS = Object.freeze({
  brutack: "brutack-parinor.webp",
  fortan: "fortan-algolson.webp",
  fortran: "fortan-algolson.webp",
  iridya: "iridya-emberstrike.webp",
  jandriel: "jandriel-coppermoon.webp",
  karmal: "karmal-eternius.webp",
  kjaska: "kjaska-starsailer.webp",
  lavalox: "lavalox-silversmith.webp",
  miraculo: "miraculo-marvelli.webp",
  peraike: "peraike-alrikshuber.webp",
  selestia: "selestia-saba-okarim.webp",
  tsaiana: "tsaiana-the-spider.webp",
  yoleyana: "yoleyana-maplesong.webp",
});

export function heroPortrait(actor) {
  const name = actor?.name?.trim().split(/\s+/)[0]?.toLowerCase();
  const file = actor?.type === "aventuria.hero" && HERO_PORTRAITS[name];
  return file ? ART + file : actor?.img;
}

/** Older Aventuria installs may not contain the new art yet. */
export function bindPortraitFallback(element) {
  for (const image of element.querySelectorAll("img[data-portrait-fallback]")) {
    const fallback = () => {
      const src = image.dataset.portraitFallback;
      if (!src || image.getAttribute("src") === src) return;
      image.src = src;
      if (image.dataset.src) image.dataset.src = src;
    };
    image.addEventListener("error", fallback, { once: true });
    if (image.complete && image.naturalWidth === 0) fallback();
  }
}
