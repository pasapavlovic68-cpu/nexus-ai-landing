/* Отчёт руководству за месяц — логика страницы. Цифр здесь нет: data.json и список игроков отдаёт функция
   сайта из закрытой базы только после входа. Спейс, бот и сотрудник открываются ПАНЕЛЬЮ СПРАВА — страница
   остаётся на месте (владелец 23.10: «не должно быть, что нажимаю и меня возвращает на другую вкладку»). */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ru = (x, d = 0) => Number(x || 0).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });
  const usd = (x) => '$' + ru(x, 0), usd2 = (x) => '$' + ru(x, 2);
  const pct = (a, b) => (b ? ru((a / b) * 100, 1) + '%' : '—');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ботов = (n) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'бот' : ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'бота' : 'ботов'));
  let D = null, P = null, pLoad = null;

  /* ── тема ── */
  const cur = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', SUN = 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';
  const themeUi = () => { const d = cur() === 'dark'; $('#theme-t').textContent = d ? 'Светлая' : 'Тёмная'; $('#theme-ic').setAttribute('d', d ? SUN : MOON); };
  themeUi();
  $('#theme').addEventListener('click', () => { const n = cur() === 'dark' ? 'light' : 'dark'; const set = () => { document.documentElement.dataset.theme = n; themeUi(); }; if (document.startViewTransition && !reduce) document.startViewTransition(set); else set(); try { localStorage.setItem('km-theme', n); } catch (_) {} });

  /* ── шапка (как у юриста) ── */
  const head = $('#head'), nav = $('#nav'), ind = $('#ind');
  let compact = null, tick = false;
  const onScroll = () => { const y = scrollY, c = compact ? y > 24 : y > 56; if (c !== compact) { compact = c; head.classList.toggle('compact', c); head.style.setProperty('--k', c ? 1 : 0); } };
  addEventListener('scroll', () => { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false; onScroll(); }); }, { passive: true }); onScroll();
  let key = '';
  const placeInd = () => { const a = key && $(`a[data-go="${key}"]`, nav); if (!a || !a.getClientRects().length) { ind.style.opacity = 0; return; } const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect(); Object.assign(ind.style, { left: r.left - n.left + 'px', width: r.width + 'px', top: r.top - n.top + 'px', height: r.height + 'px', opacity: 1 }); };
  new ResizeObserver(placeInd).observe(nav); head.addEventListener('transitionend', (e) => { if (e.target === head) placeInd(); });
  const setNav = (k) => { key = k; $$('a[data-go]', nav).forEach((a) => a.classList.toggle('on', a.dataset.go === k)); placeInd(); };

  /* ── подписи ── */
  const бот = (id) => D.bots[id] || { id, name: id, user: '', space: '', t: {}, emp: [], daily: [] };
  const имяБота = (b) => (b.user ? '@' + b.user : b.name);
  const подБотом = (b) => [b.user && b.name !== b.user ? b.name : '', b.status === 'archived' ? 'в архиве' : ''].filter(Boolean).join(' · ');
  const period = () => '01–' + D.period.to.slice(8) + ' октября 2026';
  const ЛУПА = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const поиск = (цель, подсказка) => `<label class="sx" data-sx="${цель}" title="">${ЛУПА}<input type="text" placeholder="${esc(подсказка)}" autocomplete="off" aria-label="${esc(подсказка)}"></label>`;

  const tiles = (t, extra, безЛидов) => `<div class="tiles">
    ${безЛидов ? '' : `<div class="tile bl"><b>${ru(t.leads)}</b><span>Лиды</span><small>новые чаты Chatterfy</small></div>`}
    <div class="tile"><b>${ru(t.regs)}</b><span>Регистрации</span><small>${безЛидов ? 'партнёрка' : pct(t.regs, t.leads) + ' от лидов'}</small></div>
    <div class="tile ok"><b>${ru(t.ftd)}</b><span>Первые депозиты</span><small>${usd2(t.ftd_sum)} · ${pct(t.ftd, t.regs)} от рег</small></div>
    <div class="tile or"><b>${usd(t.ftd_sum + t.rd_sum)}</b><span>Все депозиты</span><small>FD ${usd(t.ftd_sum)} + RD ${usd(t.rd_sum)}</small></div>
    <div class="tile"><b>${ru(t.rd)}</b><span>Повторные депозиты</span><small>${usd2(t.rd_sum)}</small></div>
    <div class="tile"><b>${usd(t.wdr)}</b><span>Выводы</span><small>исполненные</small></div>${extra || ''}</div>`;
  const mini = (t) => `<div class="mini"><div><b>${ru(t.leads)}</b><span>лиды</span></div><div><b>${ru(t.regs)}</b><span>рег</span></div><div><b>${ru(t.ftd)}</b><span>FD</span></div></div>
    <div class="conv"><span class="pill">депозиты <b>${usd(t.ftd_sum + t.rd_sum)}</b></span><span class="pill">рег/лид <b>${pct(t.regs, t.leads)}</b></span><span class="pill">FD/рег <b>${pct(t.ftd, t.regs)}</b></span></div>`;
  const chart = (title, note, daily, f, fmt, color) => {
    const W = 640, H = 170, Pd = { l: 6, r: 6, t: 14, b: 22 }, vals = daily.map(f), max = Math.max(1, ...vals), bw = (W - Pd.l - Pd.r) / daily.length;
    const bars = daily.map((d, i) => { const h = (vals[i] / max) * (H - Pd.t - Pd.b); const x = Pd.l + i * bw + bw * .15, y = H - Pd.b - h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * .7).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" fill="${color}"><title>${d.day.slice(8)}.10 — ${fmt(vals[i])}</title></rect>`; }).join('');
    const ticks = daily.map((d, i) => (i % 3 === 0 || i === daily.length - 1) ? `<text class="ax" x="${(Pd.l + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d.day.slice(8)}</text>` : '').join('');
    const mi = vals.indexOf(max);
    const peak = `<text class="ax" x="${(Pd.l + mi * bw + bw / 2).toFixed(1)}" y="${(Pd.t - 3).toFixed(1)}" text-anchor="middle" style="fill:var(--tx2)">${fmt(max)}</text>`;
    return `<div class="chart"><div class="tt"><b>${esc(title)}</b><small>${esc(note)}</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><line x1="0" x2="${W}" y1="${H - Pd.b}" y2="${H - Pd.b}" stroke="var(--ln2)"/>${bars}${peak}${ticks}</svg></div>`;
  };
  const charts = (daily) => `<div class="charts">${chart('Лиды по дням', 'новые чаты, МСК', daily, (d) => d.leads, (v) => ru(v), 'var(--blue)')}${chart('Регистрации по дням', 'партнёрка', daily, (d) => d.regs, (v) => ru(v), 'var(--or2)')}${chart('Первые депозиты, $', 'партнёрка', daily, (d) => d.ftd_sum, (v) => usd(v), 'var(--ok)')}${chart('Все депозиты, $', 'FD + RD', daily, (d) => d.ftd_sum + d.rd_sum, (v) => usd(v), 'var(--gold)')}</div>`;
  const rowHead = (first, wl) => `<div class="row hd${wl ? ' wl' : ''}"><div>${first}</div><div class="v leads">Лиды</div><div class="v">Рег</div><div class="v">FD</div><div class="v">FD, $</div><div class="v">RD, $</div><div class="v">Выводы</div></div>`;
  const row = (name, sub, t, open, wl) => `<button type="button" class="row${wl ? ' wl' : ''}" data-open="${esc(open)}"><div class="nm">${esc(name)}${sub ? '<small>' + esc(sub) + '</small>' : ''}</div>
    <div class="v leads" data-l="Лиды">${wl ? ru(t.leads) : ''}</div><div class="v" data-l="Рег">${ru(t.regs)}</div><div class="v" data-l="FD">${ru(t.ftd)}</div>
    <div class="v" data-l="FD, $">${usd(t.ftd_sum)}</div><div class="v" data-l="RD, $">${usd(t.rd_sum)}<small>${ru(t.rd)} деп</small></div><div class="v" data-l="Выводы">${usd(t.wdr)}</div></button>`;

  /* ── главные страницы ── */
  const V = {
    obzor() {
      const t = D.total;
      const все = D.spaces.reduce((acc, s) => s.daily.map((d, i) => { const a = acc[i] || { day: d.day, leads: 0, regs: 0, ftd: 0, ftd_sum: 0, rd: 0, rd_sum: 0, wdr: 0 }; for (const k of ['leads', 'regs', 'ftd', 'ftd_sum', 'rd', 'rd_sum', 'wdr']) a[k] += d[k]; return a; }), []);
      const нет = D.spaces.filter((s) => s.name === 'Спейс не определён').reduce((a, s) => a + s.t.regs, 0);
      return `<section class="view"><div class="head-blk"><div class="kicker">Nexus · отчёт руководству</div><h1>Октябрь <span class="serif">2026</span></h1>
        <p class="lead">Все спейсы и боты за <b>${period()}</b>. Деньги и регистрации — данные партнёрки PocketOption, сверены с ней напрямую; лиды — новые чаты в Chatterfy.</p></div>
        ${tiles(t, `<div class="tile"><b>${ru(D.players)}</b><span>Игроков с событиями</span><small>за период</small></div>`)}${charts(все)}
        <h3 class="sub">Спейсы — нажмите, данные откроются справа</h3>
        <div class="cards">${D.spaces.map((s, i) => `<button type="button" class="card" data-open="s:${i}"><div class="top-row"><span class="n">${ботов(s.bots.length)}</span><span class="go">Открыть →</span></div><h3>${esc(s.name)}</h3>${mini(s.t)}</button>`).join('')}</div>
        <p class="note">Бот определён по чату игрока. Где чат не найден, деньги собраны в «Спейс не определён» — это ${pct(нет, t.regs)} регистраций.</p></section>`;
    },
    spaces() {
      return `<section class="view"><div class="head-blk"><div class="kicker">Спейсы и боты</div><h2>Спейсы <span class="serif">и боты</span></h2><p class="lead">Нажмите на спейс или бота — данные откроются справа, страница останется на месте.</p></div>
        <div class="bar"><h3 class="sub" style="margin:0">Спейсы</h3>${поиск('#sp-rows', 'Найти спейс')}</div>
        ${rowHead('Спейс', true)}<div class="rows" id="sp-rows">${D.spaces.map((s, i) => row(s.name, ботов(s.bots.length), s.t, 's:' + i, true)).join('')}</div>
        <div class="bar"><h3 class="sub" style="margin:0">Все боты</h3>${поиск('#bt-rows', 'Найти бота')}</div>
        ${rowHead('Бот', true)}<div class="rows" id="bt-rows">${Object.values(D.bots).sort((a, b) => b.t.ftd_sum - a.t.ftd_sum).map((b) => row(имяБота(b), [b.space, подБотом(b)].filter(Boolean).join(' · '), b.t, 'b:' + b.id, true)).join('')}</div></section>`;
    },
    sotrudniki() {
      return `<section class="view"><div class="head-blk"><div class="kicker">Сотрудники · ${period()}</div><h2>Все <span class="serif">сотрудники</span></h2><p class="lead">Нажмите на сотрудника — справа откроются его боты и все его игроки с кнопками в Jarvis и Chatterfy.</p></div>
        <div class="bar"><span></span>${поиск('#emps', 'Найти сотрудника')}</div>
        ${rowHead('Сотрудник')}<div class="rows" id="emps">${D.employees.map((e) => row(e.name, ботов(e.bots.length), e.t, 'e:' + e.name)).join('')}</div></section>`;
    },
    sverka() {
      const o = D.check.okk, p = D.check.pp;
      const r = (nm, a, b, f) => { const d = Math.round((b - a) * 100) / 100; return `<div>${nm}</div><div class="r">${f(a)}</div><div class="r">${f(b)}</div><div class="r ${d === 0 ? 'd0' : 'd1'}">${d === 0 ? 'совпадает' : (d > 0 ? '+' : '') + f(d)}</div>`; };
      return `<section class="view"><div class="head-blk"><div class="kicker">Проверка цифр</div><h2>Сверка с <span class="serif">партнёркой</span></h2><p class="lead">Отчёт собран со склада ОКК. Итоги сравнены с ответом API партнёрки PocketOption за тот же период.</p></div>
        <div class="card"><div class="check"><div class="h">Показатель</div><div class="h r">Отчёт</div><div class="h r">Партнёрка</div><div class="h r">Разница</div>
        ${r('Регистрации', o.regs, p.regs, (v) => ru(v))}${r('Первые депозиты', o.ftd, p.ftd, (v) => ru(v))}${r('Первые депозиты, $', o.ftd_sum, p.ftd_sum, usd2)}${r('Все депозиты', o.dep, p.dep, (v) => ru(v))}${r('Все депозиты, $', o.dep_sum, p.dep_sum, usd2)}${r('Выводы, $', o.wdr, p.wdr, usd2)}</div></div>
        <p class="note">Маленькая разница — события текущего дня, пришедшие после последнего сбора склада (${esc(String(D.period.upd).slice(0, 16).replace('T', ' '))} UTC). За закрытые дни цифры совпадают.</p>
        <div class="card"><h4>Откуда цифры</h4><p>• <b>Регистрации, депозиты, выводы</b> — API партнёрки PocketOption, по игрокам и дням (дни — по времени партнёрки).<br>• <b>Чей игрок</b> — сотрудник из постбэка и тега чата Chatterfy.<br>• <b>Бот и спейс</b> — по чату игрока; не нашёлся чат — «Спейс не определён».<br>• <b>Лиды</b> — новые чаты в Chatterfy по московскому времени; Chatterfy не делит их по сотрудникам.</p></div></section>`;
    },
  };

  /* ── игроки (грузятся при первом открытии панели) ── */
  const игроки = () => pLoad || (pLoad = fetch('../oktyabr-2026-players/data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => (P = j)));
  const ПОКАЗ = 60;
  const строкаИгрока = (r, режим) => {
    const [t, ei, bi, ch, рег, f, fs, rd, rs, w] = r, bid = P.b[bi], b = бот(bid), настоящий = !String(bid).startsWith('нет:');
    const чат = настоящий && ch ? 'https://v2.chatterfy.ai/bots/' + encodeURIComponent(bid) + '/chats?chat=' + encodeURIComponent(ch) : '';
    const jarvis = 'https://jarvisfinerp.top/binone/actions/mop-stats/?partner_network_player_id=' + encodeURIComponent(t) + '&show_errors=all&is_api=all';
    return `<div class="pl" data-q="${esc(t + ' ' + P.e[ei] + ' ' + имяБота(b))}"><div class="id">${esc(t)}<small>${esc(режим === 'e' ? имяБота(b) : режим === 'b' ? P.e[ei] : P.e[ei] + ' · ' + имяБота(b))}</small></div>
      <div class="v">${рег ? 'рег' : '—'}<small>${f ? 'FD ' + usd2(fs) : 'без FD'}</small></div><div class="v">${usd(rs)}<small>${ru(rd)} RD</small></div><div class="v">${usd(w)}<small>выводы</small></div>
      <div class="bt"><a class="lnk" href="${jarvis}" target="_blank" rel="noopener">📋 Jarvis</a><a class="lnk${чат ? '' : ' off'}" ${чат ? `href="${чат}" target="_blank" rel="noopener"` : 'aria-disabled="true" title=""'}>💬 Chatterfy</a></div></div>`;
  };
  async function списокИгроков(место, фильтр, режим) {
    место.innerHTML = '<p class="lead">Загружаю игроков…</p>';
    try { await игроки(); } catch (e) { место.innerHTML = '<div class="err">Список игроков не загрузился (' + esc(e.message) + '). Это не «игроков нет» — обновите страницу.</div>'; return; }
    const все = P.rows.filter(фильтр);
    let показ = ПОКАЗ, q = '';
    const нарисовать = () => {
      const видно = q ? все.filter((r) => (r[0] + ' ' + P.e[r[1]] + ' ' + имяБота(бот(P.b[r[2]]))).toLowerCase().includes(q)) : все;
      место.innerHTML = `<div class="bar"><span class="pill">игроков <b>${ru(видно.length)}</b>${q ? ' из ' + ru(все.length) : ''}</span>${поиск('#pl-x', 'ID, сотрудник или бот')}</div>
        <div class="rows">${видно.slice(0, показ).map((r) => строкаИгрока(r, режим)).join('')}</div>${видно.length > показ ? `<button type="button" class="btn more" data-more="1">Показать ещё ${ru(Math.min(ПОКАЗ, видно.length - показ))} из ${ru(видно.length - показ)}</button>` : ''}`;
      const inp = место.querySelector('.sx input'); inp.value = q; if (q) { inp.parentElement.classList.add('on'); inp.focus(); inp.setSelectionRange(q.length, q.length); }
      inp.addEventListener('input', () => { q = inp.value.trim().toLowerCase(); показ = ПОКАЗ; нарисовать(); });
      const m = место.querySelector('[data-more]'); if (m) m.addEventListener('click', () => { показ += ПОКАЗ; нарисовать(); });
    };
    нарисовать();
  }

  /* ── панель справа ── */
  const dr = $('#drawer'), dim = $('#dim'), стек = [];
  const панели = {
    s(i) {
      const s = D.spaces[+i]; if (!s) return null;
      const боты = s.bots.map(бот);
      return { t: 'Спейс · ' + s.name, html: `<div class="head-blk"><div class="kicker">Спейс · ${period()}</div><h2>${esc(s.name)}</h2></div>${tiles(s.t)}${charts(s.daily)}
        <div class="bar"><h3 class="sub" style="margin:0">Боты спейса</h3>${поиск('#d-bots', 'Найти бота')}</div>
        ${rowHead('Бот', true)}<div class="rows" id="d-bots">${боты.map((b) => row(имяБота(b), [подБотом(b), 'рег/лид ' + pct(b.t.regs, b.t.leads), 'FD/рег ' + pct(b.t.ftd, b.t.regs)].filter(Boolean).join(' · '), b.t, 'b:' + b.id, true)).join('')}</div>` };
    },
    b(id) {
      const b = D.bots[id]; if (!b) return null;
      const html = `<div class="head-blk"><div class="kicker">Бот · ${esc(b.space)} · ${period()}</div><h2>${esc(имяБота(b))}</h2>${подБотом(b) ? `<p class="lead">${esc(подБотом(b))}</p>` : ''}
        <div class="conv"><span class="pill">регистрация из лида <b>${pct(b.t.regs, b.t.leads)}</b></span><span class="pill">FD из регистраций <b>${pct(b.t.ftd, b.t.regs)}</b></span><span class="pill">средний FD <b>${b.t.ftd ? usd2(b.t.ftd_sum / b.t.ftd) : '—'}</b></span></div></div>
        ${tiles(b.t)}${charts(b.daily)}
        <div class="bar"><h3 class="sub" style="margin:0">Сотрудники бота</h3>${поиск('#d-emp', 'Найти сотрудника')}</div>
        ${b.emp.length ? rowHead('Сотрудник') + '<div class="rows" id="d-emp">' + b.emp.map((e) => row(e.name, '', e, 'e:' + e.name)).join('') + '</div>' : '<p class="lead">По этому боту за период денег и регистраций нет.</p>'}
        <h3 class="sub">Игроки бота</h3><div id="d-pl"></div>`;
      return { t: 'Бот · ' + имяБота(b), html, после: () => списокИгроков($('#d-pl'), (r) => P.b[r[2]] === id, 'b') };
    },
    e(name) {
      const e = D.employees.find((x) => x.name === name); if (!e) return null;
      const html = `<div class="head-blk"><div class="kicker">Сотрудник · ${period()}</div><h2>${esc(e.name)}</h2></div>${tiles(e.t, '', true)}
        <h3 class="sub">По ботам</h3>${rowHead('Бот')}<div class="rows">${e.bots.map((x) => { const b = бот(x.id); return row(имяБота(b), b.space, x, 'b:' + x.id); }).join('')}</div>
        <h3 class="sub">Игроки сотрудника</h3><div id="d-pl"></div>`;
      return { t: 'Сотрудник · ' + e.name, html, после: () => списокИгроков($('#d-pl'), (r) => P.e[r[1]] === name, 'e') };
    },
  };
  function показатьПанель() {
    const верх = стек[стек.length - 1]; if (!верх) return;
    const [вид, ...ост] = верх.split(':'), п = панели[вид] && панели[вид](ост.join(':'));
    if (!п) return;
    $('#dr-t').textContent = п.t; $('#dr-bd').innerHTML = п.html; $('#dr-bd').scrollTop = 0;
    $('#dr-back').hidden = стек.length < 2;
    if (п.после) п.после();
  }
  function открыть(что, с_нуля) {
    if (с_нуля) стек.length = 0;
    стек.push(что); показатьПанель();
    dr.classList.add('on'); dim.classList.add('on'); dr.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock');
  }
  function закрыть() { dr.classList.remove('on'); dim.classList.remove('on'); dr.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); стек.length = 0; }
  $('#dr-x').addEventListener('click', закрыть); dim.addEventListener('click', закрыть);
  $('#dr-back').addEventListener('click', () => { стек.pop(); показатьПанель(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && dr.classList.contains('on')) закрыть(); });
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]'); if (!o) return;
    e.preventDefault(); открыть(o.dataset.open, !dr.contains(o));   // из панели — вглубь со стрелкой «назад», со страницы — с нуля
  });

  /* ── поиск-лупа: наведение раскрывает и сразу даёт писать; пусто и курсор ушёл — сворачивается ── */
  const фильтр = (sx) => { const цель = sx.dataset.sx; if (!цель || цель === '#pl-x') return; const box = $(цель); if (!box) return; const v = sx.querySelector('input').value.trim().toLowerCase();
    [...box.children].forEach((el) => { el.hidden = v && !el.textContent.toLowerCase().includes(v); }); };
  document.addEventListener('mouseover', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (!sx || sx.classList.contains('on')) return; sx.classList.add('on'); const i = sx.querySelector('input'); setTimeout(() => i.focus({ preventScroll: true }), 60); });
  document.addEventListener('mouseout', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (!sx || sx.contains(e.relatedTarget)) return; const i = sx.querySelector('input'); if (!i.value) { sx.classList.remove('on'); i.blur(); } });
  document.addEventListener('focusout', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx && !e.target.value && !sx.matches(':hover')) sx.classList.remove('on'); });
  document.addEventListener('click', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx) { sx.classList.add('on'); sx.querySelector('input').focus(); } });
  document.addEventListener('input', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx) фильтр(sx); });

  /* ── свет под курсором ── */
  document.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }, { passive: true });

  /* ── главные страницы без перезагрузки ── */
  const ГЛАВНЫЕ = ['obzor', 'spaces', 'sotrudniki', 'sverka'];
  let был = '';
  const show = () => { const h = decodeURIComponent(location.hash.slice(1)); const v = ГЛАВНЫЕ.includes(h) ? h : 'obzor';
    $('#app').innerHTML = V[v](); setNav(v); scrollTo({ top: 0, behavior: 'instant' }); onScroll();
    const m = /^(s|b|e):(.+)$/.exec(h); if (m) открыть(h, true);   // старые ссылки на спейс/бота/сотрудника открывают панель
  };
  const go = () => { if (location.hash === был) return; был = location.hash; закрыть();
    if (document.startViewTransition && !reduce) { const t = document.startViewTransition(show); t.ready.catch(() => {}); t.finished.catch(() => {}); setTimeout(() => t.skipTransition(), 450); } else show(); };

  fetch('data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => {
    D = d;
    $('#foot').textContent = 'Nexus · отчёт за ' + period() + ' · склад ОКК от ' + String(d.period.upd).slice(0, 16).replace('T', ' ') + ' UTC, сверен с партнёркой';
    был = location.hash; show(); addEventListener('hashchange', go);
  }).catch((e) => { $('#app').innerHTML = '<div class="err">Отчёт не загрузился (' + esc(e.message) + '). Это не «данных нет» — обновите страницу; если не помогает, войдите заново.</div>'; });
})();
