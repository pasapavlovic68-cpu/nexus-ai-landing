/* Nexus AI · общая плашка живых демо (nexusnova.app/demo/<имя>/ и /en/demo/<имя>/).
   Подключение в конце <body> демо-страницы:
     <script src="/assets/demo/bar.js" data-demo="dept" data-lang="ru" defer></script>
   Что делает: плавающая «пилюля» внизу — пометка «Демо-данные», кнопка заявки, ссылка назад на сайт;
   пишет события в ту же статистику, что и лендинг (/api/t): открытие демо, время в демо, клик по заявке.
   Без cookie; визит общий с лендингом (localStorage nexus_visit, 30 минут).
   Если демо открыто поверх лендинга (во фрейме) — ссылки «На сайт» нет: окно закрывает сам лендинг. */
(function(){
  'use strict';
  const me = document.currentScript || document.querySelector('script[data-demo]');
  const demo = (me && me.dataset.demo || 'demo').replace(/[^a-z0-9-]/gi, '').slice(0, 20);
  const en = (me && me.dataset.lang) === 'en';
  let embed = false;
  try{ embed = window.self !== window.top; }catch(e){ embed = true; }
  if(embed) document.documentElement.classList.add('nx-embed');

  const NAMES = { dept:'Dept', kc: en ? 'Nexus CC' : 'Nexus КЦ', voronka: en ? 'AI Funnel' : 'Воронка ИИ', omnix:'Omnix', okk: en ? 'Nexus QC' : 'Nexus ОКК' };
  const name = NAMES[demo] || 'Nexus AI';
  const T = en
    ? { badge:'Demo data', hint:'Everything here is made up — click around freely', cta:'I want one like this', ctaS:'I want this', back:'Back to site', hide:'Hide', show:'Demo' }
    : { badge:'Демо-данные', hint:'Все имена и цифры выдуманы — нажимайте смело', cta:'Хочу такое', ctaS:'Хочу такое', back:'На сайт', hide:'Свернуть', show:'Демо' };
  const CTA = en
    ? 'https://wa.me/84398964897?text=' + encodeURIComponent('Hi! I tried the ' + name + ' demo on nexusnova.app and would like something similar.')
    : 'https://t.me/Ppasha69';
  const BACK = en ? '/en/#portfolio' : '/#portfolio';

  /* ---------- статистика ---------- */
  const track = (function(){
    let off = false, sid = '', q = [], timer = 0, meta = null;
    try{
      const p = new URLSearchParams(location.search);
      const nt = p.get('notrack');
      if(nt === '0') localStorage.removeItem('nexus_notrack');
      else if(nt !== null) localStorage.setItem('nexus_notrack', '1');
      off = !!localStorage.getItem('nexus_notrack');
      const hasUtm = [...p.keys()].some(k => k.startsWith('utm_'));
      let st = null;
      try{ st = JSON.parse(localStorage.getItem('nexus_visit') || 'null'); }catch(e){}
      if(st && st.sid && Date.now() - st.t < 30 * 60 * 1000 && !hasUtm) sid = st.sid;
      else {
        sid = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2,'0')).join('');
        let ref = null;
        try{ const h = new URL(document.referrer).hostname.replace(/^www\./,''); if(h && h !== location.hostname) ref = h; }catch(e){}
        meta = { ref, us:p.get('utm_source'), um:p.get('utm_medium'), uc:p.get('utm_campaign'), ut:p.get('utm_content'), lang:navigator.language };
      }
      localStorage.setItem('nexus_visit', JSON.stringify({ sid, t:Date.now() }));
      if(hasUtm){
        [...p.keys()].filter(k => k.startsWith('utm_')).forEach(k => p.delete(k));
        const qs = p.toString();
        history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
      }
    }catch(e){ off = true; }

    function flush(beacon){
      clearTimeout(timer);
      if(off){ q = []; return; }
      if(!q.length) return;
      const body = JSON.stringify(Object.assign({ sid, e:q.splice(0, 40) }, meta ? { m:meta } : {}));
      meta = null;
      const blob = new Blob([body], { type:'text/plain' });
      if(!(beacon && navigator.sendBeacon && navigator.sendBeacon('/api/t', blob)))
        fetch('/api/t', { method:'POST', body, keepalive:true, headers:{ 'content-type':'text/plain' } }).catch(()=>{});
    }
    // активное время в демо (пока вкладка видна)
    let active = 0, since = document.visibilityState === 'visible' ? Date.now() : 0;
    function sendTime(){
      if(since){ active += Date.now() - since; since = 0; }
      q.push({ t:'demo_time', n:demo, v:Math.round(active / 1000) });
      flush(true);
    }
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'hidden') sendTime();
      else since = Date.now();
    });
    addEventListener('pagehide', ()=> flush(true));
    // лендинг закрывает окно с демо — успеваем отправить время
    if(embed) addEventListener('message', e => {
      if(e.origin === location.origin && e.data && e.data.nxDemo === 'bye') sendTime();
    });

    return function(t, n, v, now){
      if(off) return;
      try{ localStorage.setItem('nexus_visit', JSON.stringify({ sid, t:Date.now() })); }catch(e){}
      q.push({ t, n:n == null ? null : String(n), v:v == null ? null : v });
      clearTimeout(timer);
      if(now) flush(true); else timer = setTimeout(()=> flush(false), 1200);
    };
  })();
  track('demo', demo);
  // первое нажатие внутри демо — «человек реально попробовал»
  let touched = false;
  addEventListener('pointerdown', e => {
    if(touched || (e.target.closest && e.target.closest('#nx-demo-bar'))) return;
    touched = true; track('demo_use', demo);
  }, true);

  /* ---------- плашка ---------- */
  const css = `
  #nx-demo-bar{position:fixed; left:50%; bottom:16px; transform:translateX(-50%); z-index:2147483000;
    display:flex; align-items:center; gap:10px; padding:8px 8px 8px 16px; max-width:calc(100vw - 24px);
    font:500 13.5px/1.2 'Sora',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; color:#eef0f6; letter-spacing:0;
    background:rgba(12,14,22,.82); border:1px solid rgba(121,168,255,.28); border-radius:999px;
    box-shadow:0 12px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset;
    -webkit-backdrop-filter:blur(16px) saturate(140%); backdrop-filter:blur(16px) saturate(140%);
    transition:transform .32s cubic-bezier(.23,1,.32,1), opacity .2s ease-out;}
  #nx-demo-bar *{box-sizing:border-box; margin:0;}
  #nx-demo-bar .nx-badge{display:inline-flex; align-items:center; gap:8px; white-space:nowrap; color:#c9d3ee;}
  #nx-demo-bar .nx-dot{width:8px; height:8px; border-radius:50%; background:#f5b84a; box-shadow:0 0 10px rgba(245,184,74,.8); flex:none;}
  #nx-demo-bar .nx-hint{color:#8b90a6; font-weight:300; font-size:12.5px; white-space:nowrap;}
  #nx-demo-bar a{color:inherit; text-decoration:none;}
  #nx-demo-bar .nx-cta{display:inline-flex; align-items:center; gap:7px; padding:10px 18px; border-radius:999px; white-space:nowrap;
    font-weight:600; color:#fff; background:linear-gradient(135deg,#5b95ff,#2f5fe0); box-shadow:0 6px 20px rgba(79,140,255,.38);
    transition:transform .16s ease-out, box-shadow .2s ease-out;}
  #nx-demo-bar .nx-cta:active{transform:scale(.97);}
  #nx-demo-bar .nx-back{padding:10px 12px; border-radius:999px; color:#aeb6d4; white-space:nowrap; transition:color .15s, background-color .15s;}
  #nx-demo-bar .nx-x{appearance:none; border:0; background:transparent; color:#7a8098; cursor:pointer; width:32px; height:32px; border-radius:50%;
    display:grid; place-items:center; font:inherit; flex:none; transition:color .15s, background-color .15s;}
  #nx-demo-bar :focus-visible{outline:2px solid #79a8ff; outline-offset:2px;}
  @media (hover:hover) and (pointer:fine){
    #nx-demo-bar .nx-cta:hover{box-shadow:0 8px 26px rgba(79,140,255,.55);}
    #nx-demo-bar .nx-back:hover,#nx-demo-bar .nx-x:hover{color:#fff; background:rgba(255,255,255,.07);}
  }
  #nx-demo-bar.is-min{padding:0; gap:0; background:rgba(12,14,22,.9);}
  #nx-demo-bar.is-min > :not(.nx-open){display:none;}
  #nx-demo-bar .nx-open{display:none; appearance:none; border:0; background:transparent; color:#c9d3ee; cursor:pointer; font:inherit; padding:10px 16px; border-radius:999px; align-items:center; gap:8px;}
  #nx-demo-bar.is-min .nx-open{display:inline-flex;}
  @media (max-width:760px){ #nx-demo-bar .nx-hint{display:none;} }
  #nx-demo-bar .nx-s{display:none;}
  @media (max-width:520px){
    #nx-demo-bar{bottom:10px; gap:2px; padding:6px 4px 6px 12px; font-size:12.5px;}
    #nx-demo-bar .nx-badge{gap:6px;}
    #nx-demo-bar .nx-cta{padding:9px 14px; margin-left:6px;}
    #nx-demo-bar .nx-l{display:none;} #nx-demo-bar .nx-s{display:inline;}
    #nx-demo-bar .nx-back{padding:9px 10px;}
    #nx-demo-bar .nx-bt{display:none;}
    #nx-demo-bar .nx-x{width:28px; height:28px;}
  }
  @media (prefers-reduced-motion:reduce){ #nx-demo-bar,#nx-demo-bar *{transition:none !important;} }
  @media print{ #nx-demo-bar{display:none !important;} }`;

  function mount(){
    if(document.getElementById('nx-demo-bar')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const bar = document.createElement('div');
    bar.id = 'nx-demo-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', T.badge);
    bar.innerHTML =
      '<span class="nx-badge"><i class="nx-dot" aria-hidden="true"></i>' + T.badge + '</span>' +
      '<span class="nx-hint">' + T.hint + '</span>' +
      '<a class="nx-cta" href="' + CTA + '" target="_blank" rel="noopener" aria-label="' + T.cta + '"><span class="nx-l">' + T.cta + '</span><span class="nx-s">' + T.ctaS + '</span> <span aria-hidden="true">→</span></a>' +
      (embed ? '' : '<a class="nx-back" href="' + BACK + '" aria-label="' + T.back + '"><span aria-hidden="true">←</span><span class="nx-bt"> ' + T.back + '</span></a>') +
      '<button type="button" class="nx-x" aria-label="' + T.hide + '" title="' + T.hide + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
      '<button type="button" class="nx-open"><i class="nx-dot" aria-hidden="true"></i>' + T.show + '</button>';
    document.body.appendChild(bar);
    bar.querySelector('.nx-cta').addEventListener('click', ()=> track('click', 'demo_cta_' + demo, null, true));
    const back = bar.querySelector('.nx-back');
    if(back) back.addEventListener('click', ()=> track('demo_back', demo, null, true));
    bar.querySelector('.nx-x').addEventListener('click', ()=> bar.classList.add('is-min'));
    bar.querySelector('.nx-open').addEventListener('click', ()=> bar.classList.remove('is-min'));
  }
  if(document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // во фрейме Esc не доходит до лендинга: если в демо ничего не в фокусе — просим лендинг закрыть окно
  if(embed) addEventListener('keydown', e => {
    if(e.key !== 'Escape' || e.defaultPrevented) return;
    const a = document.activeElement;
    if(a && a !== document.body && a !== document.documentElement) return;
    try{ parent.postMessage({ nxDemo:'close' }, location.origin); }catch(err){}
  });
})();
