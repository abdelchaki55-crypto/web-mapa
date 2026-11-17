(() => {
  'use strict';
  const API='https://bot-ark-production-a0afb716.up.railway.app/api/news', $=id=>document.getElementById(id);
  let items=[],controller,requestNumber=0,updatedAt=null,stale=false;
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  function safeUrl(value,media=false){try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;if(media&&(!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)||!url.pathname.startsWith('/attachments/')))return null;return url.href;}catch{return null;}}
  function link(text,url,cls){const a=el('a',text,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function richText(target,text){
    const str=String(text||'');const regex=/https:\/\/[^\s<>]+/g;let offset=0;
    for(const match of str.matchAll(regex)){target.append(document.createTextNode(str.slice(offset,match.index)));const url=safeUrl(match[0]);target.append(url?link(match[0],url):document.createTextNode(match[0]));offset=match.index+match[0].length;}
    target.append(document.createTextNode(str.slice(offset)));
  }
  function render(){
    const query=$('news-search').value.trim().toLowerCase(),replies=$('news-replies').checked;
    const visible=items.filter(item=>(replies||!item.reply_to)&&`${item.content} ${item.author} ${(item.embeds||[]).map(e=>e.title+' '+e.description).join(' ')}`.toLowerCase().includes(query));
    $('news-feed').replaceChildren();$('news-count').textContent=visible.length+' updates';
    if(!visible.length){$('news-feed').append(el('p',items.length?'No updates match your filters.':'No updates are available yet. The news service will refresh automatically.','card news-empty'));return;}
    for(const item of visible){
      const source=safeUrl(item.url);if(!source||!source.startsWith('https://discord.com/channels/1343348944427815013/1343673608421113917/'))continue;
      const card=el('article',undefined,'news-card'+(item.reply_to?' is-reply':'')),header=el('div',undefined,'news-card-header');card.id='post-'+item.id;
      header.append(el('span',item.author||'Community','news-author'));
      const date=new Date(item.timestamp);if(Number.isFinite(date.getTime())){const time=el('time',date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}),'news-date');time.dateTime=date.toISOString();header.append(time);}
      if(item.reply_to)header.append(el('span','Reply / context','reply-badge'));
      header.append(link('Original message ↗',source));card.append(header);
      if(item.content){const p=el('p',undefined,'news-content');richText(p,item.content);card.append(p);}
      const attachments=(item.attachments||[]).filter(a=>safeUrl(a.url,true));
      if(attachments.length){
        const media=el('div',undefined,'news-media'+(attachments.length===1?' single':''));
        for(const attachment of attachments){
          const url=safeUrl(attachment.url,true);
          if(attachment.kind==='image'){
            const a=link('',url),image=el('img');image.src=url;image.alt=attachment.name||'Image attached to the original community post';image.width=attachment.width||1280;image.height=attachment.height||720;image.loading='lazy';image.referrerPolicy='no-referrer';
            image.addEventListener('error',()=>{a.replaceChildren(el('p','Image unavailable. Open the original message to view it.','news-media-error'));},{once:true});a.append(image);media.append(a);
          }else if(attachment.kind==='video'){
            const box=el('div'),video=el('video');video.src=url;video.controls=true;video.preload='none';video.setAttribute('aria-label',attachment.name||'Attached video');box.append(video,link('Open video ↗',url,'source-link'));media.append(box);
          }else media.append(link(attachment.name||'Open attachment',url,'attachment-file'));
        }card.append(media);
      }
      for(const embed of (item.embeds||[])){
        const box=el('aside',undefined,'news-embed'),url=safeUrl(embed.url);
        if(embed.title){const title=el('h3');title.append(url?link(embed.title,url):document.createTextNode(embed.title));box.append(title);}
        if(embed.description){const p=el('p');richText(p,embed.description);box.append(p);}card.append(box);
      }
      if(item.reply_to){const parent=el('p',undefined,'news-parent');const local=visible.some(i=>i.id===item.reply_to);const a=el('a','View the message being replied to ↗');a.href=local?'#post-'+item.reply_to:'https://discord.com/channels/1343348944427815013/1343673608421113917/'+item.reply_to;if(!local){a.target='_blank';a.rel='noopener noreferrer';}else a.addEventListener('click',()=>{if(!$('news-replies').checked){$('news-replies').checked=true;render();}});parent.append(a);card.append(parent);}
      $('news-feed').append(card);
    }
  }
  async function load(){
    controller?.abort();const current=new AbortController();controller=current;const number=++requestNumber;
    const timer=setTimeout(()=>current.abort(),15000);$('news-refresh').disabled=true;
    $('news-status').textContent=items.length?'Refreshing news…':'Loading community news…';
    try{
      const response=await fetch(API,{signal:current.signal,cache:'no-store'});if(!response.ok)throw new Error('unavailable');const data=await response.json();
      if(number!==requestNumber)return;if(!Array.isArray(data.items))throw new Error('invalid');
      items=data.items.filter(i=>i&&/^\d{15,22}$/.test(i.id));updatedAt=data.updated_at;stale=data.status==='stale';render();
      const date=new Date(updatedAt);$('news-status').textContent=updatedAt&&Number.isFinite(date.getTime())?`${stale?'Showing saved posts · Source refresh delayed · ':'Synced · '}${date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}`:'News collection is starting. Try again shortly.';
    }catch(error){if(number===requestNumber){$('news-status').textContent=items.length?'Could not refresh. Showing the last loaded updates.':'News is temporarily unavailable. Use Refresh news to try again.';if(!items.length)$('news-feed').replaceChildren(el('p','The source could not be reached. You can still open the ASA News channel above.','card news-empty'));}}
    finally{clearTimeout(timer);if(number===requestNumber)$('news-refresh').disabled=false;}
  }
  $('news-search').addEventListener('input',render);$('news-replies').addEventListener('change',render);$('news-refresh').addEventListener('click',load);
  setInterval(()=>{if(!document.hidden)load();},120000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});load();
})();

