(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('embedded')==='1')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=!reduced.matches;
  try{const saved=localStorage.getItem('rn_holiday_effects');if(saved!==null)enabled=saved==='on'}catch{}
  const decor=document.createElement('div');decor.className='holiday-decor';decor.setAttribute('aria-hidden','true');
  const lights=document.createElement('div');lights.className='holiday-lights';
  for(let i=0;i<32;i++){const bulb=document.createElement('i');bulb.style.setProperty('--i',i);lights.append(bulb)}
  const snow=document.createElement('div');snow.className='holiday-snow';
  for(let i=0;i<(innerWidth<700?16:28);i++){const flake=document.createElement('i');flake.style.cssText=`--x:${(i*37.91)%100}%;--s:${2+i%4}px;--duration:${9+i%9}s;--delay:${-(i*2.37)}s;`;snow.append(flake)}
  decor.append(lights,snow);document.body.append(decor);document.body.classList.add('holiday-season');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='holiday-toggle';
  function render(){const active=enabled&&!reduced.matches;decor.classList.toggle('holiday-still',!active);toggle.textContent=active?'❄ Snow: on':'❄ Snow: off';toggle.setAttribute('aria-pressed',String(active));}
  toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('rn_holiday_effects',enabled?'on':'off')}catch{}render()});
  reduced.addEventListener('change',render);document.body.append(toggle);render();
})();
