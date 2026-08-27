(()=>{
  const LOGO_SRC='/ek-logo-clean.png?v=20260827-14';
  function mountBrand(root=document){
    root.querySelectorAll?.('.v7-header .brand-mark').forEach(mark=>{
      let img=mark.querySelector('.v8-brand-logo-img');
      if(!img){
        img=document.createElement('img');
        img.className='v8-brand-logo-img';
        img.alt='EK';
        img.decoding='async';
        img.draggable=false;
        mark.replaceChildren(img);
      }
      if(img.getAttribute('src')!==LOGO_SRC) img.src=LOGO_SRC;
    });
  }
  const start=()=>{
    mountBrand();
    new MutationObserver(()=>mountBrand()).observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
