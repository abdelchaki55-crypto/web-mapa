(() => {
  'use strict';
  if(location.pathname.endsWith('/chat.html')||document.getElementById('raptor-chat-widget'))return;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const root=el('div');root.id='raptor-chat-widget';
  const greeting=el('div','raptor-chat-greeting'),words=el('span','', 'ask me anything');
  greeting.hidden=true;
  const dismiss=el('button','greeting-dismiss','×');dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss chat greeting');
  greeting.append(words,dismiss);
  const launcher=el('button','raptor-chat-launcher');launcher.type='button';launcher.setAttribute('aria-label','Open Raptor AI chat');launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','raptor-chat-panel');
  const avatar=el('img','launcher-avatar');avatar.src='logo.jpg';avatar.alt='';avatar.width=46;avatar.height=46;
  const label=el('span','launcher-label');label.append(el('strong','','Ask Raptor'),el('small','','AI CHAT'));
  const spark=el('span','launcher-spark','✦');spark.setAttribute('aria-hidden','true');launcher.append(avatar,label,spark);
  const panel=el('section','raptor-chat-panel');panel.id='raptor-chat-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','raptor-widget-title');
  const header=el('div','raptor-widget-header'),brand=el('div','raptor-widget-brand'),mini=avatar.cloneNode();mini.className='widget-avatar';
  const title=el('div');const heading=el('h2','','Raptor assistant');heading.id='raptor-widget-title';title.append(heading,el('p','','Gemini · Discord sources'));brand.append(mini,title);
  const actions=el('div','widget-header-actions'),full=el('a','','↗');full.href='chat.html';full.target='_blank';full.rel='noopener';full.setAttribute('aria-label','Open full chat');
  const close=el('button','','×');close.type='button';close.setAttribute('aria-label','Close chat');actions.append(full,close);header.append(brand,actions);
  const body=el('div','widget-frame-wrap'),loading=el('p','widget-loading','Connecting to Raptor…');loading.setAttribute('role','status');body.append(loading);panel.append(header,body);
  root.append(greeting,panel,launcher);document.body.append(root);
  let frame=null,isOpen=false;
  function rememberGreeting(){greeting.hidden=true;try{sessionStorage.setItem('rn_chat_greeted','1');}catch{}}
  function setOpen(value){
    isOpen=value;panel.hidden=!value;launcher.setAttribute('aria-expanded',String(value));launcher.setAttribute('aria-label',value?'Minimize Raptor AI chat':'Open Raptor AI chat');rememberGreeting();
    if(value){
      if(!frame){frame=el('iframe','raptor-chat-frame');frame.title='Raptor AI chat';frame.src='chat.html?embedded=1';frame.addEventListener('load',()=>{loading.hidden=true;frame.classList.add('ready');if(isOpen)frame.contentWindow?.document.getElementById('chat-question')?.focus();});body.append(frame);}
      else close.focus();
    }else launcher.focus();
  }
  launcher.addEventListener('click',()=>setOpen(!isOpen));close.addEventListener('click',()=>setOpen(false));dismiss.addEventListener('click',rememberGreeting);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen)setOpen(false);});
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame?.contentWindow&&event.data?.type==='raptor-chat-close')setOpen(false);});
  let greeted=false;try{greeted=sessionStorage.getItem('rn_chat_greeted')==='1';}catch{}
  if(!greeted)setTimeout(()=>{if(!isOpen){greeting.hidden=false;greeting.classList.add('greeting-visible');}},1600);
})();
