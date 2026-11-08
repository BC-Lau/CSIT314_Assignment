
/**
 * BOUNDARY: User Stories #3 / #20
 * Customer consultation history and cancellation.
 */
class MyConsultationsPage {
  async init() {
    this.account = Nav.render();
    LogoutAction.bind();

    if (!this.account) {
      window.location.href = '/login.html';
      return;
    }

    if (this.account.profile !== 'Customer') {
      window.location.href = '/dashboard.html';
      return;
    }

    await this.loadConsultations();
  }

  async loadConsultations() {
    const container = document.getElementById('consultationList');
    container.replaceChildren(
      el('p', {
        className: 'muted',
        textContent: 'Loading consultations...'
      })
    );

    try {
      const result = await Api.get('/api/consultation-requests/mine');

      if (!result.success) {
        throw new Error(result.message || 'Unable to load consultations');
      }

      this.displayConsultations(result.consultations);
    } catch (error) {
      container.replaceChildren(
        el('p', {
          textContent: error.message
        })
      );
    }
  }

  displayConsultations(consultations) {
    const container = document.getElementById('consultationList');
    container.replaceChildren();

    if (consultations.length === 0) {
      container.append(el('p', {
        className: 'muted',
        textContent: 'You have not requested any consultations yet.'
      }));
      return;
    }

    for (const consultation of consultations) {
      const start = new Date(consultation.startTime);
      const end = new Date(consultation.endTime);

      const dateFormat = new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        dateStyle: 'full'
      });

      const timeFormat = new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore',
        timeStyle: 'short'
      });

      const card = el('div', { className: 'card' });

      card.append(
        el('h3', {
          textContent: `Consultation with ${consultation.designerName}`
        }),
        el('p', {
          textContent: dateFormat.format(start)
        }),
        el('p', {
          textContent:
            `${timeFormat.format(start)} - ${timeFormat.format(end)} (SGT)`
        }),
        el('span', {
          className: 'badge',
          textContent:
            consultation.status === 'booked' ? 'Booked' : 'Cancelled'
        })
      );

      if (consultation.message) {
        card.append(el('p', {
          textContent: `Message: ${consultation.message}`
        }));
      }

      // Only upcoming active bookings can be cancelled.
      if (consultation.status === 'booked' &&
          start.getTime() > Date.now()) {

        const cancelButton = el('button', {
          className: 'btn secondary',
          type: 'button',
          textContent: 'Cancel Consultation'
        });

        cancelButton.addEventListener('click', () => {
          this.cancelConsultation(consultation.id);
        });

        card.append(el('p', {}, cancelButton));
      }

      container.append(card);
    }
  }

  async cancelConsultation(requestID) {
    if (!confirm('Are you sure you want to cancel this consultation?')) {
      return;
    }

    try {
      const result = await Api.delete(
        `/api/consultation-requests/${requestID}`
      );

      if (!result.success) {
        throw new Error(result.message || 'Cancellation failed');
      }

      document.getElementById('message').textContent =
        'Consultation cancelled successfully.';

      await this.loadConsultations();
    } catch (error) {
      document.getElementById('message').textContent =
        error.message || 'Unable to cancel consultation';
    }
  }
}
