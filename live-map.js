(() => {
  'use strict';
  const API='https://bot-ark-production-a0afb716.up.railway.app';
  const types={ally:{label:'Allies',color:'#00dce8'},friendly:{label:'Friends',color:'#2673ff'},enemy:{label:'Enemies',color:'#ff334d'}};
  const normal=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  let nodes=[],revision='',geometryStamp='',status,loading=false;
  let library=[];
  function aliases(){
    const lookup=new Map();for(const [id,t] of Object.entries(TRIBE_DB))for(const name of [id,t.name,t.alias])if(name)lookup.set(normal(name),id);
    for(const [label,id] of Object.entries({n3:'n3',bng:'bng',blackandgentle:'bng',ed:'emotional_damage',hydra:'hydra','88':'8_8',oao:'oao','100yes':'100yes'}))lookup.set(label,id);
    return lookup;
  }
  function applyLibrary(){
    // A newer map may deliberately use a newer logo than the library. Its exact
    // crops take priority; library originals remain available for the saved map.
    if(revision)return;
    const lookup=aliases();let changed=false;
    for(const logo of library){
      if(!/^\/api\/logos\/assets\/[a-f0-9]{24}\.png$/.test(logo.path||''))continue;
      const label=String(logo.name||'').replace(/^\d{1,2}_/,'').replace(/[_ -]logo.*$/i,'');
      const id=TRIBE_DB[logo.tribe_id]?logo.tribe_id:lookup.get(normal(label));
      if(id&&TRIBE_DB[id]&&TRIBE_DB[id].logo!==API+logo.path){TRIBE_DB[id].logo=API+logo.path;changed=true;}
    }
    if(changed){renderQuickTrackedList();if(TRIBE_DB[currentTribe])window.selectTribe(currentTribe,{preserveServer:true});}
  }
  async function syncLibrary(){
    try{const response=await fetch(API+'/api/logos',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)return;const data=await response.json();if(Array.isArray(data.items)){library=data.items;applyLibrary();}}catch{}
  }
  function prepare(data){
    if(!data||!Array.isArray(data.nodes)||!Array.isArray(data.edges)||!/^\w{20}$/.test(data.revision)||!data.image_path?.startsWith('/api/map/assets/'+data.revision+'/'))throw Error('Invalid map');
    const lookup=aliases(),idMap=new Map(),seen=new Set();
    const newNodes=data.nodes.map(n=>{
      if(!/^[a-z0-9_]{1,64}$/.test(n.id)||typeof n.name!=='string'||n.name.length>80||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!Number.isFinite(n.size)||n.x<0||n.x>100||n.y<0||n.y>100||n.size<.5||n.size>25)throw Error('Invalid node');
      const id=n.group?'group_'+n.id:(lookup.get(normal(n.name))||lookup.get(normal(n.id))||'live_'+n.id);
      if(seen.has(id))throw Error('Duplicate tribe');seen.add(id);idMap.set(n.id,id);return {...n,id};
    });
    const newEdges=data.edges.map(e=>{if(!idMap.has(e.from)||!idMap.has(e.to)||!types[e.type])throw Error('Invalid line');return {...e,from:idMap.get(e.from),to:idMap.get(e.to)};});
    return {newNodes,newEdges};
  }
  async function sync(){
    if(loading)return;loading=true;
    try{
      const response=await fetch(API+'/api/map?format=2',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const data=await response.json();
      if(!data.map){status.textContent=data.sync_status==='keeping_previous_map'?'New map could not be read reliably · Showing saved map':'Automatic map sync enabled · Showing saved map while the latest post is processed';return;}
      const map=data.map;
      const pending=map.geometry_status==='pending',stamp=(map.geometry_status||'ready')+':'+(map.updated_at||'');
      if(map.revision!==revision||stamp!==geometryStamp){
        const {newNodes,newEdges}=prepare(map),image=new Image();image.src=API+map.image_path;await image.decode();
        if(pending){
          const img=document.getElementById('static-map-img');img.src=image.src;img.width=map.width;img.height=map.height;
          nodes=[];revision=map.revision;geometryStamp=stamp;window.RaptorMap.setNodes([]);
        }else{
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
        nodes=newNodes;revision=map.revision;geometryStamp=stamp;window.RaptorMap.setNodes(nodes);renderQuickTrackedList();
        applyLibrary();
        if(TRIBE_DB[currentTribe])window.selectTribe(currentTribe,{preserveServer:true});
        }
      }
      status.replaceChildren(el('span',`Map published ${new Date(map.published_at).toLocaleString()} · ${pending?'New image loaded · Interactive logos are being updated':nodes.filter(n=>!n.group).length+' tribes'} · `));
      const source=el('a','Discord source ↗');source.href='https://discord.com/channels/1343348944427815013/1343693976317988935/'+map.source_url.split('/').pop();source.target='_blank';source.rel='noopener noreferrer';status.append(source);
      if(data.sync_status==='keeping_previous_map')status.append(el('span',' · Keeping this version: newer map needs a clearer reading'));
    }catch{status.textContent='Showing last loaded map · Automatic sync will retry';}
    finally{loading=false;}
  }
  function idMapName(source,node){return normal(source.name)===normal(node.name);}
  document.addEventListener('DOMContentLoaded',()=>{
    nodes=MAP_NODES.map(n=>({...n,name:TRIBE_DB[n.id]?.name}));
    status=el('p','Checking latest Tribe Map post…');status.className='map-sync-status';status.setAttribute('role','status');
    document.getElementById('map-viewport').before(status);
    const refresh=el('button','Refresh map');refresh.type='button';refresh.className='map-refresh';refresh.addEventListener('click',sync);status.after(refresh);
    sync();syncLibrary();setInterval(()=>{if(!document.hidden)sync();},30000);
    setInterval(()=>{if(!document.hidden)syncLibrary();},600000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
    window.addEventListener('focus',sync);window.addEventListener('pageshow',sync);window.addEventListener('online',sync);
  });
})();
