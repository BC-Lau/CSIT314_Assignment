// BOUNDARY: User Admin inventory for managing all Interior Design Projects.
class AdminIDPsPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'User Admin') {
      window.location.href = '/dashboard.html';
      return;
    }
    LogoutAction.bind();
    document.getElementById('refreshIDPs').addEventListener('click', () => this.load());
    document.getElementById('idpStatusFilter').addEventListener('change', () => this.render());
    document.getElementById('idpSearch').addEventListener('input', () => this.render());
    await this.load();
  }

  async load() {
    const result = await Api.get('/api/admin/idps');
    if (!result.success) return this.message(result.message || 'Unable to load IDPs', 'error');
    this.idps = result.idps || [];
    this.render();
  }

  render() {
    const list = document.getElementById('idpList');
    const status = document.getElementById('idpStatusFilter').value;
    const query = document.getElementById('idpSearch').value.trim().toLowerCase();
    const rows = (this.idps || []).filter((idp) => {
      const designerSuspended = !idp.designerIsActive;
      const projectSuspended = idp.isSuspended;
      const matchesStatus = status === 'all'
        || (status === 'active' && !projectSuspended && !designerSuspended)
        || (status === 'suspended' && projectSuspended)
        || (status === 'designer-suspended' && designerSuspended);
      const matchesQuery = `${idp.title || ''} ${idp.designerName || ''} ${idp.id}`.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
    if (!rows.length) {
      list.replaceChildren(el('p', { className: 'muted', textContent: 'No IDPs match this view.' }));
      return;
    }
    list.replaceChildren(...rows.map((idp) => this.card(idp)));
  }

  card(idp) {
    const designerSuspended = !idp.designerIsActive;
    const statusText = designerSuspended ? 'Designer account suspended'
      : idp.isSuspended ? 'Suspended' : idp.visibility === 'private' ? 'Private' : 'Active';
    const statusClass = designerSuspended || idp.isSuspended ? 'suspended' : 'active';
    const card = el('article', { className: `moderation-item ${statusClass === 'suspended' ? 'is-suspended' : ''}` });
    const heading = el('div', { className: 'page-heading compact' });
    heading.append(el('div', {},
      el('span', { className: 'moderation-kind', textContent: `IDP #${idp.id}` }),
      el('h3', { textContent: idp.title || 'Untitled project' })
    ));
    heading.append(el('span', { className: `account-status ${statusClass}`, textContent: statusText }));
    card.append(heading);
    card.append(el('p', { textContent: `Interior Designer: ${idp.designerName || `Account #${idp.designerId}`} · Created ${idp.createdAt || '—'}` }));
    card.append(el('p', { className: 'muted', textContent: `${idp.visibility === 'private' ? 'Private listing' : 'Public listing'} · ${idp.style || 'No style'} · ${Array.isArray(idp.type) ? idp.type.join(', ') : ''}` }));
    if (designerSuspended || idp.isSuspended) {
      card.append(el('p', { className: 'suspension-notice', textContent: designerSuspended
        ? 'SUSPENDED — the designer account is inactive, so this project is unavailable to customers.'
        : 'SUSPENDED — this project is unavailable to customers.' }));
    }
    const actions = el('div', { className: 'form-actions' });
    if (!idp.isSuspended && !designerSuspended) {
      actions.append(this.button('Suspend', 'warning', () => this.act(idp, 'suspend')));
    }
    if (idp.isSuspended && !designerSuspended) {
      actions.append(this.button('Reactivate', 'secondary', () => this.act(idp, 'reactivate')));
    }
    actions.append(this.button('Remove', 'danger', () => this.act(idp, 'remove')));
    card.append(actions);
    return card;
  }

  button(label, style, handler) {
    const button = el('button', { type: 'button', className: `btn ${style}`, textContent: label });
    button.addEventListener('click', handler);
    return button;
  }

  async act(idp, action) {
    const prompts = {
      suspend: `Suspend “${idp.title}”? Customers will no longer be able to view it.`,
      reactivate: `Reactivate “${idp.title}”?`,
      remove: `Permanently remove “${idp.title}”? This action cannot be undone.`,
    };
    if (!window.confirm(prompts[action])) return;
    const result = action === 'remove'
      ? await Api.request('DELETE', `/api/admin/idps/${idp.id}`)
      : await Api.post(`/api/admin/idps/${idp.id}/${action}`);
    this.message(result.message || `Unable to ${action} IDP`, result.success ? 'success' : 'error');
    if (result.success) await this.load();
  }

  message(text, type) {
    const node = document.getElementById('idpMessage');
    node.className = `message ${type}`;
    node.textContent = text;
  }
}
