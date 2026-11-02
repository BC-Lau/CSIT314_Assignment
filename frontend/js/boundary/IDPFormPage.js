// BOUNDARY: Create IDP form (#13). Method names match the #13 sequence diagram.
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
  }

  async openCreateForm() {
    const result = await Api.get('/api/idps/tag-options');
    if (!result.success) return this.displayError(result.message);
    this.displayTagOptions(result.tags);
  }

  displayTagOptions(tags) {
    const styleBox = document.getElementById('styleOptions');
    const roomBox = document.getElementById('roomOptions');
    styleBox.textContent = '';
    roomBox.textContent = '';
    styleBox.append(el('option', { value: '', textContent: '— choose one style —' }));
    for (const t of tags) {
      if (t.type === 'style') {
        styleBox.append(el('option', { value: t.name, textContent: t.name }));
      } else {
        const box = el('input', { type: 'checkbox', name: 'room', value: t.name });
        roomBox.append(el('label', { className: 'chip' }, box, t.name));
      }
    }
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
      tagNames: [f.get('style'), ...f.getAll('room')].filter(Boolean),
    };
  }

  async clickCreate(idpData) {
    const result = await Api.post('/api/idps', idpData);
    if (result.success) {
      this.displaySuccess(`IDP created: "${result.idp.title}"`);
      this.form.reset();
    } else {
      this.displayError(result.message);
    }
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
