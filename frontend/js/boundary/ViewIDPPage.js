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
    document.title = `${idp.title} - InteriorMatch`;

    const box = document.getElementById('idp');
    box.textContent = '';

    box.append(el('article', { className: 'idp-details' },
      this.displayHeader(idp, isOwner),
      this.displayTags(idp),
      this.displayFacts(idp),
      el('p', {
        className: 'description',
        textContent: idp.description
      })
    ));

    // User Story #20:
    // Customers can view consultation availability.
    if (this.account?.profile === 'Customer') {
      const availabilitySection = el('div', {
        id: 'consultationAvailability'
      });

      box.append(availabilitySection);

      const availabilityPage =
        new CustomerAvailabilityPage(availabilitySection, idp.id);

      availabilityPage.displaySlots(idp.designerId);
      box.append(this.displayContactForm(idp));
    }
  }

  displayContactForm(idp) {
    const section = el('section', { className: 'card contact-form' },
      el('h2', { textContent: `Contact ${idp.designerName}` }),
      el('p', { className: 'muted', textContent: 'Share your renovation ideas and the designer will get back to you.' })
    );
    const form = el('form');
    const message = el('textarea', {
      name: 'message',
      required: true,
      maxLength: 2000,
      placeholder: 'Tell the designer what you have in mind…'
    });
    const feedback = el('p', { className: 'message hidden', role: 'status', ariaLive: 'polite' });
    const submit = el('button', { className: 'btn', type: 'submit', textContent: 'Send message' });

    form.append(
      el('label', { htmlFor: 'contactMessage', textContent: 'Your message' }),
      Object.assign(message, { id: 'contactMessage' }),
      submit,
      feedback
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      feedback.className = 'message hidden';
      submit.disabled = true;
      try {
        const result = await Api.post('/api/contact-requests', {
          designerId: idp.designerId,
          idpId: idp.id,
          message: message.value
        });
        if (result.success) {
          form.reset();
          this.showContactSuccess(submit);
        } else {
          feedback.textContent = result.message ?? 'Could not send your message';
          feedback.className = 'message error';
        }
      } catch {
        feedback.textContent = 'Could not send your message. Please try again.';
        feedback.className = 'message error';
      } finally {
        submit.disabled = false;
      }
    });
    section.append(form);
    return section;
  }

  showContactSuccess(returnFocusTo) {
    const modal = el('div', {
      className: 'modal',
      role: 'alertdialog',
      ariaModal: 'true',
      ariaLabelledby: 'contactSuccessTitle',
      ariaDescribedby: 'contactSuccessDescription'
    });
    const closeButton = el('button', {
      className: 'btn',
      type: 'button',
      textContent: 'Done'
    });
    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      modal.remove();
      returnFocusTo.focus();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    modal.append(el('div', { className: 'modal-panel card narrow-modal contact-success-panel' },
      el('div', { className: 'contact-success-mark', ariaHidden: 'true', textContent: '✓' }),
      el('h2', { id: 'contactSuccessTitle', textContent: 'Message sent successfully' }),
      el('p', {
        id: 'contactSuccessDescription',
        textContent: 'Your message has been sent to the designer. They can follow up with you about your renovation ideas.'
      }),
      closeButton
    ));
    closeButton.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.append(modal);
    closeButton.focus();
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
