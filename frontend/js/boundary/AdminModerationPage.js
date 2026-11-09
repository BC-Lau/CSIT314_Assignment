class AdminModerationPage {
  async init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'User Admin') { location.href='/dashboard.html'; return; }
    LogoutAction.bind();
    document.getElementById('refreshFlags').addEventListener('click', () => this.load());
    document.getElementById('flagFilter').addEventListener('change', () => this.render());
    await this.load();
  }
  async load() {
    const result = await Api.get('/api/admin/moderation/flags');
    if (!result.success) return this.message(result.message || 'Unable to load moderation queue', 'error');
    this.flags = result.flags || [];
    this.render();
  }
  render() {
    const list = document.getElementById('flagList');
    const filter = document.getElementById('flagFilter').value;
    const rows = (this.flags || []).filter(f => filter === 'all' || f.status === filter);
    if (!rows.length) { list.replaceChildren(el('p',{className:'muted',textContent:'No flagged items in this view.'})); return; }
    list.replaceChildren(...rows.map(flag => this.card(flag)));
  }
  card(flag) {
    const isIDP = flag.subject_type === 'idp';
    const status = flag.status[0].toUpperCase()+flag.status.slice(1);
    const card = el('article',{className:`moderation-item ${flag.status === 'suspended' ? 'is-suspended' : ''}`});
    const heading = el('div',{className:'page-heading compact'});
    heading.append(el('div',{},el('span',{className:'moderation-kind',textContent:isIDP?'Interior Design Project':'Customer account'}),
      el('h3',{textContent:flag.subject_name || `${flag.subject_type} #${flag.subject_id}`})));
    heading.append(el('span',{className:`account-status ${flag.status==='suspended'?'suspended':flag.status}`,textContent:status}));
    card.append(heading);
    card.append(el('p',{textContent:flag.reason}));
    card.append(el('p',{className:'muted',textContent:`${isIDP?'Designer':'Account'}: ${flag.detail || '—'} · Flagged ${flag.created_at}`}));
    if (flag.status === 'suspended') card.append(el('p',{className:'suspension-notice',textContent:'SUSPENDED — this item is not available to customers.'}));
    const actions = el('div',{className:'form-actions'});
    if (flag.status === 'pending') {
      actions.append(this.button('Accept', 'secondary', () => this.act(flag,'accept')));
      actions.append(this.button('Suspend', 'warning', () => this.act(flag,'suspend')));
      actions.append(this.button('Remove', 'danger', () => this.act(flag,'remove')));
    }
    if (flag.status === 'suspended') {
      actions.append(this.button('Reactivate', 'secondary', () => this.reactivate(flag)));
    }
    if (isIDP && flag.status !== 'removed' && flag.designer_id) {
      actions.append(this.button('Suspend designer + all IDPs', 'danger', () => this.suspendDesigner(flag)));
    }
    if (actions.childElementCount) card.append(actions);
    return card;
  }
  button(label, style, handler) {
    const b=el('button',{type:'button',className:`btn ${style}`,textContent:label});
    b.addEventListener('click',handler); return b;
  }
  async act(flag, action) {
    if (action === 'remove' && !confirm('Remove this flagged item?')) return;
    const result=await Api.post(`/api/admin/moderation/flags/${flag.id}/${action}`);
    this.message(result.message || 'Unable to update flag', result.success?'success':'error');
    if (result.success) await this.load();
  }
  async reactivate(flag) {
    const url = flag.subject_type === 'customer'
      ? `/api/admin/accounts/${flag.subject_id}/reactivate`
      : `/api/admin/idps/${flag.subject_id}/reactivate`;
    const result = await Api.post(url);
    this.message(result.message || 'Unable to reactivate item', result.success ? 'success' : 'error');
    if (result.success) await this.load();
  }
  async suspendDesigner(flag) {
    if (!confirm('Suspend this Interior Designer account and every IDP they created?')) return;
    const result=await Api.post(`/api/admin/moderation/designers/${flag.designer_id}/suspend`);
    this.message(result.message || 'Unable to suspend designer',result.success?'success':'error');
    if (result.success) await this.load();
  }
  message(text,type) { const node=document.getElementById('moderationMessage'); node.className=`message ${type}`; node.textContent=text; }
}
