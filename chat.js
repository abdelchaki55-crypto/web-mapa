(() => {
  'use strict';
  const API='https://bot-ark-production-a0afb716.up.railway.app', $=id=>document.getElementById(id);
  let configured=false,busy=false,history=[],sequence=0;
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  function sourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='discord.com'&&/^\/channels\/1343348944427815013\/(1343673608421113917|1343693976317988935)(\/\d+)?$/.test(u.pathname)?u.href:null;}catch{return null;}}
  const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Date not available';};
  function buttons(){ $('ask-ai').disabled=busy||!configured;$('search-archive').disabled=busy;$('chat-question').disabled=busy; }
  async function updateStatus(){
    try{
      const r=await fetch(API+'/api/chat/status',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();
      configured=Boolean(data.configured);$('archive-sources').replaceChildren();
      for(const source of data.sources||[]){const box=el('div',undefined,'source-status'),a=el('a',source.name+' ↗'),url=sourceUrl(source.url);if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}box.append(el('small',`${source.messages.toLocaleString()} messages · ${source.complete?'History imported':'Importing older posts'}${source.available?'':' · Source delayed'}`));$('archive-sources').append(box);}
      $('archive-progress').textContent=`${Number(data.total_messages||0).toLocaleString()} archived messages · ${data.backfill_complete?'Available history imported':'Historical import in progress'}`;
      $('provider-status').textContent=configured?'Gemini connected · Answers include dated sources':'AI is awaiting server configuration. Archive search is still available.';
      buttons();
    }catch{$('archive-progress').textContent='Archive status is temporarily unavailable.';$('provider-status').textContent='Please retry shortly.';}
  }
  function addMessage(role,text){
    const root=$('chat-messages');root.querySelector('.chat-welcome')?.remove();const box=el('article',undefined,'chat-message '+role);box.append(el('h3',role==='user'?'You':'Raptor · '+(role==='search'?'Archive search':'Gemini')));const body=el('p',text,'answer-text');box.append(body);root.append(box);return {box,body};
  }
  function addSources(box,sources){
    const list=el('div',undefined,'chat-citations');
    for(const source of sources){const url=sourceUrl(source.url);if(!url)continue;const card=el('div',undefined,'chat-source'),a=el('a',(source.source_id?'['+source.source_id+'] ':'')+(source.channel||source.channel_name)+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';card.append(a,el('time',date(source.timestamp)),el('p',source.excerpt||source.content||''));list.append(card);}
    box.append(list);
  }
  const errors={not_configured:'The AI service still needs its server API key.',archive_empty:'Historical messages are still being imported. Please try again shortly.',rate_limit:'Too many questions in a short time. Please wait a minute.',daily_limit:'The public chat has reached its daily query limit. Archive search remains available.',busy:'The assistant is answering other questions. Please try again shortly.',provider_access:'Gemini could not authenticate. The site administrator needs to check the API key.',provider_quota:'Gemini has reached the account quota. Archive search remains available.',provider_unavailable:'Gemini could not complete the request. Please try again.',invalid_question:'Write a question between 2 and 1,000 characters.'};
  async function send(search=false){
    const question=$('chat-question').value.trim();if(question.length<2||question.length>1000){$('chat-notice').textContent=errors.invalid_question;return;}
    if(busy||(!search&&!configured))return;
    const seq=++sequence,prior=history.slice(-6);busy=true;buttons();$('chat-notice').textContent='';addMessage('user',question);
    const loading=el('p',search?'Searching archived messages…':'Finding sources and asking Gemini…','chat-loading');$('chat-messages').append(loading);$('chat-messages').scrollTop=$('chat-messages').scrollHeight;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);
    try{
      const response=await fetch(search?API+'/api/knowledge/search?q='+encodeURIComponent(question):API+'/api/chat',search?{signal:controller.signal,cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,history:prior}),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw Error(data.error||'unavailable');if(seq!==sequence)return;
      loading.remove();
      if(search){const items=data.items||[];const {box}=addMessage('search',items.length?`Found ${items.length} matching archived messages.`:'No matching messages found. Try a tribe name, server number or date (YYYY-MM-DD).');addSources(box,items);}
      else{const {box}=addMessage('assistant',data.answer);addSources(box,data.sources||[]);history.push({role:'user',content:question},{role:'assistant',content:data.answer});history=history.slice(-10);if(!data.archive_complete)$('chat-notice').textContent='Older messages are still being imported, so some historical information may be missing.';}
      $('chat-question').value='';$('question-count').textContent='0 / 1000';$('chat-messages').scrollTop=$('chat-messages').scrollHeight;
    }catch(error){loading.remove();$('chat-notice').textContent=errors[error.message]||'The request could not be completed. Try again or search the archive.';}
    finally{clearTimeout(timer);busy=false;buttons();$('chat-question').focus();}
  }
  $('chat-form').addEventListener('submit',e=>{e.preventDefault();send();});$('search-archive').addEventListener('click',()=>send(true));
  $('chat-question').addEventListener('input',()=>{$('question-count').textContent=$('chat-question').value.length+' / 1000';});
  document.querySelectorAll('.suggested-questions button').forEach(b=>b.addEventListener('click',()=>{$('chat-question').value=b.textContent;$('question-count').textContent=b.textContent.length+' / 1000';$('chat-question').focus();}));
  $('clear-chat').addEventListener('click',()=>{if(busy)return;history=[];$('chat-messages').replaceChildren();$('chat-notice').textContent='Conversation cleared.';});
  updateStatus();setInterval(()=>{if(!document.hidden)updateStatus();},30000);
})();
