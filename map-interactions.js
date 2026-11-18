(() => {
  'use strict';
  const REVISION='685a9abcf440033c26b1',NS='http://www.w3.org/2000/svg';
  // Reviewed against this exact 1920 × 1080 PNG. Values are logo centers and diameters.
  const points={bvs:[252,61,90],lvsd:[445,61,90],suicide_squad:[701,108,120],wdc:[855,104,106],sru:[995,61,94],hydra:[991,196,96],adat:[1619,61,104],ed:[1745,58,106],chillin:[1862,57,80],dalg:[1630,185,80],bd:[1756,186,80],irr:[1867,181,80],llc:[313,344,100],ceo:[546,448,166],tpg:[108,555,98],auto_decay:[311,533,90],dtc:[546,703,108],gang_8_8:[696,748,104],oblock:[912,792,120],oz:[1244,264,94],most_wanted:[1415,307,128],boom_evil:[1141,459,156],goon_puff:[1525,463,108],woah_woah:[1466,607,76],sk:[1601,581,68],nbt:[1673,732,100],'123_human':[1844,653,96],n3:[86,876,128],'100_yes':[239,897,154],bng:[375,984,126],st6:[1565,980,106],wldd:[1700,958,142],oao:[1856,971,128]};
  const paths=[
    ['bvs','lvsd','ally',295,61,400,61],
    ['group_bcs','group_fta','enemy',1130,145,1550,145],
    ['ceo','group_bcs','friendly',613,412,865,288,'PVP ONLY'],
    ['llc','ceo','ally',357,366,472,412],['llc','auto_decay','ally',312,420,312,488],
    ['auto_decay','ceo','ally',352,520,467,480],['tpg','auto_decay','enemy',156,552,266,535],
    ['tpg','group_sabagge_cabagge_2','friendly',111,630,111,773],
    ['auto_decay','group_sabagge_cabagge_2','enemy',296,570,241,789],
    ['ceo','group_sabagge_cabagge_2','enemy',497,508,309,834],
    ['dtc','group_sabagge_cabagge_2','ally',520,752,407,946],
    ['ceo','dtc','friendly',547,555,547,650],['ceo','8_8','friendly',579,514,677,706],
    ['ceo','oblock','enemy',592,505,868,751],['ceo','boom_evil','enemy',625,447,1065,455],
    ['group_sabagge_cabagge_2','oblock','friendly',440,964,858,816],
    ['group_sabagge_cabagge_2','group_unnamed_group_1','friendly',447,1027,1473,1027],
    ['oblock','group_unnamed_group_1','friendly',965,804,1490,940],
    ['boom_evil','group_unnamed_group_1','enemy',1187,513,1569,855],
    ['oz','most_wanted','friendly',1285,280,1357,299],
    ['boom_evil','most_wanted','friendly',1212,433,1360,350,'PVP ONLY'],
    ['boom_evil','goon_puff','friendly',1218,463,1472,463],
    ['boom_evil','woah_woah','friendly',1214,486,1432,591],
    ['sk','nbt','ally',1618,610,1667,705],['123_human','nbt','ally',1807,674,1718,724]
  ];
  const groups={group_bcs:['suicide_squad','wdc','sru','hydra'],group_fta:['adat','emotional_damage','chillin','dalg','bd','irr'],group_sabagge_cabagge_2:['n3','100yes','bng'],group_unnamed_group_1:['st6','wldd','oao']};
  const labels={ally:'Allies',friendly:'Friendly',enemy:'Enemies'};
  let info,layer;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function review(map){
    if(map.revision!==REVISION)return map;
    return {...map,nodes:map.nodes.map(n=>points[n.id]?{...n,x:points[n.id][0]/19.2,y:points[n.id][1]/10.8,size:points[n.id][2]/19.2}:n.id==='unnamed_group_1'?{...n,name:'WLDD / ST6 / O.A.O'}:n)};
  }
  function clear(){layer?.remove();layer=null;if(info){info.replaceChildren();info.hidden=true;}}
  function showRelation(edge,nodes,pinned=false){
    const lookup=new Map(nodes.map(n=>[n.id,n])),a=lookup.get(edge[0]),b=lookup.get(edge[1]);if(!a||!b)return;
    const groupName=n=>groups[n.id]&&n.name==='Unnamed coalition'?'WLDD / ST6 / O.A.O':n.name;
    const title=`${groupName(a)} ↔ ${groupName(b)} · ${labels[edge[2]]}${edge[7]?' · '+edge[7]:''}`;
    info.replaceChildren(el('strong',title));
    const ids=[...new Set([a,b].flatMap(n=>n.group?(groups[n.id]||[]):[n.id]))];
    for(const id of ids){const tribe=lookup.get(id);if(!tribe||tribe.group)continue;const button=el('button',tribe.name);button.type='button';button.addEventListener('click',()=>window.RaptorMap.showDetails(id));info.append(button);}
    const close=el('button','×');close.type='button';close.className='map-relation-close';close.setAttribute('aria-label','Close relationship details');close.addEventListener('click',()=>{info.hidden=true;});info.append(close);info.hidden=false;
  }
  function render(map,nodes,edges){
    clear();if(map.geometry_status==='pending')return;
    if(!info){info=el('div');info.className='map-relation-info';info.hidden=true;info.setAttribute('aria-live','polite');document.getElementById('map-viewport').before(info);}
    layer=document.createElementNS(NS,'svg');layer.id='map-line-targets';layer.setAttribute('viewBox',`0 0 ${map.width} ${map.height}`);layer.setAttribute('preserveAspectRatio','none');layer.setAttribute('aria-label','Relationships drawn in the map');
    // Unknown images only use explicit endpoint geometry; no center-to-group guesses.
    const active=map.revision===REVISION?paths:edges.filter(e=>e.start&&e.end).map(e=>[e.from,e.to,e.type,e.start.x*map.width/100,e.start.y*map.height/100,e.end.x*map.width/100,e.end.y*map.height/100,e.qualifier]);
    const lookup=new Map(nodes.map(n=>[n.id,n]));
    for(const edge of active){if(!lookup.has(edge[0])||!lookup.has(edge[1])||!labels[edge[2]])continue;
      const line=document.createElementNS(NS,'line');for(const [key,value] of Object.entries({x1:edge[3],y1:edge[4],x2:edge[5],y2:edge[6]}))line.setAttribute(key,value);
      line.classList.add('map-line-target');line.dataset.from=edge[0];line.dataset.to=edge[1];line.dataset.type=edge[2];line.setAttribute('tabindex','0');line.setAttribute('role','button');
      const title=`${lookup.get(edge[0]).name} ↔ ${lookup.get(edge[1]).name} · ${labels[edge[2]]}${edge[7]?' · '+edge[7]:''}`;
      line.setAttribute('aria-label',title);const tip=document.createElementNS(NS,'title');tip.textContent=title;line.append(tip);
      line.addEventListener('click',()=>showRelation(edge,nodes,true));line.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showRelation(edge,nodes,true);}if(event.key==='Escape')info.hidden=true;});
      layer.append(line);
    }
    document.getElementById('map-stage').insertBefore(layer,document.getElementById('map-hotspots'));
  }
  window.RaptorMapInteractions={review,render,clear};
})();
