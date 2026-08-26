import {useEffect} from 'react';

const ASSETS_PATH='/varliklarfon';
const LEGACY_HASH='#varliklar-fon';

const cleanPath=value=>{
  const normalized=(value||'/').replace(/\/+$/,'');
  return normalized||'/';
};

export default function PathRouterBridge(){
  useEffect(()=>{
    const activateCleanAssetsRoute=()=>{
      if(cleanPath(window.location.pathname)!==ASSETS_PATH)return;
      const cleanUrl=`${ASSETS_PATH}${window.location.search}`;
      history.replaceState(history.state,'',`${cleanUrl}${LEGACY_HASH}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      history.replaceState(history.state,'',cleanUrl);
    };

    const handlePopState=()=>{
      if(cleanPath(window.location.pathname)===ASSETS_PATH){
        activateCleanAssetsRoute();
      }
    };

    const handleClick=event=>{
      const target=event.target instanceof Element?event.target:null;
      if(!target)return;

      if(target.closest('.assets-nav-button')){
        setTimeout(()=>{
          history.replaceState(history.state,'',`${ASSETS_PATH}${window.location.search}`);
        },0);
      }

      if(target.closest('.assets-back')){
        setTimeout(()=>{
          history.replaceState(history.state,'',`/${window.location.search}`);
        },0);
      }
    };

    activateCleanAssetsRoute();
    window.addEventListener('popstate',handlePopState);
    document.addEventListener('click',handleClick);

    return()=>{
      window.removeEventListener('popstate',handlePopState);
      document.removeEventListener('click',handleClick);
    };
  },[]);

  return null;
}
