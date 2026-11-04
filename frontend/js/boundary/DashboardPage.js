// BOUNDARY: home page after login - shows the options for the user's profile.
// "ready: false" options are planned features (other user stories) and show as "coming soon".
const MENU = {
  'Interior Designer': [
    { title: 'Create IDP', text: 'Add a new project to your portfolio (#13)', href: '/idp-create.html', ready: true },
    { title: 'My IDPs', text: 'View, update and delete your projects (#14, #15)' },
    { title: 'Company information', text: 'Manage your company profile' },
    { title: 'IDP statistics', text: 'Views and favourites of each IDP' },
  ],
  'Customer': [
    { title: 'Browse IDPs', text: 'See the latest projects', href: '/index.html', ready: true },
    { title: 'Search & filter IDPs', text: 'By style, budget, size and duration' },
    { title: 'Recommended for you', text: 'Projects similar to your favourites (#1)', href: '/recommendations.html', ready: true },
    { title: 'My favourites', text: 'IDPs you saved' },
    { title: 'Contact a designer', text: 'Discuss your renovation ideas' },
  ],
  'Platform Manager': [
    { title: 'Connected customers', text: 'Customers who contacted designers (#25)' },
    { title: 'Reports', text: 'Daily, weekly and monthly reports' },
    { title: 'IDP categories', text: 'Manage the preset tags' },
  ],
  'User Admin': [
    { title: 'User accounts', text: 'Create, view, update and suspend accounts' },
    { title: 'User profiles', text: 'Manage the four user types' },
  ],
};

class DashboardPage {
  async init() {
    this.account = await Nav.render();
    if (!this.account) return LogoutAction.redirectToLoginPage();
    LogoutAction.bind();
    this.displayGreeting();
    this.displayOptions(MENU[this.account.profile] ?? []);
  }

  displayGreeting() {
    document.getElementById('greeting').textContent = `Welcome back, ${this.account.username}`;
    document.getElementById('profile').textContent = this.account.profile;
  }

  displayOptions(options) {
    const box = document.getElementById('options');
    for (const o of options) {
      const card = el(o.ready ? 'a' : 'div', { className: `option${o.ready ? '' : ' soon'}` },
        el('strong', { textContent: o.title }),
        el('span', { textContent: o.ready ? o.text : `${o.text} — coming soon` }));
      if (o.ready) card.href = o.href;
      box.append(card);
    }
  }
}
