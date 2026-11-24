(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('embedded')==='1')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let enabled=!reduced.matches;
  try{const saved=localStorage.getItem('rn_holiday_effects_v2');if(saved!==null)enabled=saved==='on'}catch{}
  const decor=document.createElement('div');decor.className='holiday-decor';decor.setAttribute('aria-hidden','true');
  const lights=document.createElement('div');lights.className='holiday-lights';
  for(let i=0;i<32;i++){const bulb=document.createElement('i');bulb.style.setProperty('--i',i);lights.append(bulb)}
  const snow=document.createElement('div');snow.className='holiday-snow';
  for(let i=0;i<(innerWidth<700?22:42);i++){const flake=document.createElement('i');if(i%3===0){flake.textContent='❄';flake.className='holiday-crystal'}flake.style.cssText=`--x:${(i*37.91)%100}%;--s:${3+i%4}px;--font:${12+i%9}px;--duration:${11+i%11}s;--delay:${-(i*2.37)}s;`;snow.append(flake)}
  const flight=document.createElement('div');flight.className='holiday-flight';const sleigh=document.createElement('img');sleigh.src='assets/santa-sleigh.webp';sleigh.alt='';sleigh.width=355;sleigh.height=178;flight.append(sleigh);decor.append(flight);
  const edges=document.createElement('div');edges.className='holiday-edges';edges.setAttribute('aria-hidden','true');
  const sprigs=Array.from({length:8},(_,i)=>`<g transform="translate(-22 ${i*140-35}) rotate(${i%2?8:-5} 20 30)"><path d="M8 0 Q75 46 145 102 M10 16 L70 7 M30 33 L105 25 M48 49 L132 52 M64 63 L150 79 M12 17 L18 72 M33 35 L48 100 M57 57 L83 121 M85 77 L120 140" stroke="#285c42" stroke-width="13" stroke-linecap="round"/><path d="M4 0 Q77 49 147 105 M26 24 L70 14 M51 48 L117 46 M64 62 L75 108" stroke="#5a8a60" stroke-width="3" fill="none"/><path d="M20 8 L48 5 M42 29 L98 25 M93 80 L133 90" stroke="#b4d2b9" stroke-width="3" opacity=".5"/><circle cx="${i%2?108:67}" cy="${i%2?81:75}" r="17" fill="${i%2?'#c79b4d':'#973c48'}" stroke="#e0bd7c" stroke-width="1.5"/><ellipse cx="${i%2?103:62}" cy="${i%2?75:69}" rx="4" ry="6" fill="#fff3cc" opacity=".35"/><circle cx="30" cy="44" r="3" fill="#ffdd89"/></g>`).join('');
  for(const side of ['left','right']){const branch=document.createElement('div');branch.className='holiday-branch holiday-branch-'+side;branch.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 1100" fill="none" preserveAspectRatio="xMinYMid slice">'+sprigs+'</svg>';edges.append(branch)}
  document.body.prepend(edges);
  decor.append(lights,snow);document.body.append(decor);document.body.classList.add('holiday-season');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='holiday-toggle';
  function render(){const active=enabled&&!reduced.matches;decor.classList.toggle('holiday-still',!active);toggle.textContent=active?'❄ Snow: on':'❄ Snow: off';toggle.setAttribute('aria-pressed',String(active));}
  toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('rn_holiday_effects_v2',enabled?'on':'off')}catch{}render()});
  reduced.addEventListener('change',render);document.body.append(toggle);render();
})();
