
/**
 * BOUNDARY: User Story #20
 * Customer read-only consultation availability.
 */
class CustomerAvailabilityPage {
  constructor(container) {
    this.container = container;
  }

  async displaySlots(designerID) {
    this.container.replaceChildren();

    const section = el('section', { className: 'card' });
    section.append(
      el('h2', { textContent: 'Consultation Availability' }),
      el('p', {
        className: 'muted',
        textContent: 'Available consultation times for this Interior Designer.'
      })
    );

    const list = el('div');
    list.append(el('p', {
      className: 'muted',
      textContent: 'Loading consultation slots...'
    }));

    section.append(list);
    this.container.append(section);

    try {
      const result = await Api.get(
        `/api/availability/designer/${encodeURIComponent(designerID)}`
      );

      list.replaceChildren();

      if (!result.success) {
        throw new Error(result.message || 'Unable to load availability');
      }

      // Display only available, future consultation slots.
      const now = Date.now();
      const slots = result.slots
        .filter(slot =>
          slot.status === 'available' &&
          new Date(slot.startTime).getTime() > now
        )
        .sort((a, b) =>
          new Date(a.startTime) - new Date(b.startTime)
        );

      if (slots.length === 0) {
        list.append(el('p', {
          className: 'muted',
          textContent: 'No upcoming consultation slots available.'
        }));
        return;
      }

      for (const slot of slots) {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);

        const dateText = new Intl.DateTimeFormat('en-SG', {
          timeZone: 'Asia/Singapore',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(start);

        const timeFormat = new Intl.DateTimeFormat('en-SG', {
          timeZone: 'Asia/Singapore',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const slotCard = el('div', {
          className: 'card'
        });


        slotCard.append(
          el('h3', { textContent: dateText }),
          el('p', {
            textContent:
              `${timeFormat.format(start)} - ${timeFormat.format(end)} (SGT)`
          }),
          el('span', {
            className: 'badge',
            textContent: 'Available'
          })
        );

        // Only logged-in customers can request consultations.
        const account = Auth.get();

        if (account?.profile === 'Customer') {
          const requestButton = el('button', {
            className: 'btn',
            type: 'button',
            textContent: 'Request Consultation'
          });

          requestButton.addEventListener('click', () => {
            this.showRequestForm(slot, designerID);
          });

          slotCard.append(el('p', {}, requestButton));
        }

        list.append(slotCard);
      }

    } catch (error) {
      list.replaceChildren(
        el('p', {
          textContent: error.message || 'Unable to load consultation slots.'
        })
      );
    }
  }

  
  // Display a confirmation form for the chosen consultation slot.
  showRequestForm(slot, designerID) {
    // Remove an existing request form if one is already open.
    document.getElementById('consultationRequestForm')?.remove();

    const form = el('form', {
      id: 'consultationRequestForm',
      className: 'card'
    });

    const start = new Date(slot.startTime);

    const selectedTime = new Intl.DateTimeFormat('en-SG', {
      timeZone: 'Asia/Singapore',
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(start);

    const heading = el('h3', {
      textContent: 'Request Consultation'
    });

    const selected = el('p', {
      textContent: `Selected slot: ${selectedTime} (SGT)`
    });

    const label = el('label', {
      htmlFor: 'consultationMessage',
      textContent: 'Message (optional)'
    });

    const messageInput = el('textarea', {
      id: 'consultationMessage',
      rows: 3,
      maxLength: 2000,
      placeholder: 'Briefly describe your renovation ideas'
    });

    const feedback = el('p', {
      role: 'status'
    });

    const submit = el('button', {
      className: 'btn',
      type: 'submit',
      textContent: 'Confirm Request'
    });

    const cancel = el('button', {
      className: 'btn secondary',
      type: 'button',
      textContent: 'Cancel'
    });

    cancel.addEventListener('click', () => form.remove());

    form.append(
      heading,
      selected,
      label,
      messageInput,
      el('p', {}, submit, ' ', cancel),
      feedback
    );

    form.addEventListener('submit', async event => {
      event.preventDefault();

      submit.disabled = true;
      submit.textContent = 'Submitting...';

      try {
        const result = await Api.post('/api/consultation-requests', {
          slotID: slot.slotID,
          message: messageInput.value
        });

        if (!result.success) {
          feedback.textContent =
            result.message || 'Unable to request consultation';
          submit.disabled = false;
          submit.textContent = 'Confirm Request';
          return;
        }

        // Display confirmation and refresh availability.
        form.remove();

        await this.displaySlots(designerID);

        const confirmation = el('p', {
          role: 'status',
          textContent: 'Consultation requested successfully!'
        });

        this.container.prepend(confirmation);

      } catch {
        feedback.textContent = 'Unable to connect to the server';
        submit.disabled = false;
        submit.textContent = 'Confirm Request';
      }
    });

    this.container.append(form);
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

}
