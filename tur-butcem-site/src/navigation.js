export const SITE_NAV_EVENT='muhasebe:navigate';

export function navigateTo(path){
  if(typeof window==='undefined')return;
  const target=new URL(path,window.location.origin);
  if(target.origin!==window.location.origin){window.location.assign(target.href);return;}
  const next=`${target.pathname}${target.search}${target.hash}`;
  const current=`${window.location.pathname}${window.location.search}${window.location.hash}`;
  if(next!==current)window.history.pushState({},'',next);
  window.dispatchEvent(new Event(SITE_NAV_EVENT));
  window.scrollTo({top:0,left:0,behavior:'auto'});
}
