(() => {
  'use strict';
  const normal=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  let servers=[],loaded=false,available=false,selected='',mode='all',input,results,detail;
  function associations(id){return Object.entries(TRIBE_DB).filter(([key])=>getTribeServers(key).some(raw=>parseServerToken(raw).cleanNum===id));}
  function population(server){return Number.isFinite(server.players)&&server.players>=0&&Number.isFinite(server.capacity)&&server.capacity>0?`${server.players} / ${server.capacity} online`:'Population unavailable';}
  function tribeButton(id,tribe){
    const button=el('button',undefined,'directory-result directory-tribe');button.type='button';
    if(tribe.logo){const image=el('img');image.src=tribe.logo;image.alt='';image.addEventListener('error',()=>image.remove(),{once:true});button.append(image);}
    const text=el('span',undefined,'directory-result-text');text.append(el('strong',tribe.name),el('small',`${getTribeServers(id).length} assigned servers · ${tribe.offMap?'Outside latest map':'On the map'}`));button.append(text);
    button.addEventListener('click',()=>window.RaptorMap.showDetails(id));return button;
  }
  function showServer(id){
    const server=servers.find(s=>s.id===id);if(!server)return;
    selected=id;detail.hidden=false;detail.replaceChildren();
    const top=el('div',undefined,'directory-server-header'),text=el('div');
    text.append(el('h2','Server #'+id),el('p',server.name));top.append(text);
    const close=el('button','×','directory-close');close.type='button';close.setAttribute('aria-label','Close server details');close.addEventListener('click',()=>{selected='';detail.hidden=true;input.focus();});top.append(close);detail.append(top);
    detail.append(el('p',population(server),'directory-population'));
    if(!available)detail.append(el('p','Last received population · Live update is temporarily unavailable.','directory-muted'));
    else if(server.updated&&Date.now()-server.updated>180000)detail.append(el('p','Population update is delayed.','directory-muted'));
    const linked=associations(id);detail.append(el('h3','Tribes associated in this website'));
    const group=el('div',undefined,'directory-associated');
    if(linked.length)linked.forEach(([key,tribe])=>group.append(tribeButton(key,tribe)));
    else group.append(el('p','No tribe association recorded for this server.','directory-muted'));
    detail.append(group,el('p','Associations come from this site’s records; they do not identify every tribe or player on the server.','directory-muted'));
    const history=el('button','View player history →','directory-history');history.type='button';history.addEventListener('click',()=>window.RaptorHistory.showServer(id));detail.append(history);
  }
  function render(){
    if(!input)return;
    const raw=input.value.trim().replace(/^(server|servidor)\s*#?\s*/i,'').replace(/^#/,'');
    const query=normal(raw);results.replaceChildren();results.hidden=!query;
    if(!query){window.RaptorMap?.highlight([]);return;}
    const numeric=/^\d+$/.test(query),serverQuery=numeric?String(Number(query)):query;
    const tribes=Object.entries(TRIBE_DB).filter(([id,t])=>normal(`${t.name} ${t.alias||''} ${id}`).includes(query));
    const found=servers.filter(s=>numeric?s.id.includes(serverQuery):normal(s.name).includes(query)).sort((a,b)=>(b.id===serverQuery)-(a.id===serverQuery)||Number(a.id)-Number(b.id));
    window.RaptorMap?.highlight(tribes.map(([id])=>id));
    function section(title,items,build){
      const box=el('section',undefined,'directory-section');box.append(el('h2',`${title} (${items.length})`));
      const list=el('div',undefined,'directory-result-grid');items.slice(0,12).forEach(item=>list.append(build(item)));box.append(list);
      if(items.length>12)box.append(el('p',`Showing 12 of ${items.length}. Refine your search to find more.`,'directory-muted'));
      results.append(box);
    }
    if(mode!=='tribes'){
      if(found.length)section('Servers',found,s=>{
        const button=el('button',undefined,'directory-result directory-server');button.type='button';
        const text=el('span',undefined,'directory-result-text');text.append(el('strong','#'+s.id),el('small',s.name));button.append(text,el('span',population(s),'directory-count'));
        button.addEventListener('click',()=>showServer(s.id));return button;
      });
      else if(!loaded||!available)results.append(el('p',loaded?'Server lookup is temporarily unavailable. Previously received results remain searchable.':'Loading the official server list…','directory-muted'));
    }
    if(mode!=='servers'&&tribes.length)section('Tribes',tribes,([id,t])=>tribeButton(id,t));
    if(!results.childElementCount)results.append(el('p','No matching servers or tribes. Try a server number or part of a tribe name.','directory-muted'));
  }
  document.addEventListener('raptor-servers-updated',event=>{
    loaded=true;available=Boolean(event.detail.available);
    if(available){
      const unique=new Map();
      for(const source of event.detail.servers||[]){
        const name=String(source.Name||source.SessionName||source.name||''),upper=name.toUpperCase();
        if(!upper.includes('-PVP-')||['SMALLTRIBES','CONSOLES','ARKPOCALYPSE','MODDED','CLUBARK','BEGINNER','ISOLATED'].some(t=>upper.includes(t)))continue;
        const match=name.match(/(\d+)(?:\s*-\s*\(v[^)]+\))?$/);if(!match)continue;
        const stamp=Number(source.LastUpdated);
        unique.set(match[1],{id:match[1],name,players:Number(source.NumPlayers??source.players??NaN),capacity:Number(source.MaxPlayers??source.maxPlayers??NaN),updated:Number.isFinite(stamp)&&stamp>0?stamp*1000:0});
      }
      servers=[...unique.values()];
    }
    render();if(selected)showServer(selected);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    input=document.getElementById('map-search');results=document.getElementById('map-search-results');detail=document.getElementById('directory-server-detail');
    input.addEventListener('input',render);
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape'){input.value='';selected='';detail.hidden=true;render();}
      if(event.key==='Enter'){const first=results.querySelector('button');if(first){event.preventDefault();first.click();}}
      if(event.key==='ArrowDown'){const first=results.querySelector('button');if(first){event.preventDefault();first.focus();}}
    });
    document.querySelectorAll('[data-directory-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.directoryMode;document.querySelectorAll('[data-directory-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
    const previous=renderQuickTrackedList;renderQuickTrackedList=function(){previous();render();};
  });
})();
