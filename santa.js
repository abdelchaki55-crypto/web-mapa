(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  $('santa-wish').addEventListener('input',()=>{$('wish-count').textContent=$('santa-wish').value.length.toLocaleString()+' / 2,000'});
  $('letter-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!$('letter-form').reportValidity())return;
    const button=$('send-letter');button.disabled=true;button.textContent='Delivering your letter…';$('letter-status').textContent='';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch('https://bot-ark-production-a0afb716.up.railway.app/api/santa/letters',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:controller.signal,
        body:JSON.stringify({discord:$('santa-discord').value.trim(),server:$('santa-server').value.trim(),wish:$('santa-wish').value.trim(),website:$('santa-website').value})});
      const data=await response.json();
      if(!response.ok||!data.delivered||!/^RN-[A-F0-9]{10}$/.test(data.reference||''))throw Error(data.error||'unavailable');
      $('letter-form').hidden=true;$('letter-success').hidden=false;$('letter-reference').textContent='Your delivery reference: '+data.reference;$('letter-success').focus();
      $('letter-form').reset();$('wish-count').textContent='0 / 2,000';
    }catch(error){
      $('letter-status').textContent=error.message==='rate_limit'?'You have sent a few letters recently. Please try again in an hour.':error.message==='invalid_letter'?'Please add your Discord username, server and a wish of 10–2,000 characters.':'Santa’s post office could not confirm delivery. Your letter is still here; please try again shortly.';
    }finally{clearTimeout(timeout);button.disabled=false;button.textContent='Send to Raptor Santa ✦'}
  });
  $('write-another').addEventListener('click',()=>{$('letter-success').hidden=true;$('letter-form').hidden=false;$('santa-discord').focus()});
})();
