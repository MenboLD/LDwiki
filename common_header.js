/* common_header.js (stabilized)
   - Works with either injected header (other pages) or existing static header (index)
   - Unifies drawer menu across pages (index is source of truth)
   - Forces authPass to type=text + inputmode=text (no bullets, allow full-width)
*/
(function(){
  'use strict';

  const MENU_ITEMS = [
    {label:'トップページ', href:'./index.html'},
    {label:'情報掲示板', href:'./ld_board.html'},
    {label:'ユーザー情報', href:'./ld_users.html'},
    {label:'攻略の手引き', href:'./guide.html'},
    {label:'各種データ', href:'./data.html'},
    {label:'データツール', href:'./tools.html'},
  ];
  const MENU_FOOTER = [
    {label:'サイトについて', href:'./about.html'},
    {label:'利用ルール', href:'./rules.html'},
    {label:'更新履歴', href:'./changelog.html'},
  ];

  function el(tag, attrs={}, children=[]){
    const e=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if(k==='class') e.className=v;
      else if(k==='html') e.innerHTML=v;
      else e.setAttribute(k,v);
    });
    (Array.isArray(children)?children:[children]).forEach(c=>{
      if(c==null) return;
      if(typeof c==='string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  }

  function ensureDrawer(){
    let drawer = document.getElementById('drawer');
    let overlay = document.getElementById('drawerOverlay');

    if(!overlay){
      overlay = el('div',{id:'drawerOverlay', class:'drawer-overlay'});
      document.body.appendChild(overlay);
    }else{
      overlay.classList.add('drawer-overlay');
    }

    if(!drawer){
      drawer = el('nav',{id:'drawer', class:'drawer'});
      const closeRow = el('div',{class:'drawer-close-row'},[
        el('button',{type:'button', class:'drawer-close-button', id:'drawerCloseBtn'},['閉じる ◀'])
      ]);
      const body = el('div',{class:'drawer-body'},[
        el('ul',{class:'drawer-nav', id:'drawerNav'})
      ]);
      drawer.appendChild(closeRow);
      drawer.appendChild(body);
      document.body.appendChild(drawer);
    }else{
      drawer.classList.add('drawer');
      // Ensure it has a body/nav
      if(!drawer.querySelector('.drawer-body')){
        const body = el('div',{class:'drawer-body'},[
          el('ul',{class:'drawer-nav', id:'drawerNav'})
        ]);
        drawer.appendChild(body);
      }
      if(!drawer.querySelector('#drawerCloseBtn')){
        const closeRow = el('div',{class:'drawer-close-row'},[
          el('button',{type:'button', class:'drawer-close-button', id:'drawerCloseBtn'},['閉じる ◀'])
        ]);
        drawer.insertBefore(closeRow, drawer.firstChild);
      }
      if(!drawer.querySelector('#drawerNav')){
        const nav = el('ul',{class:'drawer-nav', id:'drawerNav'});
        drawer.querySelector('.drawer-body').appendChild(nav);
      }
    }

    // Populate nav to match index (source of truth)
    const nav = drawer.querySelector('#drawerNav');
    nav.innerHTML = '';
    MENU_ITEMS.forEach(it=>{
      nav.appendChild(el('li',{},[
        el('a',{class:'drawer-link', href:it.href},[it.label])
      ]));
    });
    nav.appendChild(el('li',{},[el('div',{class:'drawer-section-label'},[''])]));
    MENU_FOOTER.forEach(it=>{
      nav.appendChild(el('li',{},[
        el('a',{class:'drawer-link', href:it.href},[it.label])
      ]));
    });

    // Events
    function open(){
      drawer.classList.add('open');
      overlay.classList.add('visible');
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
    }
    function close(){
      drawer.classList.remove('open');
      overlay.classList.remove('visible');
      document.documentElement.style.overflow='';
      document.body.style.overflow='';
    }
    overlay.addEventListener('click', close);
    drawer.querySelector('#drawerCloseBtn').addEventListener('click', close);

    // Menu button
    const btn = document.getElementById('menuBtn') || document.querySelector('.topbar-menu-btn');
    if(btn){
      btn.addEventListener('click', ()=>{ drawer.classList.contains('open')?close():open(); });
    }

    return {drawer, overlay, open, close};
  }

  function ensureHeader(){
    // If a topbar already exists (index), keep it; else inject.
    let topbar = document.querySelector('.topbar');
    if(!topbar){
      topbar = el('header',{class:'topbar'},[
        el('div',{class:'topbar-row topbar-row--primary'},[
          el('div',{class:'topbar-title'},['ラッキー傭兵団 攻略 wiki']),
          el('div',{class:'topbar-page', id:'pageName'},['']),
          el('button',{type:'button', class:'topbar-menu-btn', id:'menuBtn'},['≡']),
        ]),
        el('div',{class:'topbar-row topbar-row--auth'},[
          el('div',{class:'topbar-auth-label'},['未:']),
          el('div',{class:'topbar-auth-field'},[
            el('input',{id:'authName', type:'text', placeholder:'ユーザー名(任意)', autocomplete:'username', inputmode:'text', autocapitalize:'off', spellcheck:'false'}),
          ]),
          el('div',{class:'topbar-auth-field'},[
            el('input',{id:'authPass', type:'text', placeholder:'ゲスト状態', autocomplete:'off', inputmode:'text', autocapitalize:'off', spellcheck:'false'}),
          ]),
          el('button',{type:'button', class:'topbar-auth-btn', id:'btnLogin'},['ログイン'])
        ])
      ]);
      document.body.insertBefore(topbar, document.body.firstChild);
    }

    // Set page name from body data-page-name
    const page = document.getElementById('pageName');
    const pn = document.body.getAttribute('data-page-name') || '';
    if(page) page.textContent = pn ? `> ${pn}` : '';

    // Force authPass attributes (no bullets, allow full-width)
    try{
      const ap=document.getElementById('authPass');
      if(ap){
        ap.type='text';
        ap.setAttribute('inputmode','text');
        ap.setAttribute('autocomplete','off');
        ap.setAttribute('autocapitalize','off');
        ap.setAttribute('spellcheck','false');
      }
    }catch(_){}
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureHeader();
    ensureDrawer();
  });
})();
