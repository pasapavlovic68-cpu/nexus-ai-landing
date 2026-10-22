// Страница входа для /karta (карта системы). Вход тот же, что у /stats: PIN из 6 цифр или пароль,
// проверяет /api/login, после успеха ставится cookie ns_auth и страница просто перезагружается.
export const KARTA_LOGIN = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Вход · Карта системы Nexus</title><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--ff:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;--fs:'Instrument Serif',Georgia,serif;--fm:'JetBrains Mono',ui-monospace,monospace;
--bg:#12100E;--tx:#F4EFEA;--tx2:#B9AFA6;--tx3:#857B73;--or:#E26612;--or2:#F2853A;--ln:rgba(255,236,220,.09);--ln2:rgba(255,236,220,.16);--card:rgba(255,240,228,.035);--glow:rgba(226,102,18,.22);--bad:#F0607A;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#F2EDE7;--tx:#1B1714;--tx2:#5E554E;--tx3:#8A8078;--or:#C9560D;--or2:#C9560D;--ln:rgba(52,36,24,.11);--ln2:rgba(52,36,24,.2);--card:#fff;--glow:rgba(201,86,13,.14);--bad:#C2284A;color-scheme:light}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--tx);font-family:var(--ff);padding:24px max(16px,env(safe-area-inset-left,0px))}
.aura{position:fixed;inset:-20vh -10vw auto auto;width:70vw;height:70vh;background:radial-gradient(closest-side,var(--glow),transparent 70%);filter:blur(30px);pointer-events:none}
form{position:relative;width:min(380px,100%);display:grid;gap:16px;border:1px solid var(--ln);background:var(--card);border-radius:22px;padding:28px}
.mk{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:linear-gradient(145deg,var(--or2),var(--or));color:#fff;font-family:var(--fs);font-size:24px;box-shadow:0 6px 20px var(--glow)}
h1{margin:0;font-size:28px;letter-spacing:-.02em;font-weight:600}h1 i{font-family:var(--fs);font-weight:400;color:var(--or2)}
p{margin:0;color:var(--tx2);font-size:14.5px}
input{width:100%;height:48px;border-radius:13px;border:1px solid var(--ln2);background:transparent;color:var(--tx);font:500 18px var(--fm);padding:0 14px;letter-spacing:.2em;outline:none;transition:border-color .2s,box-shadow .2s}
input:focus{border-color:var(--or2);box-shadow:0 0 0 4px color-mix(in srgb,var(--or) 14%,transparent)}
button{height:48px;border-radius:13px;border:0;background:linear-gradient(145deg,var(--or2),var(--or));color:#fff;font:600 15px var(--ff);cursor:pointer;transition:filter .2s,box-shadow .25s,transform .15s}
button:hover{filter:brightness(1.08);box-shadow:0 10px 28px -8px var(--glow)}button:active{transform:translateY(1px)}
.sw{background:none;height:auto;color:var(--tx2);font-weight:500;font-size:13.5px;justify-self:center;padding:6px 10px;border-radius:9px}
.sw:hover{filter:none;box-shadow:none;color:var(--tx);background:color-mix(in srgb,var(--or) 10%,transparent)}
.msg{min-height:20px;font-size:13.5px;color:var(--bad)}
</style></head><body><div class="aura"></div>
<form id="f" autocomplete="off"><div class="mk">N</div><h1>Карта <i>системы</i></h1>
<p id="hint">Вход тот же, что у статистики сайта.</p>
<input id="v" inputmode="numeric" maxlength="6" placeholder="PIN из 6 цифр" aria-label="PIN" required>
<button type="submit">Войти</button><div class="msg" id="m" role="alert"></div>
<button type="button" class="sw" id="sw">Войти паролем</button></form>
<script>
(()=>{const f=document.getElementById('f'),v=document.getElementById('v'),m=document.getElementById('m'),sw=document.getElementById('sw');let mode='pin';
const setMode=k=>{mode=k;m.textContent='';v.value='';if(k==='pin'){v.type='text';v.inputMode='numeric';v.maxLength=6;v.placeholder='PIN из 6 цифр';v.setAttribute('aria-label','PIN');v.style.letterSpacing='.2em';sw.textContent='Войти паролем'}else{v.type='password';v.removeAttribute('inputmode');v.maxLength=200;v.placeholder='Пароль';v.setAttribute('aria-label','Пароль');v.style.letterSpacing='normal';sw.textContent='Войти по PIN'}v.focus()};
fetch('/api/login').then(r=>r.json()).then(d=>{if(!d.pin){setMode('password');sw.hidden=true}}).catch(()=>{});
sw.onclick=()=>setMode(mode==='pin'?'password':'pin');
f.onsubmit=async e=>{e.preventDefault();m.textContent='';const body=mode==='pin'?{pin:v.value.trim()}:{password:v.value};
try{const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));
if(r.ok&&d.ok){location.reload();return}
m.textContent=d.retry?'Слишком много попыток. Подождите '+Math.ceil(d.retry/60)+' мин.':d.error==='not-configured'?'Вход не настроен на сервере.':mode==='pin'?'PIN не подошёл'+(d.left!=null?' — осталось попыток: '+d.left:'')+'.':'Пароль не подошёл.'}
catch(_){m.textContent='Нет связи с сервером. Попробуйте ещё раз.'}};v.focus()})();
</script></body></html>`;
