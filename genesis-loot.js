(() => {
  'use strict';const $=id=>document.getElementById(id),tiers=['gamma','beta','alpha'];
  let data,limit=6,rowLimits=new Map();
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
  function picture(item){const span=el('span',undefined,'loot-item-image');if(item.image){const image=el('img');image.src=item.image;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.width=100;image.height=100;image.onerror=()=>{span.replaceChildren(document.createTextNode('No image'))};span.append(image)}else span.textContent='No image';return span}
  function rate(value){if(value===null||value===undefined)return '—';if(value===0)return '0%';if(value<.01)return '~ <0.01%';return '~ '+value.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})+'%'}
  function featured(){const root=$('loot-featured');root.replaceChildren();for(const name of ['Rex Saddle','Stego Saddle','Pump-Action Shotgun','Mining Drill','Tek Sword','Flak Chestpiece']){const item=data.items.find(i=>i.name===name);if(!item)continue;const b=el('button',undefined,'featured-loot');b.type='button';b.append(picture(item),el('strong',item.name),el('small','Find its missions →'));b.onclick=()=>{$('loot-search').value=item.name;resetResults()};root.append(b)}}
  function resetResults(){limit=6;rowLimits.clear();render()}
  function render(){if(!data)return;const query=$('loot-search').value.trim().toLowerCase(),mission=$('loot-mission').value,difficulty=$('loot-difficulty').value,kind=Number($('loot-reward').value),visible=tiers.filter(t=>difficulty==='all'||t===difficulty);const root=$('loot-results');root.replaceChildren();
    const initial=!query&&mission==='all';$('loot-featured').hidden=!initial;$('loot-more').hidden=true;
    if(initial){$('loot-status').textContent='Pick an item below, search by name, or choose a mission.';return}
    const ids=new Set(data.items.map((item,i)=>item.name.toLowerCase().includes(query)?i:-1).filter(i=>i>=0));
    let matches=data.missions.filter(m=>mission==='all'||m.name===mission).map(m=>({...m,rows:m.rows.filter(r=>ids.has(r.item)&&visible.some(t=>r[t]&&(r[t][kind]===null||r[t][kind]>0)))})).filter(m=>m.rows.length);
    const peak=m=>Math.max(0,...m.rows.flatMap(r=>visible.map(t=>r[t]?.[kind]||0)));
    matches.sort($('loot-sort').value==='name'?(a,b)=>a.name.localeCompare(b.name):(a,b)=>peak(b)-peak(a)||a.name.localeCompare(b.name));
    const itemCount=new Set(matches.flatMap(m=>m.rows.map(r=>r.item))).size;
    $('loot-status').textContent=`${matches.length} ${matches.length===1?'mission':'missions'} · ${itemCount} matching ${itemCount===1?'item':'items'} · percentages are model estimates`;
    if(!matches.length){root.append(el('p','No matching rewards. Try another item, mission or reward filter.','loot-empty'));return}
    for(const [index,m] of matches.slice(0,limit).entries()){
      const card=el('article',undefined,'mission-card'+(index===0&&$('loot-sort').value==='chance'?' best-model':''));
      const heading=el('header',undefined,'mission-heading'),title=el('div');if(index===0&&$('loot-sort').value==='chance')title.append(el('span','HIGHEST MODEL ESTIMATE','model-best'));title.append(el('h2',m.name),el('small',m.rows.length+' matching '+(m.rows.length===1?'reward':'rewards')));heading.append(title,el('span',m.type,'mission-type'));card.append(heading);
      const table=el('table'),thead=el('thead'),tr=el('tr');tr.append(el('th','Reward'));for(const tier of visible){const th=el('th',tier[0].toUpperCase()+tier.slice(1),tier);th.scope='col';tr.append(th)}thead.append(tr);table.append(thead);
      const body=el('tbody'),rowLimit=rowLimits.get(m.name)||12;
      const sorted=m.rows.slice().sort((a,b)=>Math.max(...visible.map(t=>b[t]?.[kind]||0))-Math.max(...visible.map(t=>a[t]?.[kind]||0))||data.items[a.item].name.localeCompare(data.items[b.item].name));
      for(const row of sorted.slice(0,rowLimit)){const item=data.items[row.item],tr=el('tr');tr.dataset.item=item.name;const name=el('td'),wrap=el('div',undefined,'loot-item'),text=el('span',item.name,'loot-item-name');text.append(el('small',item.category));wrap.append(picture(item),text);name.append(wrap);tr.append(name);for(const tier of visible){const value=row[tier]?.[kind],cell=el('td');cell.append(el('strong',rate(value),'loot-rate '+(value>0?'positive':'zero')),el('span',value===null||value===undefined?'Not modeled':'Estimate','loot-rate-note'));tr.append(cell)}body.append(tr)}table.append(body);card.append(table);
      const bottom=el('div',undefined,'mission-source');if(sorted.length>rowLimit){const more=el('button','+'+(sorted.length-rowLimit)+' rewards','more-rewards');more.type='button';more.onclick=()=>{rowLimits.set(m.name,rowLimit+24);render()};bottom.append(more)}else bottom.append(el('span','Beacon · Experimental'));
      const links=el('div',undefined,'mission-sources');for(const tier of visible){const a=el('a',tier[0].toUpperCase()+tier.slice(1)+' ↗');a.href=m.sources[tier];a.target='_blank';a.rel='noopener noreferrer';a.title='Open '+tier+' source table on Beacon';links.append(a)}bottom.append(links);card.append(bottom);root.append(card)
    }
    $('loot-more').hidden=matches.length<=limit;$('loot-more').textContent='Show more missions ('+(matches.length-limit)+' remaining)';
  }
  $('loot-search').addEventListener('input',resetResults);for(const id of ['loot-mission','loot-difficulty','loot-reward','loot-sort'])$(id).addEventListener('change',resetResults);
  document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('loot-search').value=b.dataset.query;resetResults()});
  $('loot-more').onclick=()=>{limit+=6;render()};$('loot-reset').onclick=()=>{$('loot-search').value='';$('loot-mission').value='all';$('loot-difficulty').value='all';$('loot-reward').value='0';$('loot-sort').value='chance';resetResults()};
  async function load(){try{const r=await fetch('genesis-loot-data.json?v=20261124-1');if(!r.ok)throw Error();data=await r.json();for(const m of data.missions){const option=el('option',m.name);option.value=m.name;$('loot-mission').append(option)}$('loot-data-date').textContent=`Genesis Part 1 · ASA · ${data.missions.length} missions · ${data.items.length} items · Snapshot ${new Date(data.checked).toLocaleDateString()}`;featured();render()}catch{$('loot-status').textContent='Could not load the loot tables. Please refresh to try again.'}}
  load();
})();
