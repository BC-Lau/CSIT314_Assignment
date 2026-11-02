// Draws one IDP card (used by the filter page #2 and the recommendations page #1).
// Needs common.js (el, money). Text only - never innerHTML.
function drawIDPCard(idp) {
  const tags = el('div');
  if (idp.style) tags.append(el('span', { className: 'pill', textContent: idp.style }));
  for (const room of idp.rooms) tags.append(el('span', { className: 'pill room', textContent: room }));
  const size = idp.houseSize == null ? '' : ` · ${Number(idp.houseSize).toLocaleString('en-SG')} sq ft`;
  return el('article', { className: 'idp-card' },
    el('h3', { textContent: idp.title }),
    el('div', { className: 'meta', textContent: `by ${idp.designerName} · ${money(idp.budget)}${size} · ${idp.duration ?? ''}` }),
    tags,
    el('p', { className: 'meta', textContent: idp.description })
  );
}
