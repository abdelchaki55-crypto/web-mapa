(() => {
  'use strict';
  const API = 'https://bot-ark-production-a0afb716.up.railway.app';
  const NS = 'http://www.w3.org/2000/svg';
  const PERIODS = {'6h':'6 hours','24h':'24 hours','7d':'7 days'};
  let selectedServer = '', period = '24h', tribe = '', controller, panel, select, status, stats, chart, detail;
  let lastFetch = 0, requestNumber = 0;
  function node(tag, attrs={}, text) {
    const el=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([key,value])=>el.setAttribute(key,String(value)));
    if(text !== undefined) el.textContent=text;
    return el;
  }
  function timeLabel(date, long=false) {
    return new Date(date).toLocaleString(undefined,long ? {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'} : {hour:'2-digit',minute:'2-digit'});
  }
  function draw(data) {
    chart.replaceChildren(); detail.textContent=''; stats.replaceChildren();
    const points = data.points.filter(p=>Number.isFinite(Date.parse(p.timestamp)) && Number.isFinite(p.players));
    if(!points.length) {
      status.textContent='No readings yet for this period. History starts when collection is enabled; check again in a few minutes.';
      return;
    }
    for(const [label,value] of [['Minimum',data.stats.min],['Maximum',data.stats.max],['Average',data.stats.average]]) {
      const span=document.createElement('span');span.append(label+': ');
      const strong=document.createElement('strong');strong.textContent=value+' players';span.append(strong);stats.append(span);
    }
    const first=timeLabel(data.first_sample,true), last=timeLabel(data.last_sample,true);
    const age=Date.now()-Date.parse(data.last_sample);
    status.textContent=`${data.sample_count} readings · First: ${first} · Last: ${last}${age>15*60000 ? ' · Data is delayed' : ''}${data.persistent ? '' : ' · Temporary storage: history may reset on redeploy'}`;
    const svg=node('svg',{viewBox:'0 0 900 260',role:'img','aria-label':`Server ${selectedServer} population over ${PERIODS[period]}`,class:'history-chart'});
    svg.append(node('title',{},`Player history for server ${selectedServer}`));
    svg.append(node('desc',{},'Times use your device timezone. Gaps indicate missing readings. Focus a point and use the arrow keys to inspect readings.'));
    const start=Date.parse(data.from), end=Date.parse(data.to), left=45, right=880, top=16, bottom=222;
    const ymax=Math.max(10,...points.map(p=>Math.max(p.capacity,p.max,p.players)));
    const x=p=>left+(Date.parse(p.timestamp)-start)/(end-start)*(right-left);
    const y=value=>bottom-value/ymax*(bottom-top);
    for(let i=0;i<=4;i++) {
      const value=Math.round(ymax*i/4), yy=y(value);
      svg.append(node('line',{x1:left,y1:yy,x2:right,y2:yy,class:'history-grid'}));
      svg.append(node('text',{x:left-8,y:yy+4,'text-anchor':'end'},value));
    }
    for(let i=0;i<=4;i++) {
      const timestamp=start+(end-start)*i/4;
      svg.append(node('text',{x:left+(right-left)*i/4,y:bottom+25,'text-anchor':i===0?'start':i===4?'end':'middle'},timeLabel(timestamp,period==='7d')));
    }
    let path='';
    points.forEach((p,i)=>{
      const gap=i && Date.parse(p.timestamp)-Date.parse(points[i-1].timestamp)>data.bucket_seconds*2;
      path+=`${i===0||gap?'M':'L'}${x(p).toFixed(2)},${y(p.players).toFixed(2)} `;
    });
    svg.append(node('path',{d:path,class:'history-line'}));
    const circles=[];
    points.forEach((p,i)=>{
      const label=`${timeLabel(p.timestamp,true)} · ${p.players} players${p.min!==p.max?` (range ${p.min}–${p.max})`:''}`;
      const circle=node('circle',{cx:x(p),cy:y(p.players),r:3,tabindex:i===0?'0':'-1','aria-label':label});
      circle.append(node('title',{},label));
      const inspect=()=>detail.textContent=label;
      circle.addEventListener('pointerenter',inspect);circle.addEventListener('pointerdown',inspect);circle.addEventListener('focus',inspect);
      circle.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();
        const next=e.key==='Home'?0:e.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,i+(e.key==='ArrowRight'?1:-1)));
        circles.forEach((c,index)=>c.setAttribute('tabindex',index===next?'0':'-1'));circles[next].focus();
      });
      circles.push(circle);svg.append(circle);
    });
    chart.append(svg);
  }
  async function loadHistory() {
    if(!panel)return;
    controller?.abort();controller=new AbortController();
    const activeController=controller;
    const sequence=++requestNumber;
    chart.replaceChildren();stats.replaceChildren();detail.textContent='';
    panel.setAttribute('aria-busy','true');
    if(!selectedServer) {status.textContent='This tribe has no assigned servers.';panel.setAttribute('aria-busy','false');return;}
    status.textContent=`Loading history for server #${selectedServer}…`;
    const timer=setTimeout(()=>activeController.abort(),15000);
    try {
      const response=await fetch(`${API}/api/history/${encodeURIComponent(selectedServer)}?period=${period}`,{signal:activeController.signal,cache:'no-store'});
      if(!response.ok)throw new Error(response.status===404?'not-deployed':'unavailable');
      const data=await response.json();
      if(sequence!==requestNumber)return;
      if(!Array.isArray(data.points) || !Number.isFinite(Date.parse(data.from)) || !Number.isFinite(Date.parse(data.to)) || Date.parse(data.to)<=Date.parse(data.from))throw new Error('invalid');
      draw(data);lastFetch=Date.now();
    } catch(error) {
      if(sequence!==requestNumber)return;
      status.textContent=error.message==='not-deployed' ? 'The history service is being enabled. Please try again shortly.' : 'History is temporarily unavailable. Use Refresh to try again.';
    } finally {
      clearTimeout(timer);
      if(sequence===requestNumber)panel.setAttribute('aria-busy','false');
    }
  }
  function addServerButtons() {
    document.querySelectorAll('#ui-server-breakdown > div').forEach(card=>{
      const label=card.querySelector('span');
      const id=label?.textContent.match(/^#(\d+)$/)?.[1];
      if(!id || card.querySelector('.history-server-button'))return;
      const button=document.createElement('button');button.type='button';button.className='history-server-button';button.textContent='📈 History';button.setAttribute('aria-label',`View population history for server ${id}`);
      button.addEventListener('click',()=>{selectedServer=id;select.value=id;loadHistory();panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});});
      card.append(button);
    });
  }
  function updateTribe(id, force=false) {
    if(!panel)return;
    const servers=[...new Set(getTribeServers(id).map(raw=>parseServerToken(raw).cleanNum).filter(n=>/^\d{1,5}$/.test(n)))];
    const changed=tribe!==id || !servers.includes(selectedServer);
    tribe=id; if(changed)selectedServer=servers[0]||'';
    select.replaceChildren();
    servers.forEach(server=>{const option=document.createElement('option');option.value=server;option.textContent=`#${server}`;select.append(option);});
    select.value=selectedServer;select.disabled=!servers.length;
    document.getElementById('history-title').textContent=`Player history · ${TRIBE_DB[id].name}`;
    addServerButtons();
    if(changed||force||Date.now()-lastFetch>60000)loadHistory();
  }
  const previousSelect=window.selectTribe;
  window.selectTribe=function(id){previousSelect(id);if(TRIBE_DB[id])updateTribe(id);};
  document.addEventListener('DOMContentLoaded',()=>{
    panel=document.createElement('section');panel.className='server-history';panel.setAttribute('aria-labelledby','history-title');
    // All interpolated server and tribe values are assigned with textContent.
    panel.innerHTML='<div class="history-header"><h3 id="history-title">Player history</h3><div class="history-controls"><label>Server <select id="history-server"></select></label><div class="history-ranges" role="group" aria-label="History period"></div><button id="history-refresh" type="button">Refresh</button></div></div><div class="history-stats"></div><p class="history-message" role="status" aria-live="polite"></p><div class="history-chart-wrap"></div><p class="history-point-detail" aria-live="polite"></p><p class="history-note">Readings every 5 minutes · Times use your device timezone · 7-day view uses 15-minute averages · Missing readings appear as gaps.</p>';
    document.querySelector('.bottom-panel > div').after(panel);
    select=panel.querySelector('select');status=panel.querySelector('.history-message');stats=panel.querySelector('.history-stats');chart=panel.querySelector('.history-chart-wrap');detail=panel.querySelector('.history-point-detail');
    const ranges=panel.querySelector('.history-ranges');
    for(const [value,label] of Object.entries(PERIODS)) {
      const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(period===value));
      button.addEventListener('click',()=>{period=value;ranges.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));loadHistory();});ranges.append(button);
    }
    select.addEventListener('change',()=>{selectedServer=select.value;loadHistory();});
    panel.querySelector('#history-refresh').addEventListener('click',loadHistory);
    updateTribe(currentTribe,true);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && Date.now()-lastFetch>60000)loadHistory();});
  });
})();
