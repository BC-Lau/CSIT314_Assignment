// BOUNDARY: public project gallery; only media from public IDPs is readable without login.
class PublicIDPMediaPage {
  async init() {
    Nav.render();
    LogoutAction.bind();
    const id = Number(new URLSearchParams(location.search).get('idpId'));
    if (!Number.isSafeInteger(id) || id < 1) return this.showMessage('Invalid project.');
    try {
      const result = await Api.get(`/api/idps/${id}/media`);
      if (!result.success) return this.showMessage('This project is unavailable.');
      const box = document.getElementById('gallery');
      if (!result.media.length) return this.showMessage('No media uploaded for this project yet.');
      for (const record of result.media) {
        const url = `/api/idps/media/${record.id}/file`;
        const item = el('article', { className: 'media-item' });
        if (record.mimeType.startsWith('image/')) {
          item.append(el('img', { src: url, alt: record.fileName, loading: 'lazy' }));
        } else {
          item.append(el('video', { src: url, preload: 'metadata', controls: true }));
        }
        item.append(el('p', { className: 'muted filename', textContent: record.fileName }));
        box.append(item);
      }
    } catch { this.showMessage("Unable to load this project media."); }
  }
  showMessage(message) { document.getElementById('message').textContent = message; }
}
