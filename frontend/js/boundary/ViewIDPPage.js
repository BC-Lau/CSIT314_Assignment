// BOUNDARY: View IDP page - details of one IDP (idp-view.html?id=5).
// Calls /api/idps/:id
// The page is drawn in sections. To add a feature later (e.g. #24 photos, favourite button,
// contact designer, Update / Delete for the owner), write one more displayXxx() method
// and add it in displayIDP().
class ViewIDPPage {
  async init() {
    this.account = await Nav.render();
    LogoutAction.bind();
    await this.openIDP(new URLSearchParams(location.search).get('id'));
  }

  async openIDP(idpId) {
    const result = await Api.get(`/api/idps/${encodeURIComponent(idpId)}`);
    if (!result.success) return this.displayMessage(result.message ?? 'Could not load the IDP');
    this.displayIDP(result.idp, result.isOwner);
    if (this.account?.profile === 'Customer') {
      Api.post('/api/telemetry/log', { idpId: Number(idpId), type: 'view' }).catch(() => {});
    }
  }

  displayIDP(idp, isOwner) {
    document.title = `${idp.title} · InteriorMatch`;
    const box = document.getElementById('idp');
    box.textContent = '';
    box.append(el('article', { className: 'idp-details' },
      this.displayHeader(idp, isOwner),
      this.displayTags(idp),
      this.displayFacts(idp),
      el('p', { className: 'description', textContent: idp.description })
    ));
  }

  displayHeader(idp, isOwner) {
    const header = el('div', {},
      el('h1', { textContent: idp.title }),
      el('div', { className: 'muted', textContent: `by ${idp.designerName}` }));
    if (isOwner) header.append(el('div', { className: 'muted', textContent: `This is your IDP (${idp.visibility})` }));
    return header;
  }

  displayTags(idp) {
    const tags = el('div');
    tags.append(el('span', { className: 'pill', textContent: idp.style }));
    for (const type of idp.type) tags.append(el('span', { className: 'pill type', textContent: type }));
    return tags;
  }

  displayFacts(idp) {
    const facts = [
      ['Budget', money(idp.budget) || '-'],
      ['House size', idp.houseSize == null ? '-' : `${Number(idp.houseSize).toLocaleString('en-SG')} sq ft`],
      ['Duration', idp.duration ?? '-'],
      ['Created', idp.createdAt],
    ];
    const list = el('dl');
    for (const [label, value] of facts) list.append(el('dt', { textContent: label }), el('dd', { textContent: value }));
    return list;
  }

  displayMessage(text) {
    const box = document.getElementById('idp');
    box.textContent = '';
    box.append(el('p', { className: 'muted', textContent: text }));
  }
}
