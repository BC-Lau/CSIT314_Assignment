// BOUNDARY: home page after login - shows the options for the user's profile.
// "ready: false" options are planned features (other user stories) and show as "coming soon".
const MENU = {
  'Interior Designer': [
    { title: 'License verification', text: 'Submit your business license and check verification status', href: '/designer-license.html', ready: true },
    { title: 'Create IDP', text: 'Add a new project to your portfolio (#13)', href: '/idp-create.html', ready: true },
    { title: 'My IDPs', text: 'View your projects (update / delete: #14, #15)', href: '/my-idps.html', ready: true },
    { title: 'Consultation Availability', text: 'Manage your available consultation time slots (#20)', href: '/consultation-availability.html', ready: true},
    { title: 'Company information', text: 'Manage your company profile' },
    { title: 'IDP statistics', text: 'Views and favourites of each IDP' },
    { title: 'Upload project media', text: 'Showcase photos and videos of your IDPs (#24)', href: '/idp-media.html', ready: true },
  ],
  'Customer': [
    { title: 'Browse IDPs', text: 'See the latest projects', href: '/index.html', ready: true },
    { title: 'Search & filter IDPs', text: 'By style, budget, size and duration (#2)', href: '/filter-idps.html', ready: true },
    { title: 'Recommended for you', text: 'Projects similar to your favourites (#1)', href: '/recommendations.html', ready: true },
    { title: 'My favourites', text: 'Compare the IDPs you saved (#7)', href: '/my-favourites.html', ready: true },
    { title: 'Contact a designer', text: 'Discuss your renovation ideas' },
    { title: 'My Consultations', text: 'View and cancel consultation bookings (#3)', href: '/my-consultations.html', ready: true
},
  ],
  'Platform Manager': [
    { title: 'Connected customers', text: 'Customers who contacted designers (#25)', href: '/metrics.html', ready: true },
    { title: 'IDP interaction rate', text: 'Views and customer interactions for each IDP', href: '/idp-interaction-rate.html', ready: true },
    { title: 'Reports', text: 'Daily, weekly and monthly reports' },
    { title: 'IDP categories', text: 'Manage the preset tags' },
  ],
  'User Admin': [
    { title: 'License verification', text: 'Review Interior Designer license applications', href: '/admin-verifications.html', ready: true },
    { title: 'User accounts', text: 'Create, view, update and suspend accounts', href: '/user-accounts.html', ready: true },
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
