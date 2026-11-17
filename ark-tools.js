(() => {
  'use strict';
  const data=window.ARK_TOOLS_DATA, $=id=>document.getElementById(id), number=new Intl.NumberFormat();
  const recipeById=new Map(data.recipes.map(r=>[r.id,r]));
  const tiers=new Map(data.kibble.map(k=>[k.id,k]));
  const KEY='rn_tools_v1';
  let queue=[{id:'auto',quantity:100}], stock=Object.create(null), selectedKibble='extraordinary', mode='direct', polymer='crafted';
  function count(value,minimum=1,maximum=100000){
    const n=Number(value);
    return String(value).trim()!=='' && Number.isSafeInteger(n) && n>=minimum && n<=maximum ? n : null;
  }
  try {
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved && Array.isArray(saved.queue)) {
      queue=saved.queue.filter(row=>recipeById.has(row.id) && count(row.quantity)!==null).slice(0,20);
      if(saved.stock && typeof saved.stock==='object')for(const [key,value] of Object.entries(saved.stock))if(count(value,0,1e9)!==null)stock[key]=Number(value);
      mode=saved.mode==='raw'?'raw':'direct';polymer=saved.polymer==='organic'?'organic':'crafted';
    }
  } catch {}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({queue,stock,mode,polymer}));}catch{}}
  function message(text){$('tools-message').textContent=text;}
  function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
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
      const label=element('td',name),amount=element('td',number.format(total)),have=element('td'),missing=element('td');
      const remaining=element('strong',number.format(Math.max(0,total-(stock[name]||0))));missing.append(remaining);
      const input=element('input');input.type='number';input.min='0';input.max='1000000000';input.step='1';input.value=stock[name]||0;input.setAttribute('aria-label',`${name} already in stock`);
      input.addEventListener('input',()=>{
        const value=count(input.value,0,1e9);
        input.setCustomValidity(value===null?'Enter a whole number from 0 to 1,000,000,000.':'');
        if(value===null){remaining.textContent='—';return;}
        stock[name]=value;remaining.textContent=number.format(Math.max(0,total-value));save();
      });have.append(input);row.append(label,amount,have,missing);$('materials').append(row);
    }
    const items=queue.reduce((sum,r)=>sum+r.quantity,0);
    $('queue-summary').textContent=queue.length?`${number.format(items)} items · ${Object.keys(totals).length} material types · ${mode==='raw'?'Expanded to raw resources':'Direct crafting ingredients'}`:'Your queue is empty. Add an item to start.';
    if(!queue.length){const row=element('tr'),cell=element('td','No materials yet.');cell.colSpan=4;row.append(cell);$('materials').append(row);}
    for(const id of new Set(queue.map(r=>r.id))){const recipe=recipeById.get(id),a=element('a',`${recipe.name} recipe ↗`);a.href=recipe.source;a.target='_blank';a.rel='noopener noreferrer';$('recipe-sources').append(a);}
    if(mode==='raw')for(const [name,page] of [['Electronics','Electronics'],['Polymer','Polymer'],['Metal','Metal_Ingot'],['Paste','Cementing_Paste']]){const a=element('a',name+' breakdown ↗');a.href='https://ark.wiki.gg/wiki/'+page;a.target='_blank';a.rel='noopener noreferrer';$('recipe-sources').append(a);}
  }
  function renderQueue(){
    $('queue').replaceChildren();
    queue.forEach((row,index)=>{
      const div=element('div',undefined,'queue-row'),name=element('span',recipeById.get(row.id).name),quantity=element('strong','× '+number.format(row.quantity)),remove=element('button','×');
      remove.type='button';remove.setAttribute('aria-label','Remove '+recipeById.get(row.id).name);
      remove.addEventListener('click',()=>{queue.splice(index,1);save();renderQueue();});
      div.append(name,quantity,remove);$('queue').append(div);
    });
    if(!queue.length)$('queue').append(element('p','Add your first item above.','hint'));
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
  for(const recipe of data.recipes){const option=element('option',recipe.name);option.value=recipe.id;$('craft-item').append(option);}
  $('queue-form').addEventListener('submit',event=>{
    event.preventDefault();const quantity=count($('craft-quantity').value),id=$('craft-item').value;
    const input=$('craft-quantity');input.setCustomValidity(quantity===null?'Choose a whole quantity between 1 and 100,000.':'');
    if(quantity===null){input.reportValidity();return;}
    const existing=queue.find(row=>row.id===id);
    if(existing && existing.quantity+quantity>100000){message('Limit: 100,000 of each item per queue.');return;}
    if(existing)existing.quantity+=quantity;else queue.push({id,quantity});
    save();renderQueue();message('Crafting queue updated.');
  });
  $('craft-quantity').addEventListener('input',()=> $('craft-quantity').setCustomValidity(''));
  $('resource-mode').value=mode;$('polymer-mode').value=polymer;$('polymer-option').hidden=mode!=='raw';
  $('resource-mode').addEventListener('change',()=>{mode=$('resource-mode').value;$('polymer-option').hidden=mode!=='raw';save();renderMaterials();});
  $('polymer-mode').addEventListener('change',()=>{polymer=$('polymer-mode').value;save();renderMaterials();});
  $('copy-materials').addEventListener('click',async()=>{
    const totals=calculate(queue,mode==='raw',polymer==='organic');
    if(!Object.keys(totals).length){message('Add items before copying a list.');return;}
    const invalid=[...$('materials').querySelectorAll('input')].find(i=>!i.checkValidity());if(invalid){invalid.reportValidity();return;}
    const text=['Raptor News · Crafting list',...queue.map(r=>`${r.quantity} × ${recipeById.get(r.id).name}`),'',mode==='raw'?'RAW MATERIALS':'CRAFTING COMPONENTS',...Object.entries(totals).sort(([a],[b])=>a.localeCompare(b)).map(([name,total])=>`${name}: ${Math.max(0,total-(stock[name]||0))} still needed (${total} total)`)].join('\n');
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
