import React,{useEffect,useState}from'react';

export default function ScrollTopButton(){
 const[visible,setVisible]=useState(()=>window.scrollY>320);
 useEffect(()=>{let frame=0;const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setVisible(window.scrollY>320))};window.addEventListener('scroll',sync,{passive:true});return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',sync)}},[]);
 return <button type="button" className={`scroll-top-button${visible?' visible':''}`} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="Sayfanın en üstüne çık" title="Yukarı"><span aria-hidden="true">↑</span> Yukarı</button>
}
