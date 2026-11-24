(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let members = [], animation, running = true, filtered = [], limit = 100, columns, duration = 1, start = 0, distance = 1;
  const canvas = $('stars'), context = canvas.getContext('2d');
  function drawStars() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 1701;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < rect.width * rect.height / 1100; i++) {
      const x = random() * rect.width, y = random() * rect.height, radius = random() * 1.2 + .2;
      context.fillStyle = `rgba(210,224,255,${random() * .65 + .12})`;
      context.beginPath(); context.arc(x, y, radius, 0, 2 * Math.PI); context.fill();
    }
  }
  function updatePlay() { $('play').textContent = running ? 'Pause' : 'Play'; $('play').setAttribute('aria-label', running ? 'Pause credits' : 'Play credits'); }
  function progress() { return animation ? Math.min(1, Math.max(0, Number(animation.currentTime || 0) / duration)) : 0; }
  function seek(ratio) { if (animation) { animation.currentTime = Math.max(0, Math.min(1, ratio)) * duration; updatePosition(); } }
  function updatePosition() {
    if (!animation) return;
    $('progress').value = Math.round(progress() * 1000);
    $('position').textContent = `${Math.round(progress() * 100)}% OF THE JOURNEY`;
  }
  function layout() {
    if (!members.length) return;
    const previous = progress(), nextColumns = innerWidth <= 700 ? 2 : 3;
    if (columns !== nextColumns) {
      columns = nextColumns;
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < members.length; i += columns) {
        const row = document.createElement('div'); row.className = 'credit-row';
        members.slice(i, i + columns).forEach((member, offset) => {
          const el = document.createElement('span'); el.className = 'credit-name';
          el.textContent = member.name; el.dataset.index = i + offset; row.append(el);
        });
        fragment.append(row);
      }
      $('credit-names').replaceChildren(fragment);
    }
    animation?.cancel();
    start = 0;
    distance = $('crawl').scrollHeight + start;
    duration = distance / 33 * 1000;
    animation = $('crawl').animate([{transform: `translateY(${start}px)`}, {transform: `translateY(${-$('crawl').scrollHeight}px)`}], {duration, fill: 'both', easing: 'linear'});
    animation.pause(); animation.currentTime = previous * duration;
    animation.playbackRate = Number($('speed').value);
    animation.onfinish = () => { running = false; updatePlay(); updatePosition(); };
    if (running && !document.hidden) animation.play();
    updatePosition();
  }
  function jump(index) {
    const el = $('credit-names').querySelector(`[data-index="${index}"]`);
    if (!el) return;
    document.querySelector('.credit-name.highlight')?.classList.remove('highlight'); el.classList.add('highlight');
    // Use untransformed layout offsets, unaffected by the perspective projection.
    let y = 0, current = el.parentElement;
    while (current && current !== $('crawl')) { y += current.offsetTop; current = current.offsetParent; }
    seek((start + y - $('stage').clientHeight * .48) / distance);
    if (running && !document.hidden) animation.play();
    document.querySelector('.cinema').scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'center'});
  }
  function showResults() {
    const query = $('member-search').value.trim().toLocaleLowerCase();
    filtered = members.map((m, index) => ({...m, index})).filter(m => !query || m.name.toLocaleLowerCase().includes(query));
    $('result-count').textContent = `${filtered.length.toLocaleString()} ${query ? 'matches' : 'members'}`;
    const fragment = document.createDocumentFragment();
    for (const member of filtered.slice(0, limit)) {
      const button = document.createElement('button'); button.type = 'button';
      const number = document.createElement('span'); number.textContent = String(member.index + 1).padStart(3, '0');
      button.append(number, document.createTextNode(member.name)); button.addEventListener('click', () => jump(member.index)); fragment.append(button);
    }
    if (!filtered.length) { const p = document.createElement('p'); p.textContent = 'No survivors match that name.'; fragment.append(p); }
    $('search-results').replaceChildren(fragment); $('more').hidden = filtered.length <= limit;
  }
  function directory(open) { $('directory').hidden = !open; $('view-toggle').setAttribute('aria-pressed', String(open)); $('view-toggle').textContent = open ? 'Hide member list ↗' : 'View member list ↗'; if (open) showResults(); }
  $('play').addEventListener('click', () => { running = !running; if (running) { if (progress() >= 1) seek(0); if (!document.hidden) animation?.play(); } else animation?.pause(); updatePlay(); });
  $('restart').addEventListener('click', () => { seek(0); if (running) animation?.play(); });
  $('rewind').addEventListener('click', () => seek(progress() - 10000 / duration));
  $('forward').addEventListener('click', () => seek(progress() + 10000 / duration));
  $('speed').addEventListener('change', () => { if (animation) animation.playbackRate = Number($('speed').value); });
  $('progress').addEventListener('input', () => seek(Number($('progress').value) / 1000));
  $('view-toggle').addEventListener('click', () => directory($('directory').hidden));
  $('member-search').addEventListener('input', () => { limit = 100; directory(true); });
  $('more').addEventListener('click', () => { limit += 100; showResults(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) animation?.pause(); else if (running) animation?.play(); });
  reduced.addEventListener('change', event => { if (event.matches) { running = false; animation?.pause(); directory(true); updatePlay(); } });
  let resize;
  addEventListener('resize', () => { clearTimeout(resize); resize = setTimeout(() => { drawStars(); layout(); }, 200); });
  setInterval(updatePosition, 350);
  async function load() {
    $('loading').hidden = false; $('loading').textContent = 'Gathering the survivors…';
    try {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
      let response;
      try { response = await fetch('https://bot-ark-production-a0afb716.up.railway.app/api/community/members', {cache: 'no-store', signal: controller.signal}); } finally { clearTimeout(timeout); }
      if (!response.ok) throw Error('Community unavailable');
      const data = await response.json();
      if (!Array.isArray(data.members) || !data.members.length) throw Error('Community not ready');
      members = data.members.filter(m => typeof m.name === 'string' && m.name.trim());
      const staff = document.createElement('div'); staff.className = 'staff-credits';
      for (const [title, names] of [['Owners', ['KiddJr', 'Raydark', 'vellita']], ['Admins', ['HB', 'Error']], ['Mods', (data.moderators || []).map(m => m.name)]]) {
        const section = document.createElement('section'), heading = document.createElement('h2'); heading.textContent = title; section.append(heading);
        for (const name of names) { const line = document.createElement('p'); line.textContent = name; section.append(line); }
        if (!names.length && title === 'Mods') { const line = document.createElement('p'); line.textContent = 'Moderator roster syncing…'; section.append(line); }
        staff.append(section);
      }
      $('credit-names').before(staff);
      $('member-count').textContent = members.length.toLocaleString();
      $('sync-status').textContent = `${data.status === 'stale' ? 'Last saved roster' : 'Raptor News Discord'} · ${members.length.toLocaleString()} members · Bots excluded · ${new Date(data.updated_at).toLocaleString()}`;
      await document.fonts.ready;
      layout(); $('loading').hidden = true; $('play').disabled = false; $('restart').disabled = false; $('progress').disabled = false;
      if (reduced.matches) directory(true);
      updatePlay();
    } catch (_) {
      $('loading').textContent = 'The community roster is temporarily unavailable.';
      const retry = document.createElement('button'); retry.textContent = 'Try again'; retry.type = 'button'; retry.addEventListener('click', load); $('loading').append(retry);
    }
  }
  drawStars(); load();
})();
