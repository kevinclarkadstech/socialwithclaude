import './SponsoredSlot.css';

/**
 * Where an ad goes in the rail. A labelled placeholder until there's an ad
 * provider (likely Google AdSense on the web, AdMob in the apps).
 */
export function SponsoredSlot() {
  return (
    <section className="sponsored-slot" aria-label="Sponsored">
      <span className="sponsored-slot__label">Sponsored</span>
      <div className="sponsored-slot__box">Ad space</div>
    </section>
  );
}
