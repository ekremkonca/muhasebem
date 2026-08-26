const PAGE_ID='assets-fund-page';
const ROUTE='#varliklar-fon';

function createAssetsPage(dashboard){
  let page=document.getElementById(PAGE_ID);
  if(page)return page;
  page=document.createElement('main');
  page.id=PAGE_ID;
  page.className='assets-fund-page';
  page.hidden=true;
  page.innerHTML=`
    <section class="assets-fund-shell">
      <button type="button" class="assets-back">← Muhasebeye dön</button>
      <div class="assets-fund-heading">
        <span class="eyebrow">VARLIKLAR / FON</span>
        <h1>Varlıklar / Fon</h1>
        <p>Banka ve yatırım fonu takibi için ayrı çalışma alanı.</p>
      </div>
      <section class="assets-empty-state">
        <strong>Varlık takibi</strong>
        <span>Fon ve hesap bilgileri bir sonraki adımda eklenecek.</span>
      </section>
    </section>`;
  dashboard.insertAdjacentElement('afterend',page);
  page.querySelector('.assets-back')?.addEventListener('click',()=>{
    history.pushState(null,'',location.pathname+location.search);
    renderRoute();
  });
  return page;
}

function renderRoute(){
  const dashboard=document.querySelector('.main-dashboard.v7-dashboard');
  if(!dashboard)return;
  const page=createAssetsPage(dashboard);
  const button=document.querySelector('.assets-nav-button');
  const active=location.hash===ROUTE;
  dashboard.hidden=active;
  page.hidden=!active;
  button?.classList.toggle('active',active);
  if(active)window.scrollTo({top:0,behavior:'instant'});
}

function ensureNavigation(){
  const header=document.querySelector('.v7-header');
  const currency=header?.querySelector('.currency');
  const dashboard=document.querySelector('.main-dashboard.v7-dashboard');
  if(!header||!currency||!dashboard)return false;
  if(!header.querySelector('.assets-nav-button')){
    const button=document.createElement('button');
    button.type='button';
    button.className='btn secondary assets-nav-button';
    button.textContent='VARLIKLAR / FON';
    button.setAttribute('aria-label','Varlıklar ve fon sayfasını aç');
    currency.parentElement.insertBefore(button,currency);
    button.addEventListener('click',()=>{
      if(location.hash!==ROUTE)history.pushState(null,'',`${location.pathname}${location.search}${ROUTE}`);
      renderRoute();
    });
  }
  createAssetsPage(dashboard);
  renderRoute();
  return true;
}

const observer=new MutationObserver(()=>{
  if(ensureNavigation())observer.disconnect();
});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('popstate',renderRoute);
window.addEventListener('hashchange',renderRoute);
ensureNavigation();
