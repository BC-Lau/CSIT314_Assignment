class DesignerContactsPage {
  async init() {
    this.account = Nav.render();
    LogoutAction.bind();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    if (this.account.profile !== 'Interior Designer') {
      window.location.href = '/dashboard.html';
      return;
    }

    const result = await Api.get('/api/contact-requests/designer');
    if (!result.success) return this.showMessage(result.message ?? 'Could not load messages');

    const box = document.getElementById('contacts');
    box.textContent = '';
    if (result.requests.length === 0) {
      this.showMessage('You have no customer messages yet.');
      return;
    }
    for (const request of result.requests) box.append(this.createCard(request));
  }

  createCard(request) {
    const card = el('article', { className: 'card contact-card' },
      el('h2', { textContent: request.idpTitle ?? 'General renovation inquiry' }),
      el('p', { className: 'muted', textContent: `${request.customerName} · ${request.createdAt}` }),
      el('p', { className: 'contact-message', textContent: request.message })
    );
    if (request.customerEmail) {
      card.append(el('a', {
        href: `mailto:${request.customerEmail}`,
        textContent: `Reply to ${request.customerName}`
      }));
    } else {
      card.append(el('p', { className: 'muted', textContent: 'This customer has not provided an email address.' }));
    }
    return card;
  }

  showMessage(message) {
    const box = document.getElementById('contacts');
    box.textContent = '';
    box.append(el('p', { className: 'muted', textContent: message }));
  }
}
