// Shared helpers for every page: who is logged in, calling the API and drawing the top navigation.

// The account returned by login, kept in this browser (cleared on logout).
const Auth = {
  save(account) { localStorage.setItem('account', JSON.stringify(account)); },
  get() {
    try { return JSON.parse(localStorage.getItem('account')); } catch { return null; }
  },
  clear() { localStorage.removeItem('account'); },
};

const Api = {
  async request(method, url, body) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    const account = Auth.get();
    if (account) headers['X-User-Id'] = account.id; // backend uses this to find the user
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ...data };
  },
  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body ?? {}); },
  put(url, body) { return this.request('PUT', url, body ?? {}); },
  delete(url) { return this.request('DELETE', url); },
};

const Nav = {
  /** Draws the nav bar. Returns the logged-in account (or null). */
  render() {
    const account = Auth.get();
    const nav = document.getElementById('nav');
    nav.className = 'nav';
    nav.innerHTML = `<div class="nav-inner">
        <a class="brand" href="/index.html">Interior<span>Match</span></a>
        <a class="link" href="/index.html">Home</a>
        <span id="navRight"></span>
      </div>`;
    const right = nav.querySelector('#navRight');
    right.style.display = 'flex';
    right.style.gap = '16px';
    right.style.alignItems = 'center';
    if (account) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = `${account.username} · ${account.profile}`;
      const dash = Object.assign(document.createElement('a'), { className: 'link', href: '/dashboard.html', textContent: 'Dashboard' });
      const out = Object.assign(document.createElement('button'), { className: 'btn secondary', textContent: 'Log out', id: 'logoutBtn' });
      right.append(dash, who, out);
    } else {
      right.append(Object.assign(document.createElement('a'), { className: 'btn', href: '/login.html', textContent: 'Log in' }));
    }
    return account ?? null;
  },
};

// #12 Logout: forget the logged-in account in this browser and go to login.
const LogoutAction = {
  bind() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', () => this.clickLogout());
  },
  clickLogout() {
    Auth.clear();
    this.redirectToLoginPage();
  },
  redirectToLoginPage() {
    window.location.href = '/login.html?loggedOut=1';
  },
};

// Small helpers for drawing text safely (never put user data into innerHTML).
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
}
const money = (n) => (n == null ? '' : `S$${Number(n).toLocaleString('en-SG')}`);
