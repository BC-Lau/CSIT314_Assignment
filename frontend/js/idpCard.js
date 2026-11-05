// Draws one IDP card (used by the home page, #1 and My IDPs). Clicking it opens View IDP.
// Needs common.js (el, money)
function drawIDPCard(idp) {
  const tags = el('div');
  if (idp.visibility === 'private') tags.append(el('span', { className: 'pill private', textContent: 'Private' }));
  if (idp.style) tags.append(el('span', { className: 'pill', textContent: idp.style }));
  for (const type of idp.type) tags.append(el('span', { className: 'pill type', textContent: type }));
  const size = idp.houseSize == null ? '' : ` · ${Number(idp.houseSize).toLocaleString('en-SG')} sq ft`;
  return el('a', { className: 'idp-card', href: `/idp-view.html?id=${idp.id}` },
    el('h3', { textContent: idp.title }),
    el('div', { className: 'meta', textContent: `by ${idp.designerName} · ${money(idp.budget)}${size} · ${idp.duration ?? ''}` }),
    tags,
    el('p', { className: 'meta', textContent: idp.description })
  );
}
