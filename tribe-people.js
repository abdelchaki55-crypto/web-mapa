(() => {
  'use strict';
  const anchor = document.getElementById('ui-tribe-leader');
  if (!anchor) return;
  anchor.hidden = true;
  const box = document.createElement('section');
  box.className = 'tribe-people';
  box.setAttribute('aria-label', 'Known tribe people');
  anchor.closest('.flex.items-center').after(box);
  let snapshot, selected = 'boom_evil', rendered;
  const node = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  function list(parent, people) {
    const wrap = node('div', '', 'tribe-people-names');
    for (const person of people) {
      const chip = node('span', '', 'tribe-person');
      const validId = /^\d{15,22}$/.test(person.id || '');
      const name = node(validId ? 'a' : 'span', person.name);
      if (validId) {
        name.href = `https://discord.com/users/${person.id}`;
        name.target = '_blank'; name.rel = 'noopener noreferrer';
      }
      chip.append(name);
      if (/^https:\/\/discord\.com\/channels\/1343348944427815013\/1574860467569033317\/\d+$/.test(person.source || '')) {
        const source = node('a', '↗');
        source.href = person.source; source.target = '_blank'; source.rel = 'noopener noreferrer';
        source.title = 'Leader report on Discord'; source.setAttribute('aria-label', `Source for ${person.name}`);
        chip.append(source);
      }
      wrap.append(chip);
    }
    parent.append(wrap);
  }
  function render() {
    const wasOpen = rendered === selected ? box.querySelector('details')?.open : undefined;
    rendered = selected;
    box.replaceChildren();
    const tribe = snapshot?.tribes?.[selected];
    if (!tribe) {
      box.append(node('p', snapshot?.status === 'waiting' ? 'Discord people are being synchronized.' : 'Discord people unavailable for this tribe.', 'tribe-people-note'));
      return;
    }
    for (const [title, people, empty] of [
      ['Leaders', tribe.leaders, 'No confirmed leaders'],
      ['Tribe admins', tribe.admins, tribe.admin_role_configured ? 'No confirmed tribe admins' : 'No Tribe Admin role configured']
    ]) {
      box.append(node('h3', title));
      if (people.length) list(box, people);
      else box.append(node('p', empty, 'tribe-people-note'));
    }
    const details = node('details');
    details.open = wasOpen ?? (tribe.known_count ?? 0) <= 8;
    details.append(node('summary', tribe.role_linked ? `${tribe.known_count} known Discord members` : 'Known members · tribe role not linked'));
    if (tribe.members.length) list(details, tribe.members);
    else details.append(node('p', tribe.role_linked ? 'No people currently have the linked tribe role.' : 'A matching Discord tribe role is needed to count members.', 'tribe-people-note'));
    box.append(details);
    box.append(node('p', 'Discord accounts with the tribe role, including identified leaders. This is not the in-game member total.', 'tribe-people-note'));
    if (snapshot.updated_at) {
      box.append(node('p', `${snapshot.status === 'stale' ? 'Last saved data · ' : 'Updated · '}${new Date(snapshot.updated_at).toLocaleString()}`, 'tribe-people-date'));
    }
  }
  async function refresh() {
    try {
      const response = await fetch('https://bot-ark-production-a0afb716.up.railway.app/api/tribes/people', {cache: 'no-store'});
      if (!response.ok) throw Error('Directory unavailable');
      snapshot = await response.json();
    } catch (_) { if (snapshot) snapshot.status = 'stale'; }
    render();
  }
  document.addEventListener('raptor-tribe-selected', event => { selected = event.detail.id; render(); });
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 300000);
})();
