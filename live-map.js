(() => {
  'use strict';
  const API='https://bot-ark-production-a0afb716.up.railway.app', NS='http://www.w3.org/2000/svg';
  const types={ally:{label:'Allies',color:'#00dce8'},friendly:{label:'Friends',color:'#2673ff'},enemy:{label:'Enemies',color:'#ff334d'}};
  // Connections visible in the bundled map. Group membership is not an invented line.
  const baseline=[['bvs','lvsd','ally'],['llc','auto_decay','ally'],['llc','ceo','ally'],['auto_decay','ceo','ally'],['tpg','auto_decay','enemy'],['ceo','boom_evil','enemy'],['ceo','dtc','friendly'],['ceo','8_8','friendly'],['ceo','oblock','enemy'],['ceo','100yes','enemy'],['dtc','bng','ally'],['bng','oblock','friendly'],['oblock','wldd','friendly'],['bng','wldd','friendly'],['boom_evil','most_wanted','friendly','PVP ONLY'],['oz','most_wanted','friendly'],['boom_evil','goon_puff','friendly'],['boom_evil','woah_woah','friendly'],['boom_evil','wldd','enemy'],['sk','nbt','ally'],['nbt','123_human','ally']].map(([from,to,type,qualifier=''])=>({from,to,type,qualifier}));
  const normal=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  let nodes=[],edges=[],revision='',selected='',showAll=true,svg,toolbar,info,status,loading=false;
  const enabled=new Set(Object.keys(types));
  let library=[];
  let animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{if(localStorage.getItem('rn_map_motion')==='off')animate=false;}catch{}
  function draw(){
    const lookup=new Map(nodes.map(n=>[n.id,n]));svg.replaceChildren();
    svg.classList.toggle('animate-lines',animate);
    for(const edge of edges){
      const a=lookup.get(edge.from),b=lookup.get(edge.to);if(!a||!b||!types[edge.type])continue;
      const connected=!selected||edge.from===selected||edge.to===selected;
      const g=document.createElementNS(NS,'g');g.classList.add('map-connection');g.dataset.type=edge.type;
      g.classList.toggle('muted',!connected);g.hidden=!enabled.has(edge.type)||(!showAll&&!connected);
      if(g.hidden)continue;
      const title=`${a.name||TRIBE_DB[a.id]?.name||a.id} ↔ ${b.name||TRIBE_DB[b.id]?.name||b.id} · ${types[edge.type].label}${edge.qualifier?' · '+edge.qualifier:''}`;
      const hit=document.createElementNS(NS,'line');
      for(const [k,v] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y}))hit.setAttribute(k,v);
      hit.setAttribute('class','connection-hit');hit.setAttribute('tabindex','0');hit.setAttribute('role','button');hit.setAttribute('aria-label',title);
      const line=hit.cloneNode(false);line.removeAttribute('tabindex');line.removeAttribute('role');line.removeAttribute('aria-label');line.setAttribute('class','connection-visible');line.style.stroke=types[edge.type].color;
      const tip=document.createElementNS(NS,'title');tip.textContent=title;hit.append(tip);
      const reveal=()=>{info.replaceChildren(el('strong',title));for(const node of [a,b]){if(node.group)continue;const button=el('button','View '+(node.name||TRIBE_DB[node.id]?.name));button.type='button';button.addEventListener('click',()=>window.RaptorMap.showDetails(node.id));info.append(button);}info.hidden=false;};
      hit.addEventListener('click',reveal);hit.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reveal();}});
      g.append(line,hit);svg.append(g);
    }
  }
  function aliases(){
    const lookup=new Map();for(const [id,t] of Object.entries(TRIBE_DB))for(const name of [id,t.name,t.alias])if(name)lookup.set(normal(name),id);
    for(const [label,id] of Object.entries({n3:'n3',bng:'bng',blackandgentle:'bng',ed:'emotional_damage',hydra:'hydra','88':'8_8',oao:'oao','100yes':'100yes'}))lookup.set(label,id);
    return lookup;
  }
  function applyLibrary(){
    const lookup=aliases();let changed=false;
    for(const logo of library){
      if(!/^\/api\/logos\/assets\/[a-f0-9]{24}\.png$/.test(logo.path||''))continue;
      const label=String(logo.name||'').replace(/^\d{1,2}_/,'').replace(/[_ -]logo.*$/i,'');
      const id=TRIBE_DB[logo.tribe_id]?logo.tribe_id:lookup.get(normal(label));
      if(id&&TRIBE_DB[id]&&TRIBE_DB[id].logo!==API+logo.path){TRIBE_DB[id].logo=API+logo.path;changed=true;}
    }
    if(changed){renderQuickTrackedList();if(TRIBE_DB[currentTribe])window.selectTribe(currentTribe);}
  }
  async function syncLibrary(){
    try{const response=await fetch(API+'/api/logos',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)return;const data=await response.json();if(Array.isArray(data.items)){library=data.items;applyLibrary();}}catch{}
  }
  function prepare(data){
    if(!data||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!/^\w{20}$/.test(data.revision)||!data.image_path?.startsWith('/api/map/assets/'+data.revision+'/'))throw Error('Invalid map');
    const lookup=aliases(),idMap=new Map(),seen=new Set();
    const newNodes=data.nodes.map(n=>{
      if(!/^[a-z0-9_]{1,64}$/.test(n.id)||typeof n.name!=='string'||n.name.length>80||/[<>"'`\\]/.test(n.name)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!Number.isFinite(n.size)||n.x<0||n.x>100||n.y<0||n.y>100||n.size<.5||n.size>25)throw Error('Invalid node');
      const id=n.group?'group_'+n.id:(lookup.get(normal(n.name))||lookup.get(normal(n.id))||'live_'+n.id);
      if(seen.has(id))throw Error('Duplicate tribe');seen.add(id);idMap.set(n.id,id);return {...n,id};
    });
    const newEdges=data.edges.map(e=>{if(!idMap.has(e.from)||!idMap.has(e.to)||!types[e.type])throw Error('Invalid line');return {...e,from:idMap.get(e.from),to:idMap.get(e.to)};});
    return {newNodes,newEdges};
  }
  async function sync(){
    if(loading)return;loading=true;
    try{
      const response=await fetch(API+'/api/map',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const data=await response.json();
      if(!data.map){status.textContent=data.sync_status==='keeping_previous_map'?'New map could not be read reliably · Showing saved map':'Automatic map sync enabled · Showing saved map while the latest post is processed';return;}
      const map=data.map;
      if(map.revision!==revision){
        const {newNodes,newEdges}=prepare(map),image=new Image();image.src=API+map.image_path;await image.decode();
        // Commit the bitmap, hotspots, logos and relationships in one render.
        for(const node of newNodes){
          if(node.group)continue;
          const source=map.nodes.find(n=>n.id===node.id||idMapName(n,node)),old=TRIBE_DB[node.id];
          if(!old)TRIBE_DB[node.id]={name:node.name,alias:'',bloc:node.bloc||'Map tribe',crown:node.crown,defaultServers:[],enemies:[],friendly:[],allies:[]};
          const tribe=TRIBE_DB[node.id];tribe.bloc=node.bloc||tribe.bloc;tribe.crown=node.crown;tribe.offMap=false;
          if(source)tribe.logo=API+`/api/map/assets/${map.revision}/${source.id}.png`;
          tribe.allies=[];tribe.friendly=[];tribe.enemies=[];
        }
        for(const edge of newEdges)for(const [id,other] of [[edge.from,edge.to],[edge.to,edge.from]]){
          const tribe=TRIBE_DB[id],target=newNodes.find(n=>n.id===other);if(tribe&&target)tribe[{ally:'allies',friendly:'friendly',enemy:'enemies'}[edge.type]].push(target.name+(edge.qualifier?' ('+edge.qualifier+')':''));
        }
        const mapped=new Set(newNodes.filter(n=>!n.group).map(n=>n.id));
        Object.entries(TRIBE_DB).forEach(([id,t])=>{if(!mapped.has(id)){t.offMap=true;t.allies=[];t.friendly=[];t.enemies=[];t.bloc='Not present in latest map';}});
        const img=document.getElementById('static-map-img');img.src=image.src;img.width=map.width;img.height=map.height;
        nodes=newNodes;edges=newEdges;revision=map.revision;info.replaceChildren();info.hidden=true;window.RaptorMap.setNodes(nodes);draw();renderQuickTrackedList();
        applyLibrary();
        if(TRIBE_DB[currentTribe])window.selectTribe(currentTribe);
      }
      status.replaceChildren(el('span',`Map published ${new Date(map.published_at).toLocaleString()} · ${nodes.filter(n=>!n.group).length} tribes · ${edges.length} relationships · `));
      const source=el('a','Discord source ↗');source.href='https://discord.com/channels/1343348944427815013/1343693976317988935/'+map.source_url.split('/').pop();source.target='_blank';source.rel='noopener noreferrer';status.append(source);
      if(data.sync_status==='keeping_previous_map')status.append(el('span',' · Keeping this version: newer map needs a clearer reading'));
    }catch{status.textContent='Showing last loaded map · Automatic sync will retry';}
    finally{loading=false;}
  }
  function idMapName(source,node){return normal(source.name)===normal(node.name);}
  document.addEventListener('DOMContentLoaded',()=>{
    nodes=MAP_NODES.map(n=>({...n,name:TRIBE_DB[n.id]?.name}));edges=baseline;
    const stage=document.getElementById('map-stage');svg=document.createElementNS(NS,'svg');svg.id='map-relationships';svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label','Interactive tribe relationships');stage.insertBefore(svg,document.getElementById('map-hotspots'));
    toolbar=el('div');toolbar.className='relationship-toolbar';toolbar.setAttribute('aria-label','Relationship filters');
    for(const [type,detail] of Object.entries(types)){const button=el('button',detail.label);button.type='button';button.style.setProperty('--line-color',detail.color);button.setAttribute('aria-pressed','true');button.addEventListener('click',()=>{enabled.has(type)?enabled.delete(type):enabled.add(type);button.setAttribute('aria-pressed',String(enabled.has(type)));draw();});toolbar.append(button);}
    const focus=el('button','Selected tribe only');focus.type='button';focus.setAttribute('aria-pressed','false');focus.addEventListener('click',()=>{showAll=!showAll;focus.setAttribute('aria-pressed',String(!showAll));draw();});toolbar.append(focus);
    const motion=el('button','Animate lines');motion.type='button';motion.setAttribute('aria-pressed',String(animate));motion.addEventListener('click',()=>{animate=!animate;motion.setAttribute('aria-pressed',String(animate));try{localStorage.setItem('rn_map_motion',animate?'on':'off');}catch{}draw();});toolbar.append(motion);
    info=el('div');info.className='relationship-info';info.hidden=true;info.setAttribute('aria-live','polite');
    status=el('p','Checking latest Tribe Map post…');status.className='map-sync-status';status.setAttribute('role','status');
    document.getElementById('map-viewport').before(toolbar,info,status);
    document.addEventListener('raptor-tribe-selected',event=>{selected=event.detail.id;draw();});
    selected=currentTribe;draw();sync();syncLibrary();setInterval(()=>{if(!document.hidden)sync();},120000);
    setInterval(()=>{if(!document.hidden)syncLibrary();},600000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
  });
})();
