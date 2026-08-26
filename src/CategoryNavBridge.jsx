import {useEffect} from 'react';

const LINKS=[
  ['/anasayfa/','Ana Sayfa','anasayfa'],
  ['/muhasebe/','Muhasebe','muhasebe'],
  ['/varliklar/','Varlıklar','varliklar'],
  ['/takvim/','Takvim','takvim']
];

const pageKey=()=>{
  const p=(window.location.pathname||'/').replace(/^\/+|\/+$/g,'');
  if(p.startsWith('muhasebe'))return'muhasebe';
  if(p.startsWith('varliklar'))return'varliklar';
  if(p.startsWith('takvim'))return'takvim';
  return'anasayfa';
};

export default function CategoryNavBridge(){
  useEffect(()=>{
    let frame=0;
    const sync=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const header=document.querySelector('.v7-header');
        if(!header)return;
        let host=document.querySelector('.global-category-nav-host');
        if(!host){
          host=document.createElement('div');
          host.className='global-category-nav-host';
        }
        if(host.previousElementSibling!==header)header.insertAdjacentElement('afterend',host);
        const active=pageKey();
        host.innerHTML=`<nav class="global-category-nav" aria-label="Ana kategoriler">${LINKS.map(([href,label,key])=>`<a href="${href}"${key===active?' class="active"':''}>${label}</a>`).join('')}</nav>`;
      });
    };
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
    window.addEventListener('popstate',sync);
    return()=>{
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('popstate',sync);
      document.querySelector('.global-category-nav-host')?.remove();
    };
  },[]);
  return null;
}
