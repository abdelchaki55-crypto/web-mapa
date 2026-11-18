const MAP_NODES = [{"id": "bvs", "x": 13.0714, "y": 5.7143, "size": 4.7143}, {"id": "lvsd", "x": 23.1429, "y": 5.7143, "size": 4.5714}, {"id": "suicide_squad", "x": 36.5714, "y": 9.5238, "size": 6.1429}, {"id": "wdc", "x": 44.5714, "y": 9.6508, "size": 5.2857}, {"id": "sru", "x": 51.7143, "y": 5.7143, "size": 4.8571}, {"id": "hydra", "x": 51.7143, "y": 18.4127, "size": 5.0}, {"id": "adat", "x": 84.2143, "y": 5.4603, "size": 5.4286}, {"id": "emotional_damage", "x": 90.9286, "y": 5.3333, "size": 5.5714}, {"id": "chillin", "x": 96.8571, "y": 5.0794, "size": 4.1429}, {"id": "dalg", "x": 85.2857, "y": 17.7778, "size": 3.7143}, {"id": "bd", "x": 91.4286, "y": 17.6508, "size": 3.8571}, {"id": "irr", "x": 96.8571, "y": 17.0159, "size": 4.0}, {"id": "llc", "x": 16.2857, "y": 31.746, "size": 5.2857}, {"id": "ceo", "x": 28.4286, "y": 41.2698, "size": 8.4286}, {"id": "auto_decay", "x": 16.1429, "y": 49.5238, "size": 4.7143}, {"id": "tpg", "x": 5.5714, "y": 51.5556, "size": 5.1429}, {"id": "dtc", "x": 28.5, "y": 65.0159, "size": 5.7143}, {"id": "8_8", "x": 36.3571, "y": 69.3333, "size": 5.5714}, {"id": "oblock", "x": 47.5, "y": 73.1429, "size": 6.2857}, {"id": "oz", "x": 64.9286, "y": 24.381, "size": 4.8571}, {"id": "most_wanted", "x": 73.7143, "y": 28.1905, "size": 6.7143}, {"id": "boom_evil", "x": 59.5, "y": 42.4127, "size": 8.2857}, {"id": "goon_puff", "x": 79.4286, "y": 43.1746, "size": 5.7143}, {"id": "woah_woah", "x": 76.4286, "y": 56.254, "size": 4.0}, {"id": "sk", "x": 83.3571, "y": 53.8413, "size": 3.5714}, {"id": "123_human", "x": 95.9286, "y": 60.0635, "size": 5.0}, {"id": "nbt", "x": 87.0, "y": 68.0635, "size": 5.7143}, {"id": "n3", "x": 4.4286, "y": 80.8889, "size": 6.8571}, {"id": "100yes", "x": 12.3571, "y": 83.3016, "size": 7.8571}, {"id": "bng", "x": 19.5714, "y": 90.9206, "size": 6.2857}, {"id": "st6", "x": 81.0, "y": 90.6667, "size": 5.4286}, {"id": "wldd", "x": 88.1429, "y": 88.6349, "size": 7.2857}, {"id": "oao", "x": 96.3571, "y": 90.2857, "size": 6.5714}];

(() => {
  'use strict';
  // Use exact crops from the map; no expiring third-party image URLs.
  MAP_NODES.forEach(node => {
    if (TRIBE_DB[node.id]) TRIBE_DB[node.id].logo = `assets/logos/${node.id}.png`;
  });
  const originalSelect = window.selectTribe;
  const originalRender = renderQuickTrackedList;
  const buttons = new Map();
  const motion = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  function addListLogos() {
    document.querySelectorAll('#quick-tracked-list button, #offmap-tracked-list button').forEach(button => {
      const id = button.getAttribute('onclick')?.match(/selectTribe\('([^']+)'\)/)?.[1];
      const info = TRIBE_DB[id];
      const title = button.querySelector('span');
      if (!info?.logo || !title || title.parentElement.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = info.logo; img.alt = ''; img.className = 'quick-tribe-logo';
      img.addEventListener('error', () => img.remove(), {once: true});
      const group = document.createElement('span'); group.className = 'quick-tribe-title';
      title.replaceWith(group); group.append(img, title);
    });
  }
  renderQuickTrackedList = function() { originalRender(); addListLogos(); };
  window.selectTribe = function(id) {
    if (!TRIBE_DB[id]) return;
    originalSelect(id);
    document.dispatchEvent(new CustomEvent('raptor-tribe-selected',{detail:{id}}));
    buttons.forEach((button, key) => button.setAttribute('aria-pressed', String(key === id)));
    const status = document.getElementById('map-selection');
    if (status) status.textContent = `Selected: ${TRIBE_DB[id].name} · ${TRIBE_DB[id].bloc}`;
    const avatar = document.querySelector('#ui-avatar-box img');
    if (avatar) avatar.addEventListener('error', () => {
      avatar.parentElement.textContent = TRIBE_DB[id].name.slice(0, 4).toUpperCase();
    }, {once:true});
  };
  function showDetails(id) {
    window.selectTribe(id);
    if (document.body.classList.contains('screenshot-mode')) window.toggleBottomPanel();
    const panel = document.querySelector('.bottom-panel');
    panel.classList.add('map-detail-focus');
    const heading = document.getElementById('ui-tribe-name');
    heading.tabIndex = -1;
    heading.focus({preventScroll:true});
    panel.scrollIntoView({behavior:motion(),block:'start'});
  }
  document.addEventListener('DOMContentLoaded', () => {
    const layer = document.getElementById('map-hotspots');
    function rebuildNodes(nodes) {
    layer.replaceChildren();buttons.clear();
    nodes.filter(node=>!node.group).forEach(node => {
      const info = TRIBE_DB[node.id];
      if (!info) return;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'map-hotspot';
      button.style.left = `${node.x}%`; button.style.top = `${node.y}%`; button.style.width = `${node.size}%`;
      button.title = info.name; button.setAttribute('aria-label', `View ${info.name} tribe details`);
      button.setAttribute('aria-controls','ui-tribe-name');
      button.setAttribute('aria-pressed',String(currentTribe === node.id));
      button.addEventListener('click', () => showDetails(node.id));
      layer.append(button); buttons.set(node.id,button);
    });
    }
    rebuildNodes(MAP_NODES);
    window.RaptorMap={setNodes:rebuildNodes,showDetails};
    const search = document.getElementById('map-search');
    const results = document.getElementById('map-search-results');
    const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    search.addEventListener('input',()=>{
      const query = normalize(search.value);
      results.replaceChildren(); results.hidden = !query;
      const matches = Object.entries(TRIBE_DB).filter(([id,info]) => query && normalize(`${info.name} ${info.alias||''} ${id}`).includes(query));
      buttons.forEach((button,id)=>button.classList.toggle('search-match', matches.some(([key])=>key===id)));
      matches.forEach(([id,info])=>{
        const button = document.createElement('button'); button.type='button';button.className='tribe-result';
        if (info.logo) {const img=document.createElement('img');img.src=info.logo;img.alt='';button.append(img);}
        const name=document.createElement('span');name.textContent=info.name;button.append(name);
        button.addEventListener('click',()=>showDetails(id));results.append(button);
      });
      if(query && !matches.length) results.textContent='No tribes found.';
    });
    search.addEventListener('keydown',event=>{
      if(event.key==='Escape'){search.value='';search.dispatchEvent(new Event('input'));}
      if(event.key==='Enter'){const first=results.querySelector('button');if(first){event.preventDefault();first.click();}}
    });
    window.selectTribe(currentTribe);
  });
})();
