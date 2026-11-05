// Draws one IDP card (used by the home page, #1 and My IDPs). Clicking it opens View IDP.
// #6: with { showSave: true } the card also has a Save button (Customers) that saves the IDP to favourites.
// With { saved: true } the button already shows "Saved" (the customer saved this IDP earlier).
// Needs common.js (el, money, Api)

function drawIDPCard(idp, { showSave = false, saved = false } = {}) {
  const tags = el('div');
  if (idp.visibility === 'private') tags.append(el('span', { className: 'pill private', textContent: 'Private' }));
  if (idp.style) tags.append(el('span', { className: 'pill', textContent: idp.style }));
  for (const type of idp.type) tags.append(el('span', { className: 'pill type', textContent: type }));
  const size = idp.houseSize == null ? '' : ` · ${Number(idp.houseSize).toLocaleString('en-SG')} sq ft`;
  const card = el('a', { className: 'idp-card', href: `/idp-view.html?id=${idp.id}` },
    el('h3', { textContent: idp.title }),
    el('div', { className: 'meta', textContent: `by ${idp.designerName} · ${money(idp.budget)}${size} · ${idp.duration ?? ''}` }),
    tags,
    el('p', { className: 'meta', textContent: idp.description })
  );
  if (showSave) card.append(drawSaveButton(idp.id, saved));
  return card;
}

// #6 Save IDP to favourites (boundary: the Save button on a card)
function drawSaveButton(idpId, saved) {
  const button = el('button', { className: 'btn secondary save-btn', type: 'button', textContent: 'Save' });
  const message = el('span', { className: 'meta' });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    clickSave(idpId, button, message);
  });
  if (saved) displaySaved(button, message);
  return el('div', { className: 'save-row' }, button, message);
}

// The ids of the IDPs the logged-in customer already saved (empty if none or not a customer)
async function loadSavedIDPIds() {
  const result = await Api.get('/api/favourites');
  return new Set(result.success ? result.idpIds : []);
}

async function clickSave(idpId, button, message) {
  button.disabled = true;
  const result = await Api.post(`/api/favourites/${encodeURIComponent(idpId)}`);
  if (!result.success) {
    button.disabled = false;
    return displayMessage(message, result.message ?? 'Could not save this IDP');
  }
  if (result.alreadySaved) return displayAlreadySaved(button, message);
  displaySaved(button, message);
}

function displaySaved(button, message) {
  button.textContent = 'Saved ✓';
  button.disabled = true;
  message.textContent = '';
}

function displayAlreadySaved(button, message) {
  button.textContent = 'Saved ✓';
  button.disabled = true;
  message.textContent = 'Already in your favourites';
}

function displayMessage(message, text) {
  message.textContent = text;
}
