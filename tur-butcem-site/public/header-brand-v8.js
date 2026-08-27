(()=>{
  const LOGO_SRC='/ek-logo.webp?v=20260827-12';
  function mountBrand(root=document){
    root.querySelectorAll?.('.v7-header .brand-mark').forEach(mark=>{
      if(mark.querySelector('.v8-brand-logo-img'))return;
      const img=document.createElement('img');
      img.className='v8-brand-logo-img';
      img.src=LOGO_SRC;
      img.alt='EK';
      img.decoding='async';
      img.draggable=false;
      img.addEventListener('load',()=>mark.classList.add('v8-logo-loaded'),{once:true});
      img.addEventListener('error',()=>mark.classList.add('v8-logo-error'),{once:true});
      mark.prepend(img);
    });
  }
  mountBrand();
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(node.nodeType===1)mountBrand(node.matches?.('.v7-header')?node:node);
      }
    }
  });
  const start=()=>{
    mountBrand();
    observer.observe(document.documentElement,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
