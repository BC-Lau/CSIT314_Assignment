// BOUNDARY: Create IDP form (#13) + Suggest tags (#23).
// Method names match the #13 and #23 sequence diagrams. Tags are name strings.
class IDPFormPage {
  async init() {
    this.account = await Nav.render();
    LogoutAction.bind();
    this.form = document.getElementById('idpForm');
    this.message = document.getElementById('message');
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'Interior Designer') {
      this.form.classList.add('hidden');
      return this.displayError('Only interior designers can create IDPs.');
    }
    await this.openCreateForm();
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.clickCreate(this.readForm());
    });
    document.getElementById('suggestBtn').addEventListener('click', () => this.clickSuggestTags());
    // The designer edits the (suggested) tags with the normal style list and type checkboxes.
    document.getElementById('styleOptions').addEventListener('change', (e) => this.replaceStyle(e.target.value));
    document.getElementById('typeOptions').addEventListener('change', (e) => {
      if (e.target.checked) this.addTag(e.target.value);
      else this.removeTypeTag(e.target.value);
    });
  }

  async openCreateForm() {
    const result = await Api.get('/api/idps/tag-options');
    if (!result.success) return this.displayError(result.message);
    this.displayTagOptions(result);
  }

  displayTagOptions({ styles, types }) {
    this.styles = styles;
    const styleBox = document.getElementById('styleOptions');
    const typeBox = document.getElementById('typeOptions');
    styleBox.textContent = '';
    typeBox.textContent = '';
    styleBox.append(el('option', { value: '', textContent: '— choose one style —' }));
    for (const name of styles) styleBox.append(el('option', { value: name, textContent: name }));
    for (const name of types) {
      const box = el('input', { type: 'checkbox', name: 'type', value: name });
      typeBox.append(el('label', { className: 'chip' }, box, name));
    }
    this.refreshTagList();
  }

  readForm() {
    const f = new FormData(this.form);
    return {
      title: f.get('title'),
      description: f.get('description'),
      budget: f.get('budget'),
      houseSize: f.get('houseSize'),
      duration: f.get('duration'),
      visibility: f.get('visibility'),
      style: f.get('style'),
      type: f.getAll('type'),
    };
  }

  async clickCreate(idpData) {
    const result = await Api.post('/api/idps', idpData);
    if (result.success) {
      this.displaySuccess(`IDP created: "${result.idp.title}"`);
      this.form.reset();
      this.refreshTagList();
    } else {
      this.displayError(result.message);
    }
  }

  // ---------- #23 Suggest tags ----------
  async clickSuggestTags() {
    const button = document.getElementById('suggestBtn');
    button.disabled = true;
    button.textContent = 'Suggesting…';
    try {
      const description = document.getElementById('description').value;
      const result = await Api.post('/api/idps/suggest-tags', { description });
      if (!result.success) return this.displayError(result.message);
      this.displaySuggestedTags(result.styleTag, result.typeTags);
      if (result.message) this.displayError(result.message);
      else this.displaySuccess('Tags suggested - check them before saving.');
    } finally {
      button.disabled = false;
      button.textContent = 'Suggest tags from description';
    }
  }

  displaySuggestedTags(styleTag, typeTags) {
    for (const box of this.typeBoxes()) box.checked = false;
    this.replaceStyle(styleTag);
    for (const tag of typeTags) this.addTag(tag);
    this.refreshTagList();
  }

  replaceStyle(tag) {
    document.getElementById('styleOptions').value = tag ?? '';
    this.refreshTagList();
  }

  removeTypeTag(tag) {
    const box = this.typeBoxes().find((b) => b.value === tag);
    if (box) box.checked = false;
    this.refreshTagList();
  }

  addTag(tag) {
    if (this.styles.includes(tag)) return this.replaceStyle(tag);
    const box = this.typeBoxes().find((b) => b.value === tag);
    if (box) box.checked = true;
    this.refreshTagList();
  }

  /** Shows the tags that will be saved, e.g. "Tags: Japandi · Kitchen, Bedroom". */
  refreshTagList() {
    const style = document.getElementById('styleOptions').value || 'no style yet';
    const types = this.typeBoxes().filter((b) => b.checked).map((b) => b.value);
    document.getElementById('tagSummary').textContent = `Tags: ${style} · ${types.length ? types.join(', ') : 'no types'}`;
  }

  typeBoxes() {
    return [...document.querySelectorAll('#typeOptions input[name="type"]')];
  }

  displaySuccess(message) {
    this.message.className = 'message success';
    this.message.textContent = message;
  }

  displayError(message) {
    this.message.className = 'message error';
    this.message.textContent = message || 'Something went wrong';
  }
}
