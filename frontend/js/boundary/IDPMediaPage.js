// BOUNDARY: Story #24, select an owned IDP and upload/showcase visual media.
class IDPMediaPage {
  constructor() { this.previewUrls = []; }

  async init() {
    const account = Nav.render();
    LogoutAction.bind();
    if (!account) return LogoutAction.redirectToLoginPage();
    this.form = document.getElementById('mediaForm');
    this.message = document.getElementById('message');
    if (account.profile !== 'Interior Designer') {
      this.form.classList.add('hidden');
      return this.displayError('Only interior designers can upload project media.');
    }
    this.form.addEventListener('submit', (event) => { event.preventDefault(); this.uploadMedia(); });
    document.getElementById('idpSelect').addEventListener('change', () => this.loadMedia());
    try {
      const result = await Api.get('/api/idps/mine');
      if (!result.success) return this.displayError(result.message);
      const select = document.getElementById('idpSelect');
      select.textContent = '';
      for (const project of result.idps) select.append(el('option', { value: String(project.id), textContent: project.title }));
      const requestedId = new URLSearchParams(location.search).get('idpId');
      if (requestedId && [...select.options].some((o) => o.value === requestedId)) select.value = requestedId;
      if (result.idps.length) await this.loadMedia();
      else this.displayError('Create an IDP first, then upload media to it.');
    } catch { this.displayError('Could not load your IDPs.'); }
  }

  async uploadMedia() {
    const projectId = document.getElementById('idpSelect').value;
    const file = document.getElementById('mediaFile').files[0];
    if (!projectId || !file) return this.displayError('Select an IDP and a file.');
    const button = document.getElementById('uploadBtn');
    button.disabled = true;
    try {
      // POST raw bytes, avoiding external multipart dependencies.
      const account = Auth.get();
      const response = await fetch(`/api/idps/${projectId}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-User-Id': String(account.id),
          'X-File-Name': encodeURIComponent(file.name),
          'X-Mime-Type': file.type,
        },
        body: file,
      });
      const result = await response.json().catch(() => ({ success: false, message: 'Upload failed' }));
      if (!result.success) return this.displayError(result.message);
      document.getElementById('mediaFile').value = '';
      this.displaySuccess('Media uploaded successfully.');
      await this.loadMedia();
    } catch { this.displayError('Upload failed. Please retry.'); }
    finally { button.disabled = false; }
  }

  async loadMedia() {
    const projectId = document.getElementById('idpSelect').value;
    if (!projectId) return;
    try {
      const result = await Api.get(`/api/idps/${projectId}/media`);
      if (!result.success) return this.displayError(result.message);
      await this.displayMedia(projectId, result.media);
    } catch { this.displayError('Could not load media.'); }
  }

  async displayMedia(projectId, records) {
    for (const url of this.previewUrls) URL.revokeObjectURL(url);
    this.previewUrls = [];
    const box = document.getElementById('mediaGrid');
    box.textContent = '';
    if (!records.length) {
      box.append(el('p', { className: 'muted', textContent: 'No media uploaded yet.' }));
      return;
    }
    for (const record of records) {
      const item = el('div', { className: 'media-item' });
      const account = Auth.get();
      const response = await fetch(`/api/idps/media/${record.id}/file`, {
        headers: { 'X-User-Id': String(account.id) },
      });
      if (response.ok) {
        const url = URL.createObjectURL(await response.blob());
        this.previewUrls.push(url);
        if (record.mimeType.startsWith('image/')) {
          item.append(el('img', { src: url, alt: record.fileName, loading: 'lazy' }));
        } else {
          item.append(el('video', { src: url, controls: true, preload: 'metadata' }));
        }
      }
      item.append(el('p', { className: 'muted filename', textContent: record.fileName }));
      const remove = el('button', { className: 'btn secondary', type: 'button', textContent: 'Remove' });
      remove.addEventListener('click', () => this.removeMedia(projectId, record.id));
      item.append(remove);
      box.append(item);
    }
  }

  async removeMedia(projectId, mediaId) {
    if (!confirm('Remove this media from your project?')) return;
    try {
      const result = await Api.request('DELETE', `/api/idps/${projectId}/media/${mediaId}`);
      if (!result.success) return this.displayError(result.message);
      this.displaySuccess('Media removed.');
      await this.loadMedia();
    } catch { this.displayError('Could not remove media.'); }
  }

  displaySuccess(message) { this.show('success', message); }
  displayError(message) { this.show('error', message || 'Something went wrong'); }
  show(type, message) { this.message.className = `message ${type}`; this.message.textContent = message; }
}
