
/**
 * BOUNDARY: User Story #20
 * Consultation Availability Management
 */
class AvailabilityManagementPage {
  constructor() {
    this.account = null;
    this.editingSlotID = null;
    this.slots = [];
  }

  async init() {
    this.account = Nav.render();
    LogoutAction.bind();

    if (!this.account) {
      window.location.href = '/login.html';
      return;
    }

    if (this.account.profile !== 'Interior Designer') {
      window.location.href = '/dashboard.html';
      return;
    }

    document.getElementById('slotForm')
      .addEventListener('submit', event => this.handleSubmit(event));

    document.getElementById('cancelEdit')
      .addEventListener('click', () => this.resetForm());

    await this.loadSlots();
  }


  async loadSlots() {
    try {
      // Fetch the designer's slots and customer bookings.
      const [slotsResult, bookingsResult] = await Promise.all([
        Api.get('/api/availability/mine'),
        Api.get('/api/consultation-requests/designer')
      ]);

      if (!slotsResult.success) {
        this.displayError(
          slotsResult.message || 'Unable to load consultation slots'
        );
        return;
      }

      if (!bookingsResult.success) {
        this.displayError(
          bookingsResult.message || 'Unable to load customer bookings'
        );
        return;
      }

      this.slots = slotsResult.slots;

      // Match active customer bookings to their consultation slots.
      this.bookings = new Map(
        bookingsResult.consultations
          .filter(booking => booking.status === 'booked')
          .map(booking => [Number(booking.slotID), booking])
      );

      this.displaySlots(this.slots);

    } catch (error) {
      this.displayError('Unable to connect to the server');
    }
  }


  // Convert UTC timestamp to local datetime input.
  toLocalInput(utcString) {
    const date = new Date(utcString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset)
      .toISOString().slice(0, 16);
  }

  // Display consultation slots.
  displaySlots(slots) {
    const container = document.getElementById('slotList');
    container.replaceChildren();

    if (slots.length === 0) {
      container.append(
        el('p', {
          className: 'muted',
          textContent: 'No consultation slots have been created yet.'
        })
      );
      return;
    }

    for (const slot of slots) {
      const card = el('div', { className: 'card' });

      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);

      const title = el('h3', {
        textContent: start.toLocaleDateString('en-SG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });

      const time = el('p', {
        textContent:
          `${start.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit'
          })} - ${end.toLocaleTimeString('en-SG', {
            hour: '2-digit',
            minute: '2-digit'
          })}`
      });

      const status = el('span', {
        className: 'badge',
        textContent: slot.status
      });

      const editButton = el('button', {
        className: 'btn secondary',
        textContent: 'Edit',
        disabled: slot.status === 'booked'
      });

      editButton.addEventListener('click', () => {
        this.showSlotForm(slot);
      });

      const removeButton = el('button', {
        className: 'btn secondary',
        textContent: 'Remove',
        disabled: slot.status === 'booked'
      });

      removeButton.addEventListener('click', () => {
        this.requestSlotRemoval(slot.slotID);
      });


      card.append(title, time, status);

      // Display customer information for booked slots.
      if (slot.status === 'booked') {
        const booking = this.bookings?.get(Number(slot.slotID));

        if (booking) {
          const details = el('div', {
            className: 'card'
          });

          details.append(
            el('p', {
              textContent: `Booked by: ${booking.customerName}`
            }),
            el('p', {
              textContent: `Customer message: ${booking.message || 'No message provided'}`
            })
          );

          card.append(details);
        } else {
          card.append(el('p', {
            className: 'muted',
            textContent: 'Customer booking details unavailable.'
          }));
        }
      }

      // Editing and removing booked slots remains prohibited.
      card.append(
        el('p', {}, editButton, ' ', removeButton)
      );

      container.append(card);

    }
  }

  // Show the form populated for editing.
  showSlotForm(slot = null) {
    this.editingSlotID = slot?.slotID ?? null;

    document.getElementById('formTitle').textContent =
      slot ? 'Edit Consultation Slot' : 'Add Consultation Slot';

    document.getElementById('saveSlot').textContent =
      slot ? 'Save Changes' : 'Add Slot';

    document.getElementById('cancelEdit').hidden = !slot;

    document.getElementById('startTime').value =
      slot ? this.toLocalInput(slot.startTime) : '';

    document.getElementById('endTime').value =
      slot ? this.toLocalInput(slot.endTime) : '';

    if (slot) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    const startValue = document.getElementById('startTime').value;
    const endValue = document.getElementById('endTime').value;

    const start = new Date(startValue);
    const end = new Date(endValue);

    if (!Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start) {
      this.displayError('End time must be after start time');
      return;
    }

    const startUTC = start.toISOString();
    const endUTC = end.toISOString();

    if (this.editingSlotID !== null) {
      await this.submitEditedSlot(
        this.editingSlotID, startUTC, endUTC
      );
    } else {
      await this.submitNewSlot(startUTC, endUTC);
    }
  }

  // Add a new consultation slot.
  async submitNewSlot(start, end) {
    try {
      const result = await Api.post('/api/availability', {
        startTime: start,
        endTime: end
      });

      if (!result.success) {
        this.displayError(result.message);
        return;
      }

      this.resetForm();
      this.displayConfirmation('Consultation slot added successfully');
      await this.loadSlots();
    } catch {
      this.displayError('Unable to create consultation slot');
    }
  }

  // Edit an existing consultation slot.
  async submitEditedSlot(slotID, start, end) {
    try {
      const result = await Api.put(
        `/api/availability/${slotID}`,
        { startTime: start, endTime: end }
      );

      if (!result.success) {
        this.displayError(result.message);
        return;
      }

      this.resetForm();
      this.displayConfirmation('Consultation slot updated successfully');
      await this.loadSlots();
    } catch {
      this.displayError('Unable to update consultation slot');
    }
  }

  // Remove a consultation slot after confirmation.
  async requestSlotRemoval(slotID) {
    if (!confirm('Remove this consultation slot?')) {
      return;
    }

    try {
      const result = await Api.delete(
        `/api/availability/${slotID}`
      );

      if (!result.success) {
        this.displayError(result.message);
        return;
      }

      this.resetForm();
      this.displayConfirmation('Consultation slot removed successfully');
      await this.loadSlots();
    } catch {
      this.displayError('Unable to remove consultation slot');
    }
  }

  displayConfirmation(message) {
    const box = document.getElementById('message');
    box.textContent = message;
    box.style.color = 'green';
  }

  displayError(message) {
    const box = document.getElementById('message');
    box.textContent = message || 'Something went wrong';
    box.style.color = 'red';
  }

  resetForm() {
    document.getElementById('slotForm').reset();
    this.showSlotForm();
  }
}
