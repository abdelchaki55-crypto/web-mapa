(() => {
  'use strict';
  const data=window.ARK_TOOLS_DATA, $=id=>document.getElementById(id), number=new Intl.NumberFormat();
  const recipeById=new Map(data.recipes.map(r=>[r.id,r]));
  const tiers=new Map(data.kibble.map(k=>[k.id,k]));
  const KEY='rn_tools_v1';
  let queue=[], selectedKibble='extraordinary', mode='direct', polymer='crafted';
  function count(value,minimum=1,maximum=100000){
    const n=Number(value);
    return String(value).trim()!=='' && Number.isSafeInteger(n) && n>=minimum && n<=maximum ? n : null;
  }
  try {
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved && Array.isArray(saved.queue)) {
      queue=saved.queue.filter(row=>recipeById.has(row.id) && count(row.quantity)!==null).slice(0,data.recipes.length);
      mode=saved.mode==='raw'?'raw':'direct';polymer=saved.polymer==='organic'?'organic':'crafted';
    }
  } catch {}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({queue,mode,polymer}));}catch{}}
  let messageTimer;
  function message(text){$('tools-message').textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>{$('tools-message').textContent='';},5000);}
  function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  function itemImage(recipe,size=''){
    const shell=element('span',undefined,'item-picture '+size);
    const unavailable=()=>{shell.replaceChildren(element('span','No image','item-image-missing'));shell.setAttribute('aria-label','Image unavailable for '+recipe.name);};
    if(!recipe.image){unavailable();return shell;}
    const img=element('img');img.src=recipe.image;img.alt=recipe.name;img.width=64;img.height=64;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',unavailable,{once:true});shell.append(img);return shell;
  }
  function calculate(rows,raw=false,organic=false){
    const totals=Object.create(null);
    function add(name,quantity,trail=[]){
      if(raw && organic && name==='Polymer'){totals['Organic Polymer']=(totals['Organic Polymer']||0)+quantity;return;}
      const parts=raw && data.components[name];
      if(parts){
        if(trail.includes(name))throw new Error('Circular recipe');
        for(const [part,qty] of Object.entries(parts))add(part,quantity*qty,[...trail,name]);
      } else totals[name]=(totals[name]||0)+quantity;
    }
    for(const row of rows){const recipe=recipeById.get(row.id);if(!recipe || count(row.quantity)===null)throw new Error('Invalid crafting quantity');for(const [name,qty] of Object.entries(recipe.ingredients))add(name,qty*row.quantity);}
    return totals;
  }
  window.ARK_TOOLS={calculate,count};
  function renderMaterials(){
    const totals=calculate(queue,mode==='raw',polymer==='organic');
    $('materials').replaceChildren();$('recipe-sources').replaceChildren();
    for(const [name,total] of Object.entries(totals).sort(([a],[b])=>a.localeCompare(b))){
      const row=element('tr');row.dataset.material=name;
      const label=element('td',name),amount=element('td');amount.append(element('strong',number.format(total)));row.append(label,amount);$('materials').append(row);
    }
    $('queue-summary').textContent=queue.length?`For all ${queue.length} selected ${queue.length===1?'item':'items'} · ${mode==='raw'?'Basic resources':'Recipe ingredients'}`:'Choose an item on the left to get started.';
    $('copy-materials').disabled=!queue.length;
    if(!queue.length){const row=element('tr'),cell=element('td','Your totals will appear here.');cell.colSpan=2;row.append(cell);$('materials').append(row);}
    for(const id of new Set(queue.map(r=>r.id))){const recipe=recipeById.get(id),a=element('a',`${recipe.name} recipe ↗`);a.href=recipe.source;a.target='_blank';a.rel='noopener noreferrer';$('recipe-sources').append(a);}
    if(mode==='raw')for(const [name,page] of [['Electronics','Electronics'],['Polymer','Polymer'],['Metal','Metal_Ingot'],['Paste','Cementing_Paste']]){const a=element('a',name+' breakdown ↗');a.href='https://ark.wiki.gg/wiki/'+page;a.target='_blank';a.rel='noopener noreferrer';$('recipe-sources').append(a);}
  }
  function renderQueue(){
    $('queue').replaceChildren();
    $('queue-count').textContent=queue.length;
    $('clear-queue').hidden=!queue.length;
    queue.forEach((row,index)=>{
      const div=element('div',undefined,'queue-row'),name=element('span',recipeById.get(row.id).name),quantity=element('input'),remove=element('button','×');
      quantity.type='number';quantity.min='1';quantity.max='100000';quantity.step='1';quantity.value=row.quantity;
      quantity.setAttribute('aria-label','Number of crafts for '+recipeById.get(row.id).name);
      quantity.addEventListener('input',()=>{const n=count(quantity.value);quantity.setCustomValidity(n===null?'Enter a whole number from 1 to 100,000.':'');if(n!==null){row.quantity=n;save();renderMaterials();}});
      quantity.addEventListener('change',()=>{if(count(quantity.value)===null)quantity.reportValidity();});
      remove.type='button';remove.setAttribute('aria-label','Remove '+recipeById.get(row.id).name);
      remove.addEventListener('click',()=>{queue.splice(index,1);save();renderQueue();});
      const item=element('div',undefined,'queue-item');item.append(itemImage(recipeById.get(row.id),'small'),name);div.append(item,quantity,remove);$('queue').append(div);
    });
    if(!queue.length){const empty=element('div',undefined,'queue-empty');empty.append(element('span','+'),element('strong','Your list is empty'),element('p','Pick an item and press “Add item”.'));$('queue').append(empty);}
    renderMaterials();
  }
  function switchSection(id,focus=false){
    const active=document.querySelector(`[role=tab][data-section="${id}"]`);if(!active)return;
    document.querySelectorAll('[role=tab]').forEach(tab=>{const selected=tab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;$(tab.getAttribute('aria-controls')).hidden=!selected;});
    if(focus)active.focus();history.replaceState(null,'','#'+id);
  }
  const tabs=[...document.querySelectorAll('[role=tab]')];
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>switchSection(tab.dataset.section));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
      switchSection(tabs[next].dataset.section,true);
    });
  });
  const categories=[...new Set(data.recipes.map(r=>r.category))].sort();
  for(const category of categories){const option=element('option',category);option.value=category;$('craft-category').append(option);}
  $('clear-queue').addEventListener('click',()=>{queue=[];save();renderQueue();message('Your list has been cleared.');});
  const popularNames=['Auto Turret','Heavy Turret','Tek Turret','Advanced Rifle Bullet','Metal Foundation','Metal Wall','Industrial Forge','Fabricator','Pump-Action Shotgun','Rex Saddle','Cryopod','Vault'];
  let currentMatches=[],resultLimit=12;
  function renderChoices(){
    const query=$('craft-search').value.trim().toLowerCase(),category=$('craft-category').value,previous=$('craft-item').value;
    const matches=data.recipes.filter(r=>(category==='all'||r.category===category)&&r.name.toLowerCase().includes(query));
    $('craft-item').replaceChildren();
    for(const recipe of matches){const option=element('option',recipe.name);option.value=recipe.id;$('craft-item').append(option);}
    if(matches.some(r=>r.id===previous))$('craft-item').value=previous;
    else if(!query&&category==='all'&&matches.some(r=>r.id==='auto'))$('craft-item').value='auto';
    const browsing=!query&&category==='all';
    $('catalogue-count').textContent=browsing?'Popular items · select a picture to choose':`${number.format(matches.length)} ${matches.length===1?'item':'items'} found`;
    $('craft-item').disabled=!matches.length;document.querySelector('#queue-form button[type=submit]').disabled=!matches.length;
    if(!matches.length){const option=element('option','No matching recipes');option.value='';$('craft-item').append(option);}
    currentMatches=browsing?[...popularNames.map(name=>matches.find(r=>r.name===name)).filter(Boolean),...matches.filter(r=>!popularNames.includes(r.name))]:matches;resultLimit=browsing?6:12;
    $('item-results').hidden=false;
    renderResultCards();renderSelectedRecipe();
  }
  function renderResultCards(){
    const root=$('item-results');root.replaceChildren();
    if(root.hidden){$('more-items').hidden=true;return;}
    for(const recipe of currentMatches.slice(0,resultLimit)){
      const button=element('button',undefined,'item-result');button.type='button';button.dataset.recipe=recipe.id;button.setAttribute('aria-pressed',String(recipe.id===$('craft-item').value));
      const label=element('span',undefined,'item-result-name');label.append(element('strong',recipe.name),element('small',recipe.category));button.append(itemImage(recipe),label);
      const selected=element('span',recipe.id===$('craft-item').value?'✓ Selected':'Select item','item-result-action');button.append(selected);
      button.addEventListener('click',()=>{$('craft-item').value=recipe.id;renderSelectedRecipe();if(matchMedia('(max-width: 760px)').matches)document.querySelector('.craft-builder').scrollIntoView({behavior:'smooth',block:'center'});});root.append(button);
    }
    if(!currentMatches.length)root.append(element('p','No matching items. Try another name or category.','hint'));
    $('more-items').hidden=currentMatches.length<=resultLimit;$('more-items').textContent='Show more items';
  }
  $('more-items').addEventListener('click',()=>{resultLimit+=12;renderResultCards();});
  function renderSelectedRecipe(){
    const recipe=recipeById.get($('craft-item').value),preview=$('selected-recipe');preview.replaceChildren();
    if(!recipe){$('selection-instruction').textContent='No matching item. Try another search.';return;}
    $('selection-instruction').textContent='Choose how many times to craft this recipe.';
    const text=element('div'),title=element('strong',recipe.name);text.append(element('small',recipe.category),title);
    const details=element('details'),summary=element('summary','Recipe for 1 craft');details.append(summary);
    const list=element('p',Object.entries(recipe.ingredients).map(([name,qty])=>`${number.format(qty)} × ${name}`).join(' · '));details.append(list);text.append(details);preview.append(itemImage(recipe,'large'),text);
    $('item-results').querySelectorAll('button').forEach(button=>{const selected=button.dataset.recipe===recipe.id;button.setAttribute('aria-pressed',String(selected));button.querySelector('.item-result-action').textContent=selected?'✓ Selected':'Select item';});
  }
  $('craft-search').addEventListener('input',renderChoices);$('craft-category').addEventListener('change',renderChoices);$('craft-item').addEventListener('change',renderSelectedRecipe);
  renderChoices();
  $('queue-form').addEventListener('submit',event=>{
    event.preventDefault();const quantity=count($('craft-quantity').value),id=$('craft-item').value;
    const input=$('craft-quantity');input.setCustomValidity(quantity===null?'Choose a whole quantity between 1 and 100,000.':'');
    if(quantity===null){input.reportValidity();return;}
    if(!recipeById.has(id)){message('Choose an item first.');return;}
    const existing=queue.find(row=>row.id===id);
    if(existing && existing.quantity+quantity>100000){message('Limit: 100,000 of each item per queue.');return;}
    if(existing)existing.quantity+=quantity;else queue.push({id,quantity});
    save();renderQueue();message(`${number.format(quantity)} crafts of ${recipeById.get(id).name} added. Your materials are ready.`);
    const button=document.querySelector('#queue-form button[type=submit]');button.textContent='✓ Added to your list';clearTimeout(button.resetTimer);button.resetTimer=setTimeout(()=>{button.textContent='+ Add item';},1800);
  });
  $('craft-quantity').addEventListener('input',()=> $('craft-quantity').setCustomValidity(''));
  $('resource-mode').value=mode;$('polymer-mode').value=polymer;$('polymer-option').hidden=mode!=='raw';
  $('resource-mode').addEventListener('change',()=>{mode=$('resource-mode').value;$('polymer-option').hidden=mode!=='raw';save();renderMaterials();});
  $('polymer-mode').addEventListener('change',()=>{polymer=$('polymer-mode').value;save();renderMaterials();});
  $('copy-materials').addEventListener('click',async()=>{
    const totals=calculate(queue,mode==='raw',polymer==='organic');
    if(!Object.keys(totals).length){message('Add items before copying a list.');return;}
    const text=['Raptor News · Crafting list',...queue.map(r=>`${r.quantity} crafts × ${recipeById.get(r.id).name}`),'',mode==='raw'?'BASIC MATERIALS EXPANDED':'CRAFTING COMPONENTS',...Object.entries(totals).sort(([a],[b])=>a.localeCompare(b)).map(([name,total])=>`${name}: ${total}`)].join('\n');
    try{await navigator.clipboard.writeText(text);message('Material list copied.');}catch{
      let field=$('manual-copy');if(!field){field=element('textarea');field.id='manual-copy';field.setAttribute('aria-label','Material list: select and copy');$('tools-message').after(field);}field.value=text;field.focus();field.select();message('Select and copy the list below.');
    }
  });
  function renderKibble(){
    const info=tiers.get(selectedKibble),input=$('kibble-quantity'),quantity=count(input.value);
    input.setCustomValidity(quantity===null?'Choose a whole quantity between 1 and 100,000.':'');
    $('kibble-ingredients').replaceChildren();$('kibble-title').textContent=info.name+' Kibble';$('egg-size').textContent=info.egg.toUpperCase();
    $('kibble-source').href='https://ark.wiki.gg/wiki/'+info.name+'_Kibble';
    $('kibble-tiers').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tier===selectedKibble)));
    if(quantity===null){$('kibble-ingredients').append(element('p','Enter a whole quantity from 1 to 100,000.','hint'));return;}
    for(const [name,amount] of Object.entries(info.ingredients)){const div=element('div',undefined,'ingredient');div.append(element('strong',number.format(amount*quantity)),element('span',name));$('kibble-ingredients').append(div);}
  }
  for(const tier of data.kibble){
    const button=element('button');button.type='button';button.dataset.tier=tier.id;button.style.setProperty('--tier',tier.color);button.append(element('span',undefined,'tier-dot'),element('span',tier.name));
    button.addEventListener('click',()=>{selectedKibble=tier.id;renderKibble();});$('kibble-tiers').append(button);
  }
  $('kibble-quantity').addEventListener('input',renderKibble);
  renderQueue();renderKibble();
  if(['crafting','kibble'].includes(location.hash.slice(1)))switchSection(location.hash.slice(1));
})();

