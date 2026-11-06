// BOUNDARY extension for Story #24. Decorates existing cards without modifying
// teammates' HomePage or shared drawIDPCard implementation.
(() => {
  function enhance(card, idp) {
    if (!card || !idp || !Number.isSafeInteger(Number(idp.id)) || Number(idp.id) < 1) return card;
    if (card.querySelector('[data-idp-gallery]')) return card;
    if (idp.coverMediaId && !card.querySelector('.idp-cover')) {
      const image = document.createElement('img');
      image.className = 'idp-cover';
      image.src = `/api/idps/media/${encodeURIComponent(idp.coverMediaId)}/file`;
      image.alt = `Photo of ${idp.title || 'interior design project'}`;
      image.loading = 'lazy';
      card.prepend(image);
    }
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const link = document.createElement('a');
    link.dataset.idpGallery = 'true';
    link.href = `/idp-gallery.html?idpId=${encodeURIComponent(idp.id)}`;
    link.textContent = 'View photos & videos';
    actions.append(link);
    card.append(actions);
    return card;
  }

  // The home page renders a collection of cards synchronously after loading IDPs.
  if (typeof HomePage !== 'undefined' && typeof HomePage.prototype.displayIDPs === 'function') {
    const original = HomePage.prototype.displayIDPs;
    HomePage.prototype.displayIDPs = function (idps, ...args) {
      const rendered = original.call(this, idps, ...args);
      const finish = () => {
        const cards = document.querySelectorAll('#idpGrid .idp-card');
        if (Array.isArray(idps) && cards.length === idps.length) {
          idps.forEach((idp, index) => enhance(cards[index], idp));
        }
      };
      if (rendered && typeof rendered.then === 'function') {
        return rendered.then((value) => { finish(); return value; });
      }
      finish();
      return rendered;
    };
  }

  // Recommendation pages use a shared card renderer. Preserve its behavior and
  // only add the media action / optional image to the returned card.
  if (typeof drawIDPCard === 'function') {
    const original = drawIDPCard;
    drawIDPCard = function (idp, ...args) {
      return enhance(original(idp, ...args), idp);
    };
  }
})();
