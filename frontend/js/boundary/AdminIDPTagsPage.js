class AdminIDPTagsPage {
  async init() {
    this.account = Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'Platform Manager') {
      document.querySelector('main').replaceChildren(el('h1', { textContent: 'Access denied' }), el('p', { textContent: 'Only Platform Managers can manage IDP tags.' }));
      return;
    }
    LogoutAction.bind();
    document.getElementById('addTagsForm').addEventListener('submit', (e) => this.addTags(e));
    document.getElementById('deleteCategory').addEventListener('change', () => this.renderChoices());
    document.getElementById('deleteTagsBtn').addEventListener('click', () => this.deleteTags());
    document.getElementById('refreshTagsBtn').addEventListener('click', () => this.loadTags());
    await this.loadTags();
  }

  async loadTags() {
    const result = await Api.get('/api/admin/tags');
    if (!result.success) return this.message(result.message || 'Unable to load tags', 'error');
    this.tags = { style: result.styles ?? [], type: result.types ?? [] };
    this.renderChoices();
    this.renderInventory();
  }

  renderChoices() {
    const category = document.getElementById('deleteCategory').value;
    const box = document.getElementById('tagChoices');
    const tags = this.tags?.[category] ?? [];
    if (!tags.length) { box.replaceChildren(el('p', { className: 'muted', textContent: 'No tags in this category.' })); return; }
    box.replaceChildren(...tags.map((tag) => {
      const input = el('input', { type: 'checkbox', value: tag });
      return el('label', { className: 'tag-choice' }, input, el('span', { textContent: tag }));
    }));
  }

  renderInventory() {
    for (const [category, id] of [['style', 'styleInventory'], ['type', 'typeInventory']]) {
      const box = document.getElementById(id);
      box.replaceChildren(...this.tags[category].map((tag) => el('span', { className: 'pill', textContent: tag })));
      if (!this.tags[category].length) box.append(el('span', { className: 'muted', textContent: 'No tags' }));
    }
  }

  async addTags(event) {
    event.preventDefault();
    const tags = document.getElementById('newTags').value.split(/[\r\n,]+/).map((tag) => tag.trim()).filter(Boolean);
    const category = document.getElementById('addCategory').value;
    if (!tags.length) return this.message('Enter at least one tag.', 'error');
    const result = await Api.post('/api/admin/tags/bulk', { category, tags });
    if (!result.success) return this.message(result.message || 'Unable to add tags', 'error');
    this.renderAddResults(result);
    this.message(result.message, result.failed?.length ? 'error' : 'success');
    document.getElementById('newTags').value = '';
    await this.loadTags();
  }

  renderAddResults(result) {
    const box = document.getElementById('addResults');
    box.replaceChildren();
    if (result.added?.length) box.append(el('h3', { textContent: 'Successfully added' }), el('ul', {}, ...result.added.map((tag) => el('li', { textContent: tag }))));
    if (result.failed?.length) box.append(el('h3', { textContent: 'Could not add' }), el('ul', {}, ...result.failed.map((item) => el('li', { textContent: `${item.tag}: ${item.reason}` }))));
  }

  async deleteTags() {
    const category = document.getElementById('deleteCategory').value;
    const tags = [...document.querySelectorAll('#tagChoices input:checked')].map((input) => input.value);
    if (!tags.length) return this.message('Select at least one tag to delete.', 'error');
    const confirmed = window.confirm(`Delete ${tags.length} selected tag(s)? This also updates existing IDPs.`);
    if (!confirmed) return;
    const result = await Api.request('DELETE', '/api/admin/tags/bulk', { category, tags });
    if (!result.success) return this.message(result.message || 'Unable to delete tags', 'error');
    this.message(result.message, 'success');
    await this.loadTags();
  }

  message(text, type) {
    const node = document.getElementById('pageMessage');
    node.className = `message ${type}`;
    node.textContent = text;
  }
}
