(() => {
  'use strict';
  const allowed=['arkraptornews.com','www.arkraptornews.com','abdelchaki55-crypto.github.io'];
  if(!allowed.includes(location.hostname)||window.top!==window||navigator.webdriver||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
  const path=location.pathname==='/'||location.pathname==='/index.html'?'/':location.pathname;
  if(!['/','/tools.html','/news.html','/chat.html','/hall-of-fame.html','/santa.html','/genesis-loot.html'].includes(path)||new URLSearchParams(location.search).get('embedded')==='1')return;
  let sent=false;
  function count(){
    if(sent||document.visibilityState!=='visible')return;sent=true;
    let referrer='';try{referrer=document.referrer?new URL(document.referrer).origin:'';}catch{}
    const device=innerWidth<700?'Mobile':innerWidth<1100?'Tablet':'Desktop';
    fetch('https://bot-ark-production-a0afb716.up.railway.app/api/analytics/pageview',{
      method:'POST',mode:'cors',credentials:'omit',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({path,referrer,device})
    }).catch(()=>{});
  }
  count();document.addEventListener('visibilitychange',count);
})();
