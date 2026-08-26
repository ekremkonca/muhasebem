import React,{useEffect}from'react';
import'./font-switcher.css';

const STORAGE_KEY='muhasebe-ui-font';
const FONTS=[['dm-sans','DM Sans','"DM Sans", "Segoe UI", Arial, sans-serif'],['atkinson','Atkinson Hyperlegible','"Atkinson Hyperlegible Next", "Segoe UI", Arial, sans-serif'],['segoe','Segoe UI','"Segoe UI", Arial, sans-serif'],['system','Sistem UI','system-ui, -apple-system, "Segoe UI", Arial, sans-serif'],['arial','Arial','Arial, Helvetica, sans-serif'],['verdana','Verdana','Verdana, Geneva, sans-serif'],['tahoma','Tahoma','Tahoma, Geneva, sans-serif'],['trebuchet','Trebuchet MS','"Trebuchet MS", Arial, sans-serif'],['calibri','Calibri','Calibri, "Segoe UI", Arial, sans-serif'],['manrope','Manrope','Manrope, "Segoe UI", Arial, sans-serif']];
const getSaved=()=>{try{const id=localStorage.getItem(STORAGE_KEY);return FONTS.some(x=>x[0]===id)?id:'dm-sans'}catch{return'dm-sans'}};
const findReport=()=>[...document.querySelectorAll('.v7-header .header-actions button')].find(b=>b.textContent?.trim().toLocaleLowerCase('tr-TR').includes('aylık rapor'));
const applyFont=id=>{const font=FONTS.find(x=>x[0]===id)||FONTS[0];document.documentElement.style.setProperty('--app-font',font[2]);document.documentElement.dataset.font=font[0];try{localStorage.setItem(STORAGE_KEY,font[0])}catch{}};

export default function FontSwitcher(){
 useEffect(()=>{
  let selected=getSaved(),mount=null,raf=0;
  applyFont(selected);
  const closeMenu=()=>mount?.querySelector('.font-panel')?.remove();
  const buildMenu=()=>{
   closeMenu();
   if(!mount)return;
   const panel=document.createElement('div');panel.className='font-panel';panel.setAttribute('role','menu');panel.setAttribute('aria-label','Yazı fontları');
   FONTS.forEach(([id,name,stack])=>{const b=document.createElement('button');b.type='button';b.className=selected===id?'active':'';b.style.fontFamily=stack;b.innerHTML=`<span>${name}</span>${selected===id?'<b>✓</b>':''}`;b.addEventListener('click',e=>{e.stopPropagation();selected=id;applyFont(id);closeMenu()});panel.appendChild(b)});
   mount.querySelector('.font-switcher')?.appendChild(panel);
  };
  const createMount=report=>{
   const slot=document.createElement('span');slot.className='font-switcher-slot';
   const box=document.createElement('div');box.className='font-switcher';
   const btn=document.createElement('button');btn.type='button';btn.className='btn secondary font-trigger';btn.title='Yazı fontunu değiştir';btn.setAttribute('aria-label','Yazı fontunu değiştir');btn.innerHTML='<span class="font-aa">Aa</span>';
   btn.addEventListener('click',e=>{e.stopPropagation();mount?.querySelector('.font-panel')?closeMenu():buildMenu()});box.appendChild(btn);slot.appendChild(box);report.parentElement.insertBefore(slot,report);return slot;
  };
  const place=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const report=findReport(),assets=document.querySelector('.assets-fund-page'),header=document.querySelector('.v7-header');if(assets||!report||!header||header.hidden||report.offsetParent===null){mount?.remove();mount=null;return}if(mount?.isConnected&&mount.nextSibling===report)return;mount?.remove();mount=createMount(report)})};
  const outside=e=>{if(mount&&!mount.contains(e.target))closeMenu()};
  place();
  const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  document.addEventListener('mousedown',outside);window.addEventListener('resize',place);window.addEventListener('popstate',place);window.addEventListener('hashchange',place);window.addEventListener('assetsviewchange',place);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('mousedown',outside);window.removeEventListener('resize',place);window.removeEventListener('popstate',place);window.removeEventListener('hashchange',place);window.removeEventListener('assetsviewchange',place);mount?.remove()};
 },[]);
 return null;
}
