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
  let D = null, P = null, pLoad = null, KP = null, kpLoad = null, TB = null, tbLoad = null, tbErr = '';

  /* ── тема ── */
  const cur = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', SUN = 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z';
  const themeUi = () => { const d = cur() === 'dark'; $('#theme-t').textContent = d ? 'Светлая' : 'Тёмная'; $('#theme-ic').setAttribute('d', d ? SUN : MOON); };
  themeUi();
  $('#theme').addEventListener('click', () => { const n = cur() === 'dark' ? 'light' : 'dark'; const set = () => { document.documentElement.dataset.theme = n; themeUi(); }; if (document.startViewTransition && !reduce) document.startViewTransition(set); else set(); try { localStorage.setItem('km-theme', n); } catch (_) {} });

  /* ── шапка (как у юриста) ── */
  const head = $('#head'), nav = $('#nav'), ind = $('#ind');
  let compact = null, tick = false;
  const onScroll = () => { const y = scrollY, c = compact ? y > 8 : y > 24; if (c !== compact) { compact = c; head.classList.toggle('compact', c); head.style.setProperty('--k', c ? 1 : 0); } };
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

  const tiles = (t, extra, безЛидов, подписьЛидов) => `<div class="tiles n${(безЛидов ? 5 : 6) + (extra ? 1 : 0)}">
    ${безЛидов ? '' : `<div class="tile bl"><b>${ru(t.leads)}</b><span>Лиды</span><small>${подписьЛидов || 'новые чаты Chatterfy'}</small></div>`}
    <div class="tile"><b>${ru(t.regs)}</b><span>Регистрации</span><small>${безЛидов ? 'партнёрка' : pct(t.regs, t.leads) + ' от лидов'}</small></div>
    <div class="tile ok"><b>${ru(t.ftd)}</b><span>Первые депозиты</span><small>${usd2(t.ftd_sum)} · ${pct(t.ftd, t.regs)} от рег</small></div>
    <div class="tile"><b>${ru(t.rd)}</b><span>Повторные депозиты</span><small>${usd2(t.rd_sum)}</small></div>
    <div class="tile or"><b>${usd(t.ftd_sum + t.rd_sum)}</b><span>Все депозиты</span><small>FD ${usd(t.ftd_sum)} + RD ${usd(t.rd_sum)}</small></div>
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

  /* ── когорта: считается на лету из списка игроков под выбранные дни регистрации ── */
  let kpErr = '', вид = '';
  const днейОбн = () => String(KP ? KP.upd : TB ? TB.upd : '2026-10-31').slice(0, 10);
  const сегодня = () => (днейОбн() > '2026-10-31' ? '2026-10-31' : днейОбн());      // регистрации когорты — только октябрь
  const доFD = () => (днейОбн() > '2026-11-10' ? '2026-11-10' : днейОбн());          // её депозиты — до конца докатки
  let kОт = '2026-10-01', kДо = '';
  const вПериоде = (r) => { const d = String(r[4]); return d >= kОт && d <= (kДо || сегодня()); };
  const нуль = () => ({ regs: 0, ftd: 0, ftd_sum: 0, rd: 0, rd_sum: 0, wdr: 0 });
  const плюс = (a, r) => { a.regs++; a.ftd += r[5]; a.ftd_sum += r[6]; a.rd += r[7]; a.rd_sum += r[8]; a.wdr += r[9]; return a; };
  function кДанные(фильтр) {
    const rows = KP.rows.filter((r) => вПериоде(r) && фильтр(r));
    const total = нуль(), E = new Map(), B = new Map(), S = new Map(), Д = new Map();
    for (const r of rows) {
      плюс(total, r);
      const имя = KP.e[r[1]], bid = KP.b[r[2]], sp = KP.bs[r[2]];
      if (!E.has(имя)) E.set(имя, Object.assign(нуль(), { name: имя, botsSet: new Set() }));
      плюс(E.get(имя), r).botsSet.add(bid);
      if (!B.has(bid)) B.set(bid, Object.assign(нуль(), { id: bid, name: KP.bn[r[2]], space: sp }));
      плюс(B.get(bid), r);
      if (!S.has(sp)) S.set(sp, Object.assign(нуль(), { name: sp }));
      плюс(S.get(sp), r);
      const день = (x) => { if (!Д.has(x)) Д.set(x, { day: x, regs: 0, regsF: 0, ftd: 0, fs: 0 }); return Д.get(x); };
      const d = день(String(r[4])); d.regs++; if (r[5]) d.regsF++;
      const fd = String(r[10] || ''); if (fd && r[5]) { const x = день(fd); x.ftd += r[5]; x.fs += r[6]; }
    }
    const поДеньгам = (a, b) => (b.ftd_sum + b.rd_sum) - (a.ftd_sum + a.rd_sum) || b.regs - a.regs;
    const дни = (до) => { const out = []; for (let d = new Date(kОт + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= до; d.setUTCDate(d.getUTCDate() + 1)) { const k = d.toISOString().slice(0, 10); out.push(Д.get(k) || { day: k, regs: 0, regsF: 0, ftd: 0, fs: 0 }); } return out; };
    const days = дни(kДо || сегодня()), daysF = дни(доFD());   // регистрации — в выбранные дни, первые депозиты — от первого дня по сегодня
    return { rows, total, days, daysF,
      emps: [...E.values()].map((e) => Object.assign(e, { bots: [...e.botsSet] })).sort((a, b) => (a.name === 'Сотрудник не определён') - (b.name === 'Сотрудник не определён') || поДеньгам(a, b)),
      bots: [...B.values()].sort(поДеньгам), spaces: [...S.values()].sort((a, b) => (a.name === 'Спейс не определён') - (b.name === 'Спейс не определён') || поДеньгам(a, b)) };
  }
  /* ── график когорты: свои подсказки при наведении (без системного title) ── */
  const ДН = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const kChart = (title, note, daily, f, fmt, color, подсказка) => {
    const W = 640, H = 170, Pd = { l: 6, r: 6, t: 14, b: 22 }, vals = daily.map(f), max = Math.max(1, ...vals), bw = (W - Pd.l - Pd.r) / daily.length;
    const bars = daily.map((d, i) => { const h = (vals[i] / max) * (H - Pd.t - Pd.b); const x = Pd.l + i * bw + bw * .15, y = H - Pd.b - h;
      const [a, b] = подсказка(d), дн = ДН[new Date(d.day + 'T00:00:00Z').getUTCDay()];
      return `<g class="kb-g" data-ki="${i}" data-t="${esc(дм(d.day) + ', ' + дн)}" data-a="${esc(a)}" data-b="${esc(b || '')}"><rect class="kb-hit" x="${(Pd.l + i * bw).toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${H - Pd.b}" fill="transparent"/><rect class="kb-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * .7).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" fill="${color}"/></g>`; }).join('');
    const шаг = daily.length > 16 ? 3 : 1;
    const ticks = daily.map((d, i) => (i % шаг === 0 || i === daily.length - 1) ? `<text class="ax" x="${(Pd.l + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d.day.slice(8)}</text>` : '').join('');
    const mi = vals.indexOf(max);
    const peak = `<text class="ax" x="${(Pd.l + mi * bw + bw / 2).toFixed(1)}" y="${(Pd.t - 3).toFixed(1)}" text-anchor="middle" style="fill:var(--tx2)">${fmt(max)}</text>`;
    return `<div class="chart kch"><div class="tt"><b>${esc(title)}</b><small>${esc(note)}</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><line x1="0" x2="${W}" y1="${H - Pd.b}" y2="${H - Pd.b}" stroke="var(--ln2)"/>${bars}${peak}${ticks}</svg><div class="k-tip" aria-hidden="true"><small></small><b></b><span></span></div></div>`;
  };
  const kCharts = (k) => `<div class="charts k-charts">${kChart('Регистрации когорты по дням', 'партнёрка', k.days, (d) => d.regs, (v) => ru(v), 'var(--or2)', (d) => [ru(d.regs) + ' рег', d.regs ? 'из них с FD: ' + ru(d.regsF) + ' · ' + pct(d.regsF, d.regs) : ''])}${kChart('Первые депозиты когорты по дням', 'по дню FD, до сегодня', k.daysF, (d) => d.ftd, (v) => ru(v), 'var(--ok)', (d) => [ru(d.ftd) + ' FD', d.ftd ? 'на ' + usd2(d.fs) : ''])}</div>`;
  const kОтметить = (g) => {
    const box = g.closest('.kch'), tip = box.querySelector('.k-tip'), svg = box.querySelector('svg');
    svg.querySelectorAll('.kb-g.on').forEach((x) => x !== g && x.classList.remove('on')); g.classList.add('on'); svg.classList.add('hov');
    tip.querySelector('small').textContent = g.dataset.t; tip.querySelector('b').textContent = g.dataset.a; tip.querySelector('span').textContent = g.dataset.b; tip.querySelector('span').hidden = !g.dataset.b;
    const rb = box.getBoundingClientRect(), rg = g.querySelector('.kb-bar').getBoundingClientRect(), rs = svg.getBoundingClientRect();
    tip.classList.add('on');
    const w = tip.offsetWidth, x = Math.min(Math.max(rg.left + rg.width / 2 - rb.left - w / 2, 8), rb.width - w - 8);
    tip.style.left = x + 'px'; tip.style.top = Math.max(rs.top - rb.top, Math.min(rg.top, rs.bottom - 22) - rb.top - tip.offsetHeight - 8) + 'px';
  };
  const kСнять = (box) => { box.querySelector('.k-tip').classList.remove('on'); box.querySelector('svg').classList.remove('hov'); box.querySelectorAll('.kb-g.on').forEach((x) => x.classList.remove('on')); };
  document.addEventListener('pointerover', (e) => { const g = e.target.closest && e.target.closest('.kch .kb-g'); if (g) kОтметить(g); });
  document.addEventListener('pointerout', (e) => { const box = e.target.closest && e.target.closest('.kch'); if (box && !box.contains(e.relatedTarget)) kСнять(box); });

  const чек = (x) => (x && x.ftd ? usd2((x.ftd_sum + x.rd_sum) / x.ftd) : '—');
  const kTiles = (t) => `<div class="tiles n6">
    <div class="tile"><b>${ru(t.regs)}</b><span>Регистрации</span><small>игроков в когорте</small></div>
    <div class="tile ok"><b>${ru(t.ftd)}</b><span>Первые депозиты</span><small>${usd2(t.ftd_sum)} · ${pct(t.ftd, t.regs)} от рег</small></div>
    <div class="tile"><b>${ru(t.rd)}</b><span>Повторные депозиты</span><small>${usd2(t.rd_sum)}</small></div>
    <div class="tile"><b>${usd(t.ftd_sum + t.rd_sum)}</b><span>Все депозиты</span><small>FD ${usd(t.ftd_sum)} + RD ${usd(t.rd_sum)}</small></div>
    <div class="tile or"><b>${чек(t)}</b><span>Средний чек</span><small>(FD $ + RD $) ÷ кол-во FD</small></div>
    <div class="tile"><b>${usd(t.wdr)}</b><span>Выводы</span><small>исполненные</small></div></div>`;
  const kHead = (first) => `<div class="row hd wl"><div>${first}</div><div class="v">Рег</div><div class="v">FD</div><div class="v">FD, $</div><div class="v">RD, $</div><div class="v">Все, $</div><div class="v">Ср. чек</div></div>`;
  const kRow = (name, sub, t, open) => `<${open ? `button type="button" data-open="${esc(open)}"` : 'div'} class="row wl"><div class="nm">${esc(name)}${sub ? '<small>' + esc(sub) + '</small>' : ''}</div>
    <div class="v" data-l="Рег">${ru(t.regs)}</div><div class="v" data-l="FD">${ru(t.ftd)}</div><div class="v" data-l="FD, $">${usd(t.ftd_sum)}</div>
    <div class="v" data-l="RD, $">${usd(t.rd_sum)}<small>${ru(t.rd)} деп</small></div><div class="v" data-l="Все, $">${usd(t.ftd_sum + t.rd_sum)}</div><div class="v" data-l="Ср. чек"><b>${чек(t)}</b></div></${open ? 'button' : 'div'}>`;

  /* ── свой календарь (без системного): дни регистрации, промежуток двумя нажатиями, быстрые кнопки ── */
  const дм = (iso) => iso.slice(8, 10) + '.' + iso.slice(5, 7);
  const МЕС = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  let calOpen = false, calПик = '', kСписок = '';
  const шеврон = '<svg class="k-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const сдвиг = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  function календарь(подпись = 'Регистрации') {
    const до = kДо || сегодня(), сег = сегодня();
    const нач = '2026-10-01', перв = new Date(нач + 'T00:00:00Z'), сдв = (перв.getUTCDay() + 6) % 7;
    let клетки = '<span class="cal-wd">Пн</span><span class="cal-wd">Вт</span><span class="cal-wd">Ср</span><span class="cal-wd">Чт</span><span class="cal-wd">Пт</span><span class="cal-wd">Сб</span><span class="cal-wd">Вс</span>' + '<span></span>'.repeat(сдв);
    for (let i = 0; i < 31; i++) {
      const d = сдвиг(нач, i), нет = d > сег, вн = d >= kОт && d <= до, край = d === kОт || d === до || d === calПик;
      клетки += `<button type="button" class="cal-d${вн ? ' in' : ''}${край ? ' edge' : ''}${d === сег ? ' today' : ''}" data-day="${d}" ${нет ? 'disabled' : ''}>${i + 1}</button>`;
    }
    const пн = (() => { const d = new Date(сег + 'T00:00:00Z'); return сдвиг(сег, -((d.getUTCDay() + 6) % 7)); })();
    const пресет = (txt, a, b) => `<button type="button" class="cal-p${kОт === a && до === b ? ' on' : ''}" data-cal="${a}|${b}">${txt}</button>`;
    return `<div class="cal-wrap"><button type="button" class="btn cal-btn" data-calbtn="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>${подпись}: ${дм(kОт)}${kОт === до ? '' : ' — ' + дм(до)}<svg class="cal-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="cal-pop${calOpen ? ' open' : ''}"><div class="cal-ps">${пресет('Весь месяц', нач, сег)}${днейОбн() > сег ? '' : пресет('Эта неделя', пн < нач ? нач : пн, сег) + пресет('Вчера', сдвиг(сег, -1), сдвиг(сег, -1)) + пресет('Сегодня', сег, сег)}</div>
      <div class="cal-m">${МЕС[9]} 2026</div><div class="cal-g">${клетки}</div><p class="cal-h">${calПик ? 'Выберите последний день' : 'Нажмите первый день, затем последний'}</p></div></div>`;
  }
  const перерисовать = () => { if (вид === 'tablica') { тРисовать(); return; } if (вид !== 'kogorta') return; const y = scrollY; $('#app').innerHTML = V.kogorta(); scrollTo({ top: y, behavior: 'instant' }); };
  document.addEventListener('click', (e) => {
    const сп = e.target.closest('[data-klist]');
    if (сп) { kСписок = kСписок === сп.dataset.klist ? '' : сп.dataset.klist;
      document.querySelectorAll('[data-klist]').forEach((b) => b.classList.toggle('on', b.dataset.klist === kСписок));
      document.querySelectorAll('.k-pane').forEach((x) => x.classList.toggle('on', x.dataset.pane === kСписок));
      const f = $('.k-fold'); if (f) f.classList.toggle('open', !!kСписок);
      const h = $('.k-sw-h'); if (h) h.textContent = kСписок ? 'нажмите строку — справа откроются подробности' : 'нажмите, чтобы раскрыть список';
      return; }
    const кн = e.target.closest('[data-calbtn]');
    if (кн) { calOpen = !calOpen; calПик = ''; $('.cal-pop') && $('.cal-pop').classList.toggle('open', calOpen); return; }
    const пр = e.target.closest('[data-cal]');
    if (пр) { [kОт, kДо] = пр.dataset.cal.split('|'); calOpen = false; calПик = ''; перерисовать(); return; }
    const дн = e.target.closest('[data-day]');
    if (дн) { const d = дн.dataset.day;
      if (!calПик) { calПик = d; kОт = d; kДо = d; перерисовать(); return; }
      [kОт, kДо] = d < calПик ? [d, calПик] : [calПик, d]; calПик = ''; calOpen = false; перерисовать(); return; }
    if (calOpen && !e.target.closest('.cal-pop')) { calOpen = false; calПик = ''; $('.cal-pop') && $('.cal-pop').classList.remove('open'); }
  });

  const игрокиК = () => kpLoad || (kpLoad = fetch('../oktyabr-2026-kogorta-pl/data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => (KP = j), (e) => { kpErr = String(e.message || e); throw e; }));
  const строкаК = (r, режим) => {
    const [t, ei, bi, ch, рег, f, fs, rd, rs] = r, bid = KP.b[bi], настоящий = !String(bid).startsWith('нет:');
    const чат = настоящий && ch ? 'https://v2.chatterfy.ai/bots/' + encodeURIComponent(bid) + '/chats?chat=' + encodeURIComponent(ch) : '';
    const jarvis = 'https://jarvisfinerp.top/binone/actions/mop-stats/?partner_network_player_id=' + encodeURIComponent(t) + '&show_errors=all&is_api=all';
    return `<div class="pl"><div class="id">${esc(t)}<small>${esc(режим === 'e' ? KP.bn[bi] : KP.e[ei])} · рег ${esc(дм(String(рег)))}</small></div>
      <div class="v">${f ? usd2(fs) : '—'}<small>${f ? 'FD' : 'без FD'}</small></div><div class="v">${usd(rs)}<small>${ru(rd)} RD</small></div><div class="v">${usd(fs + rs)}<small>всего</small></div>
      <div class="bt"><a class="lnk" href="${jarvis}" target="_blank" rel="noopener">📋 Jarvis</a><a class="lnk${чат ? '' : ' off'}" ${чат ? `href="${чат}" target="_blank" rel="noopener"` : 'aria-disabled="true" title=""'}>💬 Chatterfy</a></div></div>`;
  };
  async function списокК(место, фильтр, режим) {
    место.innerHTML = '<p class="lead">Загружаю игроков когорты…</p>';
    try { await игрокиК(); } catch (e) { место.innerHTML = '<div class="err">Игроки когорты не загрузились (' + esc(e.message) + '). Это не «игроков нет» — обновите страницу.</div>'; return; }
    const все = KP.rows.filter((r) => вПериоде(r) && фильтр(r));
    let показ = ПОКАЗ, q = '', толькоFD = false;
    const нарисовать = () => {
      let видно = толькоFD ? все.filter((r) => r[5] > 0) : все;
      if (q) видно = видно.filter((r) => (r[0] + ' ' + KP.e[r[1]] + ' ' + KP.bn[r[2]]).toLowerCase().includes(q));
      место.innerHTML = `<div class="bar"><span class="conv"><span class="pill">игроков <b>${ru(видно.length)}</b></span><button type="button" class="pill fd-t${толькоFD ? ' on' : ''}" data-fd="1">${толькоFD ? '✓ ' : ''}только с депозитом</button></span>${поиск('#pl-x', 'ID, сотрудник или бот')}</div>
        <div class="rows">${видно.slice(0, показ).map((r) => строкаК(r, режим)).join('')}</div>${видно.length > показ ? `<button type="button" class="btn more" data-more="1">Показать ещё ${ru(Math.min(ПОКАЗ, видно.length - показ))} из ${ru(видно.length - показ)}</button>` : ''}`;
      const inp = место.querySelector('.sx input'); inp.value = q; if (q) { inp.parentElement.classList.add('on'); inp.focus(); inp.setSelectionRange(q.length, q.length); }
      inp.addEventListener('input', () => { q = inp.value.trim().toLowerCase(); показ = ПОКАЗ; нарисовать(); });
      место.querySelector('[data-fd]').addEventListener('click', () => { толькоFD = !толькоFD; показ = ПОКАЗ; нарисовать(); });
      const m = место.querySelector('[data-more]'); if (m) m.addEventListener('click', () => { показ += ПОКАЗ; нарисовать(); });
    };
    нарисовать();
  }
  const период = () => дм(kОт) + (kОт === (kДо || сегодня()) ? '' : ' — ' + дм(kДо || сегодня()));


  /* ── вкладка «Таблица»: сводная как в Jarvis, но наши цифры — гео › спейс › бот › сотрудник, свой фильтр,
     шапка и итог закреплены; режимы «за месяц» (все игроки) и «когорта» (зарегистрированные в выбранные дни) ── */
  const данныеТ = () => tbLoad || (tbLoad = fetch('../oktyabr-2026-tablica/data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => (TB = j), (e) => { tbErr = String(e.message || e); throw e; }));
  const ГЕО = ['MENA', 'СНГ', 'MULTI', 'ЛАТАМ', 'Не определено'];
  // гео по названию спейса (владелец 24.10: «все мульти — в мульти, все СНГ — в СНГ»; Австралия и Канада — MULTI, Испания — ЛАТАМ)
  const геоСпейса = (sp) => { const x = String(sp || '').toLowerCase(); if (/араб|марокко/.test(x)) return 'MENA'; if (/^снг/.test(x)) return 'СНГ'; if (/мульти|австрал|канад/.test(x)) return 'MULTI'; if (/латам|испан/.test(x)) return 'ЛАТАМ'; return 'Не определено'; };
  const ф = { м: 'month', гео: new Set(), сп: new Set(), бот: new Set(), минус: new Set(), гр: 'bot', скр: new Set(), сорт: 'all', вниз: true, откр: new Set(), было: false, пп: '', ппq: '' };
  // колонки; конверсии — маленькой строкой под цифрой (чтобы таблица влезала по ширине без прокрутки вбок)
  const КОЛ = [
    { k: 'leads', t: 'Лиды', f: (a) => (a.лиды == null ? '—' : ru(a.лиды)), м: 'month' },
    { k: 'regs', t: 'Рег', t2: '% от лидов', м2: 'month', f: (a) => ru(a.regs), под: (a) => (ф.м === 'month' && a.лиды ? pct(a.regs, a.лиды) : '') },
    { k: 'ftd', t: 'FD', t2: '% от рег', f: (a) => ru(a.ftd), под: (a) => (a.regs ? pct(a.ftd, a.regs) : '') },
    { k: 'ftd_sum', t: 'FD, $', f: (a) => usd(a.ftd_sum) },
    { k: 'rd', t: 'RD', f: (a) => ru(a.rd) },
    { k: 'rd_sum', t: 'RD, $', f: (a) => usd(a.rd_sum) },
    { k: 'all', t: 'Все, $', f: (a) => usd(a.ftd_sum + a.rd_sum) },
    { k: 'check', t: 'Ср. чек', f: (a) => чек(a) },
    { k: 'wdr', t: 'Выводы, $', f: (a) => usd(a.wdr) },
  ];
  const колонки = () => КОЛ.filter((c) => (!c.м || c.м === ф.м) && !ф.скр.has(c.k));
  const знч = (a, k) => (k === 'all' ? a.ftd_sum + a.rd_sum : k === 'check' ? (a.ftd ? (a.ftd_sum + a.rd_sum) / a.ftd : -1) : k === 'leads' ? (a.лиды == null ? -1 : a.лиды) : a[k]);
  const НЕТ = /не определ/i;
  const записиКэш = {};
  function записи() {
    if (записиКэш[ф.м]) return записиКэш[ф.м];
    const out = [];
    if (ф.м === 'month') {
      const B = (bi) => ({ bid: TB.b[bi], bn: TB.bn[bi], sp: TB.bs[bi], geo: геоСпейса(TB.bs[bi]) });
      for (const [d, ei, bi, regs, ftd, fs, rd, rs, w] of TB.rows) out.push({ d, ...B(bi), emp: TB.e[ei], lb: 0, le: 0, regs, ftd, ftd_sum: fs, rd, rd_sum: rs, wdr: w });
      for (const [d, bi, n] of TB.leads) out.push({ d, ...B(bi), emp: '', lb: n, le: 0, regs: 0, ftd: 0, ftd_sum: 0, rd: 0, rd_sum: 0, wdr: 0 });
      for (const [bi, ei, n] of TB.le) out.push({ d: null, ...B(bi), emp: TB.e[ei], lb: 0, le: n, regs: 0, ftd: 0, ftd_sum: 0, rd: 0, rd_sum: 0, wdr: 0 });
    } else {
      for (const [, ei, bi, , рег, f, fs, rd, rs, w] of KP.rows) out.push({ d: String(рег), bid: KP.b[bi], bn: KP.bn[bi], sp: KP.bs[bi], geo: геоСпейса(KP.bs[bi]), emp: KP.e[ei], lb: 0, le: 0, regs: 1, ftd: f, ftd_sum: fs, rd, rd_sum: rs, wdr: w });
    }
    return (записиКэш[ф.м] = out);
  }
  const последнийДень = () => (TB ? TB.rows.reduce((m, r) => (r[0] > m ? r[0] : m), '') : '');
  const весьМесяц = () => kОт <= '2026-10-01' && (kДо || сегодня()) >= последнийДень();
  function отбор() {
    const все = записи(), до = kДо || сегодня(), целый = ф.м === 'month' && весьМесяц();
    const вПер = (r) => (r.d == null ? целый : r.d >= kОт && r.d <= до);
    const вПериоде = все.filter(вПер);
    const поГео = вПериоде.filter((r) => !ф.гео.size || ф.гео.has(r.geo));
    const поСп = поГео.filter((r) => !ф.сп.size || ф.сп.has(r.sp));
    const поБот = поСп.filter((r) => !ф.бот.size || ф.бот.has(r.bid));
    const итог = поБот.filter((r) => !r.emp || !ф.минус.has(r.emp));
    const счёт = (L, k, имя = (r) => r[k]) => { const m = new Map(); for (const r of L) if (r[k] && (r.regs || r.lb || r.le)) { const x = m.get(r[k]) || { имя: имя(r), n: 0 }; x.n += r.regs; m.set(r[k], x); } return m; };
    return { итог, целый, гео: счёт(вПериоде, 'geo'), спейсы: счёт(поГео, 'sp'), боты: счёт(поСп, 'bid', (r) => r.bn), люди: счёт(поБот.filter((r) => r.emp), 'emp') };
  }
  const нуль2 = () => ({ regs: 0, ftd: 0, ftd_sum: 0, rd: 0, rd_sum: 0, wdr: 0, lb: 0, le: 0 });
  function дерево(L) {
    const уровни = ф.гр === 'bot' ? ['geo', 'sp', 'bid', 'emp'] : ['geo', 'emp', 'bid'];
    const корень = { a: нуль2(), kids: new Map() };
    const плюс2 = (a, r) => { for (const k of ['regs', 'ftd', 'ftd_sum', 'rd', 'rd_sum', 'wdr', 'lb', 'le']) a[k] += r[k]; };
    for (const r of L) {
      плюс2(корень.a, r);
      let узел = корень, путь = '';
      for (let i = 0; i < уровни.length; i++) {
        const k = уровни[i], v = r[k];
        if (!v) break;                                  // лиды бота без сотрудника — до уровня бота
        путь += (путь ? '¦' : '') + v;
        if (!узел.kids.has(v)) узел.kids.set(v, { путь, тип: k, ключ: v, ярлык: k === 'bid' ? r.bn : v, sp: r.sp, a: нуль2(), kids: new Map(), ур: i, подЛюдьми: ф.гр === 'emp' && k === 'bid' });
        узел = узел.kids.get(v); плюс2(узел.a, r);
      }
    }
    return корень;
  }
  // лиды узла: у сотрудника и у бота под сотрудником — чаты с его именным тегом (только за весь месяц); выше — все новые чаты бота
  const сЛидами = (узел, целый) => { const a = { ...узел.a }; a.лиды = ф.м !== 'month' ? null : (узел.тип === 'emp' || узел.подЛюдьми) ? (целый ? узел.a.le : null) : узел.a.lb; return a; };
  const порядок = (x, y) => (НЕТ.test(x.ярлык) - НЕТ.test(y.ярлык)) || ((знч(сЛидами(y, true), ф.сорт) - знч(сЛидами(x, true), ф.сорт)) * (ф.вниз ? 1 : -1));
  const мн = (n, a, b, c) => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? a : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? b : c);
  const подписьУзла = (n) => (n.тип === 'geo' ? (ф.гр === 'bot' ? мн(n.kids.size, 'спейс', 'спейса', 'спейсов') : мн(n.kids.size, 'сотрудник', 'сотрудника', 'сотрудников'))
    : n.тип === 'sp' ? ботов(n.kids.size) : n.тип === 'bid' ? (ф.гр === 'emp' ? n.sp : (n.kids.size ? мн(n.kids.size, 'сотрудник', 'сотрудника', 'сотрудников') : '')) : (n.kids.size ? ботов(n.kids.size) : ''));
  const ячейка = (c, a) => `<td>${c.f(a)}${c.под && !ф.скр.has('conv') && c.под(a) ? '<small>' + c.под(a) + '</small>' : ''}</td>`;
  const СТРЕЛКА = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  let видноСейчас = new Set();
  function строкиТ(узел, целый, cols, out) {
    for (const n of [...узел.kids.values()].sort(порядок)) {
      const a = сЛидами(n, целый), откр = ф.откр.has(n.путь), есть = n.kids.size > 0;
      const куда = n.тип === 'emp' ? (ф.м === 'month' ? 'e:' : 'k:') + n.ключ : n.тип === 'bid' ? (ф.м === 'month' ? 'b:' : 'kb:') + n.ключ : '';
      const нов = ф.видно && !ф.видно.has(n.путь); видноСейчас.add(n.путь);
      out.push(`<tr class="l${n.ур}${есть ? ' has' : ''}${откр ? ' open' : ''}${нов ? ' appear' : ''}" ${есть ? `data-tt="${esc(n.путь)}"` : ''}><td class="nm"><div class="nmi" style="padding-left:${n.ур * 12}px"><span class="chev${есть ? '' : ' nope'}">${СТРЕЛКА}</span><span class="lbl">${esc(n.ярлык).replace(/_/g, '_<wbr>')}<small>${esc(подписьУзла(n))}</small></span>${куда ? `<button type="button" class="tb-go" data-open="${esc(куда)}" aria-label="Подробно справа"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></button>` : ''}</div></td>${cols.map((c) => ячейка(c, a)).join('')}</tr>`);
      if (есть && откр) строкиТ(n, целый, cols, out);
    }
    return out;
  }
  /* ── фильтр: компактная панель, списки — во всплывающих окнах с поиском и галочками ── */
  const ШЕВ = '<svg class="tb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  const ИК = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6m0 0-3-3m3 3 3-3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 8 5 5 5-5M7 14l5 5 5-5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 16 5-5 5 5M7 10l5-5 5 5"/></svg>',
  };
  const сег = (пары, тек, attr) => `<div class="tb-seg">${пары.map(([v, t]) => `<button type="button" class="${тек === v ? 'on' : ''}" ${attr}="${v}">${t}</button>`).join('')}</div>`;
  function выпадашка(имя, ярлык, знач, тело, n) {
    const откр = ф.пп === имя;
    return `<div class="tb-dw"><button type="button" class="tb-dd${откр ? ' open' : ''}${знач !== 'все' && знач !== 'Все' && знач !== 'все колонки' ? ' set' : ''}" data-dd="${имя}"><span>${ярлык}</span><b>${esc(знач)}</b>${ШЕВ}</button>
      <div class="tb-pop${откр ? ' open' : ''}" data-pop="${имя}">${n > 8 ? `<label class="tb-q"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="text" placeholder="Найти" autocomplete="off" value="${esc(откр ? ф.ппq : '')}"></label>` : ''}<div class="tb-list">${тело}</div></div></div>`;
  }
  const пункт = (txt, on, data, n, класс = '') => `<button type="button" class="tb-it${on ? ' on' : ''}${класс}" ${data}><span class="ck"></span><span class="n">${esc(txt)}</span>${n != null ? '<em>' + ru(n) + '</em>' : ''}</button>`;
  const сорт2 = (m) => [...m].sort((a, b) => (НЕТ.test(a[1].имя) - НЕТ.test(b[1].имя)) || b[1].n - a[1].n);
  const значение = (S, m, слово) => (!S.size ? 'все' : S.size === 1 ? (m.get([...S][0]) || { имя: [...S][0] }).имя : S.size + ' ' + слово);
  function тПанель(о) {
    const список = (ключ, m, все) => пункт('Все', !ф[ключ].size, `data-tc="${ключ}"`, null, ' all') + сорт2(m).map(([v, x]) => пункт(x.имя, ф[ключ].has(v), `data-tf="${ключ}" data-v="${esc(v)}"`, x.n)).join('');
    const гео = new Map(ГЕО.filter((g) => о.гео.has(g)).map((g) => [g, о.гео.get(g)]));
    const люди = пункт('Все', !ф.минус.size, 'data-tc="минус"', null, ' all') + сорт2(о.люди).map(([v, x]) => пункт(x.имя, !ф.минус.has(v), `data-tf="минус" data-v="${esc(v)}"`, x.n)).join('');
    const видно = КОЛ.filter((c) => !c.м || c.м === ф.м);
    const колонкиHtml = видно.map((c) => пункт(c.t, !ф.скр.has(c.k), `data-tf="скр" data-v="${c.k}"`)).join('') + пункт('Конверсии под цифрами', !ф.скр.has('conv'), 'data-tf="скр" data-v="conv"', null, ' sep');
    const людиЗн = !ф.минус.size ? 'все' : (о.люди.size - [...ф.минус].filter((x) => о.люди.has(x)).length) + ' из ' + о.люди.size;
    const скрыто = видно.filter((c) => ф.скр.has(c.k)).length;
    return `<div class="tb-ctl">
      <div class="tb-r">${сег([['month', 'За месяц'], ['kog', 'Когорта']], ф.м, 'data-tm')}${календарь(ф.м === 'month' ? 'Период' : 'Регистрации')}
        <span class="tb-sp"></span><button type="button" class="btn" data-tx="pdf">${ИК.pdf}<span class="tl">PDF</span></button><button type="button" class="btn" data-tx="link">${ИК.link}<span class="tl">Ссылка на вид</span></button><button type="button" class="btn" data-tx="reset" aria-label="Сбросить фильтр">${ИК.reset}<span class="tl">Сбросить</span></button></div>
      <div class="tb-r">${выпадашка('гео', 'Гео', значение(ф.гео, гео, 'гео'), список('гео', гео), гео.size)}${выпадашка('сп', 'Спейсы', значение(ф.сп, о.спейсы, 'спейса'), список('сп', о.спейсы), о.спейсы.size)}${выпадашка('бот', 'Боты', значение(ф.бот, о.боты, 'бота'), список('бот', о.боты), о.боты.size)}${выпадашка('минус', 'Сотрудники', людиЗн, люди, о.люди.size)}${выпадашка('кол', 'Колонки', скрыто ? 'скрыто ' + скрыто : 'все колонки', колонкиHtml, 0)}
        <span class="tb-sp"></span>${сег([['bot', 'По ботам'], ['emp', 'По сотрудникам']], ф.гр, 'data-tg')}<button type="button" class="ic" data-tx="open" aria-label="Развернуть всё">${ИК.open}</button><button type="button" class="ic" data-tx="close" aria-label="Свернуть всё">${ИК.close}</button></div>
    </div>`;
  }
  function тТаблица(о) {
    const cols = колонки(), т = дерево(о.итог), итог = { ...т.a, лиды: ф.м === 'month' ? т.a.lb : null };
    const head = `<tr class="th"><th class="nm">${ф.гр === 'bot' ? 'Гео · спейс · бот · сотрудник' : 'Гео · сотрудник · бот'}</th>${cols.map((c) => `<th data-ts="${c.k}" class="${ф.сорт === c.k ? 'on' : ''}">${c.t}${ф.сорт === c.k ? (ф.вниз ? ' ↓' : ' ↑') : ''}${c.t2 && !ф.скр.has('conv') && (!c.м2 || c.м2 === ф.м) ? '<small>' + c.t2 + '</small>' : ''}</th>`).join('')}</tr>
      <tr class="tot"><td class="nm"><div class="nmi"><span class="lbl">Итого<small>${ф.м === 'month' ? 'за ' + период() : 'регистрации ' + период()}</small></span></div></td>${cols.map((c) => ячейка(c, итог)).join('')}</tr>`;
    const тело = строкиТ(т, о.целый, cols, []).join('') || `<tr><td class="nm" colspan="${cols.length + 1}"><span class="tb-mute">В выбранном ничего нет — ослабьте фильтр.</span></td></tr>`;
    const сноска = ф.м === 'month'
      ? `Все деньги и регистрации, сделанные в выбранные дни, от всех игроков — и новых, и старых. Лиды спейса и бота — все новые чаты (по МСК); лиды сотрудника — чаты с его именным тегом${о.целый ? '' : ', они считаются только за весь месяц — поэтому в выбранных днях у сотрудников «—»'}.`
      : 'Игроки, зарегистрированные в выбранные дни, и все их депозиты по сегодня (октябрьские — до 10 ноября). Лидов в когорте нет — она считается от регистраций.';
    return `<div class="tw"><table class="tb"><colgroup><col class="c-nm">${cols.map(() => '<col>').join('')}</colgroup><thead>${head}</thead><tbody>${тело}</tbody></table></div><p class="note">${сноска} Средний чек = (FD $ + RD $) ÷ FD. Строка раскрывается нажатием; стрелка ↗ у бота и сотрудника — подробности и игроки справа. Источник — партнёрка PocketOption (склад ОКК, ${esc(String((ф.м === 'month' ? TB : KP).upd).slice(0, 16).replace('T', ' '))} UTC).</p>`;
  }
  function вСсылку() {
    const p = new URLSearchParams(), J = (x) => [...x].join('~');
    if (ф.м !== 'month') p.set('m', ф.м); if (ф.гео.size) p.set('g', J(ф.гео)); if (ф.сп.size) p.set('s', J(ф.сп)); if (ф.бот.size) p.set('b', J(ф.бот));
    if (ф.минус.size) p.set('x', J(ф.минус)); if (ф.гр !== 'bot') p.set('gr', ф.гр); if (ф.скр.size) p.set('h', J(ф.скр)); if (kОт !== '2026-10-01') p.set('f', kОт); if (kДо) p.set('t', kДо);
    const q = p.toString(); history.replaceState(null, '', '#tablica' + (q ? '/' + q : '')); был = location.hash;
  }
  function изСсылки() {
    const raw = location.hash.slice(1), i = raw.indexOf('/'); if (i < 0) return;
    const p = new URLSearchParams(raw.slice(i + 1)), S = (k) => new Set((p.get(k) || '').split('~').filter(Boolean));
    ф.м = p.get('m') === 'kog' ? 'kog' : 'month'; ф.гео = S('g'); ф.сп = S('s'); ф.бот = S('b'); ф.минус = S('x'); ф.гр = p.get('gr') === 'emp' ? 'emp' : 'bot'; ф.скр = S('h');
    if (p.get('f')) kОт = p.get('f'); if (p.get('t')) kДо = p.get('t');
  }
  const СКЕЛЕТ = '<div class="tb-sk">' + '<i></i>'.repeat(7) + '</div>';
  // плавная смена всей таблицы (режим, группировка, сброс): браузер сам перетекает старое в новое
  const плавно = (f) => {
    if (!document.startViewTransition || reduce) { f(); return; }
    let сделано = false; const раз = () => { if (!сделано) { сделано = true; f(); } };
    const t = document.startViewTransition(раз); t.ready.catch(() => {}); t.finished.catch(() => {}); t.updateCallbackDone.catch(() => {});
    setTimeout(() => { if (!сделано) { try { t.skipTransition(); } catch (_) { /* уже завершён */ } раз(); } }, 300);   // переход не начался — переключаем сразу
  };
  function тРисовать() {
    const box = $('#tb-app'); if (!box) return;
    const нужно = ф.м === 'month' ? (TB ? null : данныеТ) : (KP ? null : игрокиК);
    if (нужно) { if (box.querySelector('.tw')) box.classList.add('busy'); else box.innerHTML = СКЕЛЕТ; нужно().then(тРисовать, (e) => { box.classList.remove('busy'); box.innerHTML = '<div class="err">Данные таблицы не загрузились (' + esc(e.message || e) + '). Это не «данных нет» — обновите страницу.</div>'; }); return; }
    box.classList.remove('busy');
    if (!ф.было) ф.было = true;                       // по умолчанию всё свёрнуто — видны итог и гео
    if (!колонки().some((c) => c.k === ф.сорт)) { ф.сорт = 'all'; ф.вниз = true; }
    const tw = box.querySelector('.tw'), y = tw ? tw.scrollTop : 0, x = tw ? tw.scrollLeft : 0;
    const лист = box.querySelector('.tb-pop.open .tb-list'), лy = лист ? лист.scrollTop : 0, вФокусе = document.activeElement && document.activeElement.closest && document.activeElement.closest('.tb-q');
    const о = отбор();
    видноСейчас = new Set();
    box.innerHTML = тПанель(о) + тТаблица(о);
    ф.видно = видноСейчас;
    const t2 = box.querySelector('.tw'); t2.scrollTop = y; t2.scrollLeft = x;
    const th = box.querySelector('tr.th'); if (th) box.style.setProperty('--thh', th.offsetHeight + 'px');
    const pop = box.querySelector('.tb-pop.open');
    if (pop) { const l = pop.querySelector('.tb-list'); if (l) l.scrollTop = лy; const inp = pop.querySelector('.tb-q input'); if (inp) { искатьВСписке(pop); if (вФокусе || ф.ппФокус) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } } }
    ф.ппФокус = false;
    вСсылку();
  }
  const искатьВСписке = (pop) => { const q = (ф.ппq || '').trim().toLowerCase(); pop.querySelectorAll('.tb-it:not(.all)').forEach((el) => { el.hidden = q && !el.textContent.toLowerCase().includes(q); }); };
  /* PDF: та же таблица в том виде, как открыта сейчас, — светлый лист А4 альбомом, шапка таблицы на каждой странице.
     Собирает браузер («Сохранить как PDF» в окне печати) — так документ выглядит ровно как сайт. */
  function вPDF() {
    const о = отбор(), cols = колонки(), т = дерево(о.итог), итог = { ...т.a, лиды: ф.м === 'month' ? т.a.lb : null };
    const имена = (S, m) => (!S.size ? 'все' : [...S].map((v) => (m.get(v) || { имя: v }).имя).join(', '));
    const гео = new Map([...о.гео].map(([k, x]) => [k, x]));
    const фильтры = [ф.м === 'month' ? 'За месяц — все игроки' : 'Когорта — новые игроки', (ф.м === 'month' ? 'период ' : 'регистрации ') + период(),
      'гео: ' + имена(ф.гео, гео), 'спейсы: ' + имена(ф.сп, о.спейсы), 'боты: ' + имена(ф.бот, о.боты),
      'сотрудники: ' + (!ф.минус.size ? 'все' : 'кроме ' + [...ф.минус].join(', ')), ф.гр === 'bot' ? 'по ботам' : 'по сотрудникам'];
    видноСейчас = new Set(); const былоВидно = ф.видно; ф.видно = null;
    const тело = строкиТ(т, о.целый, cols, []).join('').replace(/<button type="button" class="tb-go"[\s\S]*?<\/button>/g, '');
    ф.видно = былоВидно;
    let el = document.getElementById('tb-print'); if (!el) { el = document.createElement('div'); el.id = 'tb-print'; document.body.append(el); }
    const когда = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `<div class="tp-hd"><span class="tp-mk">N</span><div class="tp-t"><b>Отчёт · октябрь 2026</b><small>NEXUS · сводная таблица</small></div><span class="tp-when">сформировано ${esc(когда)}</span></div>
      <h1 class="tp-h">Сводная <i>таблица</i></h1><p class="tp-f">${фильтры.map((x) => '<span>' + esc(x) + '</span>').join('')}</p>
      <table class="tb tp"><colgroup><col class="c-nm">${cols.map(() => '<col>').join('')}</colgroup><thead><tr class="th"><th class="nm">${ф.гр === 'bot' ? 'Гео · спейс · бот · сотрудник' : 'Гео · сотрудник · бот'}</th>${cols.map((c) => `<th>${c.t}${c.t2 && !ф.скр.has('conv') && (!c.м2 || c.м2 === ф.м) ? '<small>' + c.t2 + '</small>' : ''}</th>`).join('')}</tr></thead>
      <tbody><tr class="tot"><td class="nm"><div class="nmi"><span class="lbl">Итого<small>${ф.м === 'month' ? 'за ' + период() : 'регистрации ' + период()}</small></span></div></td>${cols.map((c) => ячейка(c, итог)).join('')}</tr>${тело}</tbody></table>
      <p class="tp-n">${ф.м === 'month' ? 'Все деньги и регистрации за выбранные дни от всех игроков. Лиды спейса и бота — новые чаты (МСК); лиды сотрудника — чаты с его именным тегом.' : 'Игроки, зарегистрированные в выбранные дни, и все их депозиты (октябрьские — до 10 ноября).'} Средний чек = (FD $ + RD $) ÷ FD. Источник — партнёрка PocketOption (склад ОКК, ${esc(String((ф.м === 'month' ? TB : KP).upd).slice(0, 16).replace('T', ' '))} UTC).</p>`;
    const заголовок = document.title, готово = () => { document.body.classList.remove('print-tb'); document.title = заголовок; removeEventListener('afterprint', готово); };
    document.title = 'Сводная таблица — октябрь 2026 — ' + период().replace(' октября 2026', '') + (ф.м === 'month' ? '' : ' — когорта');
    document.body.classList.add('print-tb'); addEventListener('afterprint', готово);
    setTimeout(() => window.print(), 60);
  }
  const закрытьПоп = () => { if (!ф.пп) return; ф.пп = ''; ф.ппq = ''; document.querySelectorAll('#tb-app .tb-pop.open, #tb-app .tb-dd.open').forEach((x) => x.classList.remove('open')); };
  document.addEventListener('click', (e) => {
    if (вид !== 'tablica') return;
    if (ф.пп && !e.target.closest('.tb-dw')) закрытьПоп();         // щелчок мимо всплывающего списка — закрыть
    if (!e.target.closest('#tb-app')) return;
    if (e.target.closest('[data-open], .cal-wrap, .tb-q')) return;   // подробности справа, календарь и поиск — своими обработчиками
    const el = e.target.closest('[data-dd],[data-tf],[data-tc],[data-tm],[data-tg],[data-ts],[data-tx],[data-tt]'); if (!el) return;
    const d = el.dataset;
    if (d.dd) { if (ф.пп === d.dd) { закрытьПоп(); return; } ф.пп = d.dd; ф.ппq = ''; ф.ппФокус = true; }
    else if (d.tf) { const S = ф[d.tf]; S.has(d.v) ? S.delete(d.v) : S.add(d.v); if (d.tf === 'гео') { ф.сп.clear(); ф.бот.clear(); } if (d.tf === 'сп') ф.бот.clear(); }
    else if (d.tc) { ф[d.tc].clear(); if (d.tc === 'гео') { ф.сп.clear(); ф.бот.clear(); } if (d.tc === 'сп') ф.бот.clear(); }
    else if (d.tm) { if (ф.м === d.tm) return; ф.м = d.tm; ф.минус.clear(); ф.видно = null; плавно(тРисовать); return; }
    else if (d.tg) { if (ф.гр === d.tg) return; ф.гр = d.tg; ф.откр = new Set(); ф.видно = null; плавно(тРисовать); return; }
    else if (d.ts) { if (ф.сорт === d.ts) ф.вниз = !ф.вниз; else { ф.сорт = d.ts; ф.вниз = true; } }
    else if (d.tt) { ф.откр.has(d.tt) ? ф.откр.delete(d.tt) : ф.откр.add(d.tt); }
    else if (d.tx === 'open') { const т = дерево(отбор().итог), обх = (n) => { for (const k of n.kids.values()) { if (k.kids.size) { ф.откр.add(k.путь); обх(k); } } }; обх(т); }
    else if (d.tx === 'close') ф.откр.clear();
    else if (d.tx === 'reset') { ф.гео.clear(); ф.сп.clear(); ф.бот.clear(); ф.минус.clear(); ф.скр.clear(); ф.откр = new Set(); kОт = '2026-10-01'; kДо = ''; ф.пп = ''; ф.видно = null; плавно(тРисовать); return; }
    else if (d.tx === 'pdf') { вPDF(); return; }
    else if (d.tx === 'link') { вСсылку(); const sp = el.querySelector('.tl'); (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => { sp.textContent = 'Скопировано'; }, () => { sp.textContent = 'Скопируйте адрес'; }); setTimeout(() => { sp.textContent = 'Ссылка на вид'; }, 2500); return; }
    тРисовать();
  });
  document.addEventListener('input', (e) => { const q = e.target.closest && e.target.closest('#tb-app .tb-q'); if (!q) return; ф.ппq = e.target.value; искатьВСписке(q.closest('.tb-pop')); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ф.пп) закрытьПоп(); });

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
        <div class="rows" id="sp-rows">${rowHead('Спейс', true)}${D.spaces.map((s, i) => row(s.name, ботов(s.bots.length), s.t, 's:' + i, true)).join('')}</div>
        <div class="bar"><h3 class="sub" style="margin:0">Все боты</h3>${поиск('#bt-rows', 'Найти бота')}</div>
        <div class="rows" id="bt-rows">${rowHead('Бот', true)}${Object.values(D.bots).sort((a, b) => b.t.ftd_sum - a.t.ftd_sum).map((b) => row(имяБота(b), [b.space, подБотом(b)].filter(Boolean).join(' · '), b.t, 'b:' + b.id, true)).join('')}</div></section>`;
    },
    sotrudniki() {
      return `<section class="view"><div class="head-blk"><div class="kicker">Сотрудники · ${period()}</div><h2>Все <span class="serif">сотрудники</span></h2><p class="lead">Нажмите на сотрудника — справа откроются его боты и все его игроки с кнопками в Jarvis и Chatterfy. Лиды сотрудника — чаты с его именным тегом в Chatterfy.</p></div>
        <div class="bar"><span></span>${поиск('#emps', 'Найти сотрудника')}</div>
        <div class="rows" id="emps">${rowHead('Сотрудник', true)}${D.employees.map((e) => row(e.name, ботов(e.bots.length) + (e.t.leads ? ' · рег/лид ' + pct(e.t.regs, e.t.leads) : ''), e.t, 'e:' + e.name, true)).join('')}</div></section>`;
    },
    kogorta() {
      if (!KP) { if (!kpErr) игрокиК().then(перерисовать, перерисовать);
        return kpLoad && kpErr ? `<section class="view"><div class="head-blk"><h2>Когорта</h2></div><div class="err">Данные когорты не загрузились (${esc(kpErr)}). Это не «данных нет» — обновите страницу.</div></section>`
          : `<section class="view"><div class="head-blk"><div class="kicker">Когорта</div><h2>Когорта <span class="serif">октября</span></h2><p class="lead">Загружаю игроков когорты…</p></div></section>`; }
      const k = кДанные((r) => true), t = k.total;
      return `<section class="view"><div class="head-blk"><div class="kicker">Когорта · по сегодняшний день</div><h2>Когорта <span class="serif">октября</span></h2>
        <p class="lead">Игроки, которые <b>зарегистрировались в выбранные дни</b>, и все их депозиты по сегодняшний день (для октябрьских — до 10 ноября). Средний чек = (сумма FD + сумма RD) ÷ количество FD.</p>
        <div class="bar" style="justify-content:flex-start">${календарь()}</div></div>
        ${kTiles(t)}
        ${kCharts(k)}
        <div class="k-sw"><button type="button" class="chip-b${kСписок === 'e' ? ' on' : ''}" data-klist="e">Сотрудники <em>${ru(k.emps.length)}</em>${шеврон}</button><button type="button" class="chip-b${kСписок === 'b' ? ' on' : ''}" data-klist="b">Боты <em>${ru(k.bots.length)}</em>${шеврон}</button><span class="k-sw-h">${kСписок ? 'нажмите строку — справа откроются подробности' : 'нажмите, чтобы раскрыть список'}</span></div>
        <div class="k-fold${kСписок ? ' open' : ''}"><div>
          <div class="k-pane${kСписок === 'e' ? ' on' : ''}" data-pane="e"><div class="bar"><span></span>${поиск('#k-emps', 'Найти сотрудника')}</div>
            <div class="rows" id="k-emps">${kHead('Сотрудник')}${k.emps.map((e) => kRow(e.name, ботов(e.bots.length) + ' · FD/рег ' + pct(e.ftd, e.regs), e, 'k:' + e.name)).join('') || '<p class="lead">В эти дни регистраций нет.</p>'}</div></div>
          <div class="k-pane${kСписок === 'b' ? ' on' : ''}" data-pane="b"><div class="bar"><span></span>${поиск('#k-bots', 'Найти бота')}</div>
            <div class="rows" id="k-bots">${kHead('Бот')}${k.bots.map((b) => kRow(b.name, b.space + ' · FD/рег ' + pct(b.ftd, b.regs), b, 'kb:' + b.id)).join('') || '<p class="lead">В эти дни регистраций нет.</p>'}</div></div>
        </div></div>
        <h3 class="sub">Спейсы</h3><div class="rows">${kHead('Спейс')}${k.spaces.map((x) => kRow(x.name, 'FD/рег ' + pct(x.ftd, x.regs), x, '')).join('')}</div>
        <p class="note">Источник — прямые данные партнёрки PocketOption (склад ОКК, обновлено ${esc(String(KP.upd).slice(0, 16).replace('T', ' '))} UTC). Игроки других платформ (Бинариум и т.п.) сюда не входят. Сотрудник — по постбэку и тегу чата; бот и спейс — по чату игрока.</p></section>`;
    },
    tablica() {
      if (!ф.было) изСсылки();
      данныеТ().catch(() => {}); игрокиК().catch(() => {});   // оба режима — заранее, чтобы переключение было мгновенным
      setTimeout(тРисовать, 0);
      return `<section class="view"><div class="head-blk"><div class="kicker">Таблица · свой фильтр</div><h2>Сводная <span class="serif">таблица</span></h2>
        <p class="lead">Гео, спейсы, боты и сотрудники в одной таблице — как сводная в Jarvis, но на наших цифрах. Выберите режим, дни и что смотреть; сотрудники подтягиваются сами по выбранным ботам. Вид сохраняется в ссылке — её можно отправить.</p></div>
        <div id="tb-app"></div></section>`;
    },
    rashozhdeniya() {
      setTimeout(рРисовать, 0);
      return `<section class="view"><div class="head-blk"><div class="kicker">Проверка внесения · ${period()}</div><h2>Расхождения <span class="serif">Pocket Option и Jarvis</span></h2>
        <p class="lead">Сколько депозитов в Pocket Option и сколько из них есть в Jarvis. Кнопки ниже переключают: сводка, по сотрудникам и каждый депозит, которого в Jarvis нет, — с переходом в Jarvis и в чат Chatterfy.</p></div>
        <div id="rz-app"></div></section>`;
    },
    sverka() {
      const o = D.check.okk, p = D.check.pp;
      if (!p) return `<section class="view"><div class="head-blk"><div class="kicker">Проверка цифр</div><h2>Сверка с <span class="serif">партнёркой</span></h2></div>
        <div class="err">При последнем обновлении (${esc(String(D.period.upd).slice(0, 16).replace('T', ' '))} UTC) партнёрка не ответила — сверка НЕ проведена. Это не «расхождений нет»: цифры отчёта со склада ОКК, сравнить их сейчас не с чем. Следующая попытка — при следующем обновлении, через час.</div></section>`;
      const r = (nm, a, b, f) => { const d = Math.round((b - a) * 100) / 100; return `<div>${nm}</div><div class="r">${f(a)}</div><div class="r">${f(b)}</div><div class="r ${d === 0 ? 'd0' : 'd1'}">${d === 0 ? 'совпадает' : (d > 0 ? '+' : '') + f(d)}</div>`; };
      return `<section class="view"><div class="head-blk"><div class="kicker">Проверка цифр</div><h2>Сверка с <span class="serif">партнёркой</span></h2><p class="lead">Отчёт собран со склада ОКК. Итоги сравнены с ответом API партнёрки PocketOption за тот же период.</p></div>
        <div class="card"><div class="check"><div class="h">Показатель</div><div class="h r">Отчёт</div><div class="h r">Партнёрка</div><div class="h r">Разница</div>
        ${r('Регистрации', o.regs, p.regs, (v) => ru(v))}${r('Первые депозиты', o.ftd, p.ftd, (v) => ru(v))}${r('Первые депозиты, $', o.ftd_sum, p.ftd_sum, usd2)}${r('Все депозиты', o.dep, p.dep, (v) => ru(v))}${r('Все депозиты, $', o.dep_sum, p.dep_sum, usd2)}${r('Выводы, $', o.wdr, p.wdr, usd2)}</div></div>
        <p class="note">Маленькая разница — события текущего дня, пришедшие после последнего сбора склада (${esc(String(D.period.upd).slice(0, 16).replace('T', ' '))} UTC). За закрытые дни цифры совпадают.</p>
        <div class="card"><h4>Откуда цифры</h4><p>• <b>Регистрации, депозиты, выводы</b> — API партнёрки PocketOption, по игрокам и дням (дни — по времени партнёрки).<br>• <b>Чей игрок</b> — сотрудник из постбэка и тега чата Chatterfy.<br>• <b>Бот и спейс</b> — по чату игрока; не нашёлся чат — «Спейс не определён».<br>• <b>Лиды</b> — новые чаты в Chatterfy по московскому времени; Chatterfy не делит их по сотрудникам.</p></div></section>`;
    },
  };

  /* ── вкладка «Расхождения»: ПП против Jarvis (26.10.2026, просьба владельца) ──
     ПП — депозиты по постбэкам партнёрки (наш журнал, сверен с API партнёрки по игрокам и дням).
     Jarvis — по сверке станции: она ищет каждый депозит в Jarvis по игроку, сумме и дате. */
  let RZ = null, rzLoad = null, rzErr = '';
  const данныеР = () => rzLoad || (rzLoad = fetch('../oktyabr-2026-rashozhdeniya/data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((j) => (RZ = j), (e) => { rzErr = String(e.message || e); rzLoad = null; throw e; }));
  const рф = { раздел: 'свод', ст: 'нет', кто: -1, q: '', показ: 60, от: '', до: '', пик: '', калМ: '', вид: 'все', бот: -1, пп: '', ппq: '' };
  /* ФИЛЬТРЫ (26.10, владелец: «детализировать по месяцам, сотрудникам и т.д., всё кастомное»): период (свой календарь:
     первый щелчок — начало, второй — конец; быстрые кнопки — месяцы, «всё время», «7 дней»), сотрудник, бот,
     первые/повторные. Итоги и строки сотрудников пересчитываются из RZ.все — по строке на каждый депозит
     [день от RZ.от, 0 FD / 1 RD, сотрудник, состояние (номер в RZ.сост), сумма, бот]. Нет RZ.все (старые данные) — без фильтров. */
  const МЕС_ИМ = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const месИмя = (м) => МЕС_ИМ[Number(м.slice(5, 7)) - 1] + ' ' + м.slice(0, 4);
  // день каждой строки RZ.все (ISO) — один раз; месяцы окна — для быстрых кнопок и листания календаря
  const рДни = () => { if (!RZ._день) { const от = Date.parse(RZ['от'] + 'T00:00:00Z'); RZ._день = RZ['все'].map((x) => new Date(от + x[0] * 86400e3).toISOString().slice(0, 10)); } return RZ._день; };
  const рМесяцы = () => { if (!RZ['все']) return []; const м = []; for (let d = RZ['от'].slice(0, 7); d <= RZ['до'].slice(0, 7); d = сдвиг(d + '-01', 32).slice(0, 7)) м.push(d); return м; };
  const конецМес = (м) => { const d = new Date(Date.UTC(+м.slice(0, 4), +м.slice(5, 7), 0)).toISOString().slice(0, 10); return d < RZ['до'] ? d : RZ['до']; };
  const началоМес = (м) => (м + '-01' > RZ['от'] ? м + '-01' : RZ['от']);
  // период по умолчанию — последний месяц окна (как было: октябрь)
  const рПериод = () => { if (!RZ['все']) return [RZ['от'], RZ['до']]; if (!рф.от || !рф.до) { const м = рМесяцы().slice(-1)[0]; рф.от = началоМес(м); рф.до = конецМес(м); } return [рф.от, рф.до]; };
  const периодПоУмолч = () => { const м = рМесяцы().slice(-1)[0]; return рф.от === началоМес(м) && рф.до === конецМес(м); };
  // строка RZ.все (i — её номер) и строка списка ev — под текущим фильтром; без — пропустить такое поле фильтра
  const годенВ = (x, i, без = '') => (без === 'пер' || (RZ._день[i] >= рф.от && RZ._день[i] <= рф.до)) && (без === 'вид' || рф.вид === 'все' || x[1] === (рф.вид === 'FD' ? 0 : 1))
    && (без === 'кто' || рф.кто < 0 || x[2] === рф.кто) && (без === 'бот' || рф.бот < 0 || x[5] === рф.бот);
  const годенE = (x) => !RZ['все'] || ((x[9] >= рф.от && x[9] <= рф.до) && (рф.вид === 'все' || x[4] === рф.вид) && (рф.бот < 0 || x[2] === рф.бот));
  const ИК_Q = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  // календарь периода: свой (у «Когорты» — свой, на её даты и её общие щелчки), значения оформления — из .cal-*
  function рКалендарь() {
    const мес = рМесяцы(), м = рф.калМ && мес.includes(рф.калМ) ? рф.калМ : (рф.пик || рф.до).slice(0, 7), i = мес.indexOf(м);
    const сдв = (new Date(м + '-01T00:00:00Z').getUTCDay() + 6) % 7, дней = new Date(Date.UTC(+м.slice(0, 4), +м.slice(5, 7), 0)).getUTCDate();
    let кл = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((x) => `<span class="rz-wd">${x}</span>`).join('') + '<span></span>'.repeat(сдв);
    for (let k = 1; k <= дней; k++) {
      const d = м + '-' + String(k).padStart(2, '0'), нет = d < RZ['от'] || d > RZ['до'];
      const вн = !рф.пик && d >= рф.от && d <= рф.до, край = рф.пик ? d === рф.пик : (d === рф.от || d === рф.до);
      кл += `<button type="button" class="rz-d${вн ? ' in' : ''}${край ? ' edge' : ''}" data-rz-day="${d}"${нет ? ' disabled' : ''}>${k}</button>`;
    }
    const пр = (t, a, b) => `<button type="button" class="rz-p${!рф.пик && рф.от === a && рф.до === b ? ' on' : ''}" data-rz-pre="${a}|${b}">${t}</button>`;
    const неделя = сдвиг(RZ['до'], -6) > RZ['от'] ? сдвиг(RZ['до'], -6) : RZ['от'];
    const ст = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
    return `<div class="rz-ps">${мес.map((x) => пр(месИмя(x).split(' ')[0], началоМес(x), конецМес(x))).join('')}${пр('Всё время', RZ['от'], RZ['до'])}${пр('7 дней', неделя, RZ['до'])}</div>
      <div class="rz-mh"><button type="button" class="rz-nav" data-rz-mon="${мес[i - 1] || ''}"${i <= 0 ? ' disabled' : ''} aria-label="Прошлый месяц">${ст}</button><span class="rz-m">${esc(месИмя(м))}</span><button type="button" class="rz-nav rz-nx" data-rz-mon="${мес[i + 1] || ''}"${i >= мес.length - 1 ? ' disabled' : ''} aria-label="Следующий месяц">${ст}</button></div>
      <div class="rz-g">${кл}</div><p class="rz-h">${рф.пик ? 'Выберите последний день' : 'Нажмите первый день, затем последний'}</p>`;
  }
  function рФильтры() {
    if (!RZ['все']) return '';
    рПериод(); рДни();
    const счёт = (без, ключ) => { const m = new Map(); RZ['все'].forEach((x, i) => { if (!годенВ(x, i, без)) return; const k = ключ(x, i); m.set(k, (m.get(k) || 0) + 1); }); return m; };
    const дд = (имя, ярлык, знач, тело, n, set) => `<div class="tb-dw"><button type="button" class="tb-dd${рф.пп === имя ? ' open' : ''}${set ? ' set' : ''}" data-rz-dd="${имя}"><span>${ярлык}</span><b>${esc(знач)}</b>${ШЕВ}</button>
      <div class="tb-pop${рф.пп === имя ? ' open' : ''}">${n > 8 ? `<label class="tb-q">${ИК_Q}<input type="text" placeholder="Найти" autocomplete="off" value="${esc(рф.пп === имя ? рф.ппq : '')}"></label>` : ''}<div class="tb-list">${тело}</div></div></div>`;
    const список = (k, все, m, имя) => пункт(все, рф[k] === -1, `data-rz-f="${k}" data-v="-1"`, null, ' all')
      + [...m].sort((a, b) => b[1] - a[1]).map(([v, n]) => пункт(имя(v), рф[k] === v, `data-rz-f="${k}" data-v="${esc(v)}"`, n)).join('');
    const mК = счёт('кто', (x) => x[2]), mБ = счёт('бот', (x) => x[5]);
    const изм = !периодПоУмолч() || рф.вид !== 'все' || рф.кто >= 0 || рф.бот >= 0;
    const подпись = рф.от === рф.до ? дм(рф.от) : дм(рф.от) + ' — ' + дм(рф.до);
    return `<div class="tb-ctl rz-ctl"><div class="tb-r">
      <div class="tb-dw"><button type="button" class="tb-dd${рф.пп === 'пер' ? ' open' : ''}${периодПоУмолч() ? '' : ' set'}" data-rz-dd="пер"><span>Период</span><b>${esc(подпись)}</b>${ШЕВ}</button>
        <div class="tb-pop rz-calp${рф.пп === 'пер' ? ' open' : ''}">${рКалендарь()}</div></div>
      ${дд('кто', 'Сотрудник', рф.кто < 0 ? 'все' : RZ.e[рф.кто], список('кто', 'Все сотрудники', mК, (v) => RZ.e[v]), mК.size, рф.кто >= 0)}
      ${дд('бот', 'Бот', рф.бот < 0 ? 'все' : RZ.bn[рф.бот], список('бот', 'Все боты', mБ, (v) => RZ.bn[v]), mБ.size, рф.бот >= 0)}
      <div class="tb-seg">${[['все', 'Все депозиты'], ['FD', 'Первые'], ['RD', 'Повторные']].map(([v, t]) => `<button type="button" class="${рф.вид === v ? 'on' : ''}" data-rz-f="вид" data-v="${v}">${t}</button>`).join('')}</div>
      ${изм ? '<button type="button" class="btn rz-sbros" data-rz-f="сброс" data-v="1">Сбросить</button>' : ''}</div></div>`;
  }
  // иконки кнопок вместо системных эмодзи (26.10, владелец): записи в Jarvis — лист со строками, чат — облачко
  const ИК_J = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="3.5" width="15" height="17" rx="3"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/></svg>';
  const ИК_C = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8 8 0 0 1-11.7 7.1L4 19.8l1.2-4.3a8 8 0 1 1 15.3-3.9z"/><path d="M8.6 11.8h.01M12.2 11.8h.01M15.8 11.8h.01"/></svg>';
  const РСТ = { 'нет': ['нет в Jarvis', 'rz-bad'], 'др': ['на другом', 'rz-wr'], 'незн': ['не проверено', ''] };
  function рРисовать() {
    const box = $('#rz-app'); if (!box) return;
    if (!RZ) {
      box.innerHTML = '<p class="lead">Загружаю расхождения…</p>';
      данныеР().then(рРисовать, () => { const b = $('#rz-app'); if (b) b.innerHTML = '<div class="err">Расхождения не загрузились (' + esc(rzErr) + '). Это не «расхождений нет» — обновите страницу.</div>'; });
      return;
    }
    if (RZ['все']) { рПериод(); рДни(); }
    let И = RZ['итог'], СОТР = RZ['сотр'];
    if (RZ['все']) {   // итоги и строки сотрудников — под фильтр
      const пусто = () => ({ pp: [0, 0], j: [0, 0], 'нет': [0, 0], 'др': [0, 0], 'незн': [0, 0] });
      const доб = (o, k, v) => { o[k][0]++; o[k][1] = Math.round((o[k][1] + v) * 100) / 100; };
      И = { FD: пусто(), RD: пусто() }; const m = new Map();
      RZ['все'].forEach((x, i) => { if (!годенВ(x, i)) return; const вд = x[1] ? 'RD' : 'FD', st = RZ['сост'][x[3]];
        доб(И[вд], 'pp', x[4]); доб(И[вд], st, x[4]); if (!m.has(x[2])) m.set(x[2], пусто()); const o = m.get(x[2]); доб(o, 'pp', x[4]); доб(o, st, x[4]); });
      СОТР = [...m].map(([k, o]) => [k, o.pp, o.j, o['нет'], o['др'], o['незн']]).sort((a, b) => b[3][1] - a[3][1] || b[1][1] - a[1][1]);
    }
    const сум = (k) => [И.FD[k][0] + И.RD[k][0], Math.round((И.FD[k][1] + И.RD[k][1]) * 100) / 100];
    // «Уточнить» = на другом сотруднике + ещё не проверено (26.10, владелец: «много непонятного» — четыре понятных столбца)
    const сл = (a, b) => [a[0] + b[0], Math.round((a[1] + b[1]) * 100) / 100];
    const ут = (o) => сл(o['др'], o['незн']);
    const шт = (v) => ru(v[0]) + ' деп.';
    const ячейка = (v, cls, л) => `<div class="v ${cls || ''}" data-l="${л}">${шт(v)}<small>${usd2(v[1])}</small></div>`;
    const плитка = (cls, v, подпись, низ) => `<div class="tile ${cls}"><b>${ru(v[0])}</b><span>${подпись}</span><small>${usd2(v[1])}${низ ? ' · ' + низ : ''}</small></div>`;
    const pp = RZ.pp;
    // сверка с API партнёрки — только за её месяц и без других фильтров (иначе сравнивать не с чем)
    const ppВидна = !RZ['все'] || !RZ.ppОт || (рф.от === RZ.ppОт && рф.до === (RZ.ppДо < RZ['до'] ? RZ.ppДо : RZ['до']) && рф.вид === 'все' && рф.кто < 0 && рф.бот < 0);
    const ev = RZ.ev.filter((x) => годенE(x) && (рф.ст === 'все' || (рф.ст === 'ут' ? x[7] !== 'нет' : x[7] === рф.ст)) && (рф.кто < 0 || x[1] === рф.кто)
      && (!рф.q || (x[0] + ' ' + RZ.e[x[1]] + ' ' + RZ.bn[x[2]]).toLowerCase().includes(рф.q)));
    const мои = (x) => годенE(x) && (рф.кто < 0 || x[1] === рф.кто);
    const счёт = (ст) => RZ.ev.filter((x) => мои(x) && (ст === 'все' || (ст === 'ут' ? x[7] !== 'нет' : x[7] === ст))).length;
    const чип = (ст, текст) => `<button type="button" class="pill${рф.ст === ст ? ' on' : ''}" data-rz-st="${ст}">${рф.ст === ст ? '✓ ' : ''}${текст} <b>${ru(счёт(ст))}</b></button>`;
    const строка = (x) => {
      const [t, ei, bi, ch, вид, когда, сумма, ст, наКого, день, дубль, безКарт] = x, bid = RZ.b[bi];
      const чат = bid && ch ? 'https://v2.chatterfy.ai/bots/' + encodeURIComponent(bid) + '/chats?chat=' + encodeURIComponent(ch) : '';
      const jarvis = 'https://jarvisfinerp.top/binone/actions/mop-stats/?partner_network_player_id=' + encodeURIComponent(t) + '&show_errors=all&is_api=all';
      const и = (RZ['игр'] || {})[t];   // по игроку за период: [в Pocket Option шт, $, в Jarvis шт, $]
      const поИгр = и ? `<small class="rz-pl">Pocket Option: ${ru(и[0])} деп. · ${usd2(и[1])}</small><small class="rz-pl${и[2] < и[0] ? ' rz-bad' : ''}">Jarvis: ${ru(и[2])} деп. · ${usd2(и[3])}</small>` : '';
      const статус = ст === 'нет' ? ['не внесено', 'rz-bad', 'в Jarvis нет ни у кого'] : ст === 'др' ? ['на другом', 'rz-wr', 'в Jarvis: ' + (наКого || '—')]
        : ['не проверено', '', дубль ? 'возможный дубль' : безКарт ? 'станция не видит' : 'проверим в течение суток'];
      return `<div class="pl"><div class="id">${esc(t)}<small>${esc(RZ.e[ei])} · ${esc(RZ.bn[bi])}</small>${поИгр}</div>
        <div class="v">${usd2(сумма)}<small>${esc(вид)} · этот депозит</small></div><div class="v">${esc(когда)}<small>МСК${день && дм(день) !== String(когда).slice(0, 5) ? ' · у Pocket Option ' + дм(день) : ''}</small></div>
        <div class="v ${статус[1]}">${esc(статус[0])}<small>${esc(статус[2])}</small></div>
        <div class="bt"><a class="lnk" href="${jarvis}" target="_blank" rel="noopener">${ИК_J}Jarvis</a>${чат ? `<a class="lnk" href="${чат}" target="_blank" rel="noopener">${ИК_C}Chatterfy</a>` : `<span class="lnk off" aria-disabled="true">${ИК_C}${ch ? 'бот не найден' : 'чат не найден'}</span>`}</div></div>`;
    };
    const кто = рф.кто >= 0 ? RZ.e[рф.кто] : '';
    const верх = `<div class="rz-top"><div class="tb-seg">${[['свод', 'Сводка'], ['сотр', 'По сотрудникам <b>' + ru(СОТР.length) + '</b>'], ['деп', 'Не внесено в Jarvis <b>' + ru(RZ.ev.filter((x) => годенE(x) && (рф.кто < 0 || x[1] === рф.кто) && x[7] === 'нет').length) + '</b>']]
      .map(([v, t]) => `<button type="button" class="${рф.раздел === v ? 'on' : ''}" data-rz-r="${v}">${t}</button>`).join('')}</div>
      <span class="pill">обновлено ${esc(String(RZ.upd).slice(0, 16).replace('T', ' '))} UTC</span></div>`;
    const уВсе = сл(сум('др'), сум('незн'));
    const свод = `<div class="card rz-leg rz-leg1">
        <p><b>Pocket Option</b> — сколько депозитов пришло от партнёрки. <b class="ok-t">Jarvis</b> — сколько из них сотрудники внесли в Jarvis.
        <b class="rz-bad">Не внесено</b> — депозита в Jarvis нет ни у кого. <b class="rz-wr">Уточнить</b> — внесено на другого сотрудника или станция ещё не успела проверить (проверяет каждые сутки, это число уменьшается).</p>
      </div>
      <div class="tiles rz-t4">${плитка('', сум('pp'), 'Pocket Option')}${плитка('ok', сум('j'), 'Jarvis')}${плитка('rz-bad', сум('нет'), 'Не внесено')}${плитка('rz-wr', уВсе, 'Уточнить', 'на другом ' + ru(сум('др')[0]) + ', не проверено ' + ru(сум('незн')[0]))}</div>
      <div class="card"><div class="check rz-cmp"><div class="h"></div><div class="h r">Pocket Option</div><div class="h r">Jarvis</div><div class="h r">Не внесено</div><div class="h r">Уточнить</div>
        <div>Первые депозиты</div><div class="r">${шт(И.FD.pp)}<br><small>${usd2(И.FD.pp[1])}</small></div><div class="r">${шт(И.FD.j)}<br><small>${usd2(И.FD.j[1])}</small></div><div class="r rz-bad">${шт(И.FD['нет'])}<br><small>${usd2(И.FD['нет'][1])}</small></div><div class="r rz-wr">${шт(ут(И.FD))}<br><small>${usd2(ут(И.FD)[1])}</small></div>
        <div>Повторные депозиты</div><div class="r">${шт(И.RD.pp)}<br><small>${usd2(И.RD.pp[1])}</small></div><div class="r">${шт(И.RD.j)}<br><small>${usd2(И.RD.j[1])}</small></div><div class="r rz-bad">${шт(И.RD['нет'])}<br><small>${usd2(И.RD['нет'][1])}</small></div><div class="r rz-wr">${шт(ут(И.RD))}<br><small>${usd2(ут(И.RD)[1])}</small></div></div></div>
      ${!ppВидна ? (pp && RZ.ppОт ? `<p class="note">Проверка числа Pocket Option по API партнёрки — за ${esc(месИмя(RZ.ppОт).toLowerCase())} целиком: выберите этот месяц без других фильтров.</p>` : '') : `<p class="note">Проверка числа Pocket Option: партнёрка напрямую (API) — ${pp ? ru(pp.dep) + ' деп. · ' + usd2(pp.dep_sum) + (pp.dep === сум('pp')[0] ? ', совпадает' : ', разница ' + ru(Math.abs(pp.dep - сум('pp')[0])) + ' деп. — постбэки, которые партнёрка не прислала или прислала дважды') : 'не ответила при обновлении'}.</p>`}`;
    const сотрудники = `<div class="rows rz-rows"><div class="row hd"><div>Сотрудник</div><div class="v">Pocket Option</div><div class="v">Jarvis</div><div class="v">Не внесено</div><div class="v">Уточнить</div></div>
        ${СОТР.map((r) => `<button type="button" class="row" data-rz-e="${r[0]}"><div class="nm">${esc(RZ.e[r[0]])}<small>открыть его депозиты</small></div>
          ${ячейка(r[1], '', 'Pocket Option')}${ячейка(r[2], 'ok-t', 'Jarvis')}${ячейка(r[3], 'rz-bad', 'Не внесено')}${ячейка(сл(r[4], r[5]), 'rz-wr', 'Уточнить')}</button>`).join('')}</div>`;
    const депозиты = `<div class="bar"><span class="conv">${чип('нет', 'не внесено')}${чип('ут', 'уточнить')}${чип('все', 'все')}${кто ? `<button type="button" class="pill on" data-rz-e="-1">✕ ${esc(кто)}</button>` : ''}</span>${поиск('#rz-x', 'ID, сотрудник или бот')}</div>
      <div class="rows">${ev.slice(0, рф.показ).map(строка).join('') || '<p class="lead">Таких депозитов нет.</p>'}</div>
      ${ev.length > рф.показ ? `<button type="button" class="btn more" data-rz-more="1">Показать ещё ${ru(Math.min(ПОКАЗ, ev.length - рф.показ))} из ${ru(ev.length - рф.показ)}</button>` : ''}`;
    const пОт = !RZ['все'] ? RZ['от'] : рф.от, пДо = !RZ['все'] ? RZ['до'] : рф.до;
    box.innerHTML = верх + рФильтры() + (рф.раздел === 'сотр' ? сотрудники : рф.раздел === 'деп' ? депозиты : свод)
      + `<p class="note">Период ${esc(дм(пОт))}–${esc(дм(пДо))}. Кнопка «Jarvis» открывает записи игрока, «Chatterfy» — его чат. Сверка автоматическая (игрок + сумма + дата) — перед разбором проверяйте глазами. Обновляется каждый час.</p>`;
    const inp = box.querySelector('.sx input'); if (inp) { inp.value = рф.q; if (рф.q) { inp.parentElement.classList.add('on'); inp.focus(); inp.setSelectionRange(рф.q.length, рф.q.length); }
      inp.addEventListener('input', () => { рф.q = inp.value.trim().toLowerCase(); рф.показ = ПОКАЗ; рРисовать(); }); }
  }
  document.addEventListener('click', (e) => {
    if (вид !== 'rashozhdeniya' || !RZ) return;
    if (рф.пп && !(e.target.closest && e.target.closest('#rz-app .tb-dw'))) { рф.пп = ''; рф.ппq = ''; рф.пик = ''; рф.калМ = ''; рРисовать(); }   // щелчок мимо списка — закрыть
    if (e.target.closest && e.target.closest('#rz-app .tb-q')) return;   // поиск в списке — своим обработчиком
    const el = e.target.closest && e.target.closest('#rz-app [data-rz-r], #rz-app [data-rz-st], #rz-app [data-rz-e], #rz-app [data-rz-more], #rz-app [data-rz-dd], #rz-app [data-rz-f], #rz-app [data-rz-day], #rz-app [data-rz-pre], #rz-app [data-rz-mon]'); if (!el) return;
    const d = el.dataset;
    // календарь периода: первый день, затем последний (можно в обратном порядке); быстрые кнопки; листание месяцев
    if (d.rzDay) { if (!рф.пик) { рф.пик = d.rzDay; рРисовать(); return; } [рф.от, рф.до] = d.rzDay < рф.пик ? [d.rzDay, рф.пик] : [рф.пик, d.rzDay]; рф.пик = ''; рф.калМ = ''; рф.пп = ''; рф.показ = ПОКАЗ; рРисовать(); return; }
    if (d.rzPre) { [рф.от, рф.до] = d.rzPre.split('|'); рф.пик = ''; рф.калМ = ''; рф.пп = ''; рф.показ = ПОКАЗ; рРисовать(); return; }
    if (d.rzMon !== undefined) { if (d.rzMon) { рф.калМ = d.rzMon; рРисовать(); } return; }
    if (d.rzDd) { рф.пп = рф.пп === d.rzDd ? '' : d.rzDd; рф.ппq = ''; рф.пик = ''; рф.калМ = ''; рРисовать(); const inp = рф.пп && $('#rz-app .tb-pop.open .tb-q input'); if (inp) inp.focus(); return; }
    if (d.rzF) {
      if (d.rzF === 'сброс') { рф.от = ''; рф.до = ''; рф.пик = ''; рф.вид = 'все'; рф.кто = -1; рф.бот = -1; }
      else if (d.rzF === 'вид') рф.вид = d.v;
      else рф[d.rzF] = Number(d.v);
      рф.пп = ''; рф.ппq = ''; рф.показ = ПОКАЗ; рРисовать(); return;
    }
    if (d.rzR) { рф.раздел = d.rzR; рф.показ = ПОКАЗ; рРисовать(); scrollTo({ top: Math.min(scrollY, $('#rz-app').offsetTop - 110), behavior: 'smooth' }); return; }
    if (d.rzSt) рф.ст = d.rzSt;
    else if (d.rzE !== undefined) { const n = Number(d.rzE); рф.кто = (n === рф.кто || n < 0) ? -1 : n; if (рф.кто >= 0) { рф.раздел = 'деп'; рф.ст = 'все'; } }
    else if (d.rzMore) { рф.показ += ПОКАЗ; рРисовать(); return; }
    рф.показ = ПОКАЗ; рРисовать();
  });

  // после первого дня — промежуток подсвечивается до дня под мышью («протянуть»), без перерисовки
  document.addEventListener('mouseover', (e) => {
    if (вид !== 'rashozhdeniya' || !рф.пик) return;
    const t = e.target.closest && e.target.closest('#rz-app [data-rz-day]'); if (!t) return;
    const [a, b] = t.dataset.rzDay < рф.пик ? [t.dataset.rzDay, рф.пик] : [рф.пик, t.dataset.rzDay];
    document.querySelectorAll('#rz-app [data-rz-day]').forEach((x) => x.classList.toggle('in', x.dataset.rzDay >= a && x.dataset.rzDay <= b));
  });
  // поиск внутри списка фильтра — без перерисовки (фокус остаётся в поле)
  document.addEventListener('input', (e) => {
    const q = e.target.closest && e.target.closest('#rz-app .tb-q'); if (!q) return;
    рф.ппq = e.target.value; const t = рф.ппq.trim().toLowerCase();
    q.closest('.tb-pop').querySelectorAll('.tb-it:not(.all)').forEach((x) => { x.hidden = t && !x.textContent.toLowerCase().includes(t); });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && вид === 'rashozhdeniya' && рф.пп) { рф.пп = ''; рф.ппq = ''; рРисовать(); } });

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
    k(name) {
      if (!KP) return null;
      const k = кДанные((r) => KP.e[r[1]] === name), e = k.emps[0]; if (!e) return null;
      const html = `<div class="head-blk"><div class="kicker">Когорта · регистрации ${период()} · сотрудник</div><h2>${esc(name)}</h2>
        <div class="conv"><span class="pill">средний чек <b>${чек(e)}</b></span><span class="pill">FD из регистраций <b>${pct(e.ftd, e.regs)}</b></span></div></div>${kTiles(e)}${kCharts(k)}
        <h3 class="sub">По ботам</h3><div class="rows">${kHead('Бот')}${k.bots.map((x) => kRow(x.name, x.space, x, 'kb:' + x.id)).join('')}</div>
        <h3 class="sub">Игроки когорты</h3><div id="d-pl"></div>`;
      return { t: 'Когорта · ' + name, html, после: () => списокК($('#d-pl'), (r) => KP.e[r[1]] === name, 'e') };
    },
    kb(id) {
      if (!KP) return null;
      const k = кДанные((r) => KP.b[r[2]] === id), b = k.bots[0]; if (!b) return null;
      const html = `<div class="head-blk"><div class="kicker">Когорта · регистрации ${период()} · бот · ${esc(b.space)}</div><h2>${esc(b.name)}</h2>
        <div class="conv"><span class="pill">средний чек <b>${чек(b)}</b></span><span class="pill">FD из регистраций <b>${pct(b.ftd, b.regs)}</b></span></div></div>${kTiles(b)}${kCharts(k)}
        <h3 class="sub">Сотрудники</h3><div class="rows">${kHead('Сотрудник')}${k.emps.map((x) => kRow(x.name, '', x, 'k:' + x.name)).join('')}</div>
        <h3 class="sub">Игроки когорты</h3><div id="d-pl"></div>`;
      return { t: 'Когорта · ' + b.name, html, после: () => списокК($('#d-pl'), (r) => KP.b[r[2]] === id, 'b') };
    },
    s(i) {
      const s = D.spaces[+i]; if (!s) return null;
      const боты = s.bots.map(бот);
      return { t: 'Спейс · ' + s.name, html: `<div class="head-blk"><div class="kicker">Спейс · ${period()}</div><h2>${esc(s.name)}</h2></div>${tiles(s.t)}${charts(s.daily)}
        <div class="bar"><h3 class="sub" style="margin:0">Боты спейса</h3>${поиск('#d-bots', 'Найти бота')}</div>
        <div class="rows" id="d-bots">${rowHead('Бот', true)}${боты.map((b) => row(имяБота(b), [подБотом(b), 'рег/лид ' + pct(b.t.regs, b.t.leads), 'FD/рег ' + pct(b.t.ftd, b.t.regs)].filter(Boolean).join(' · '), b.t, 'b:' + b.id, true)).join('')}</div>` };
    },
    b(id) {
      const b = D.bots[id]; if (!b) return null;
      const html = `<div class="head-blk"><div class="kicker">Бот · ${esc(b.space)} · ${period()}</div><h2>${esc(имяБота(b))}</h2>${подБотом(b) ? `<p class="lead">${esc(подБотом(b))}</p>` : ''}
        <div class="conv"><span class="pill">регистрация из лида <b>${pct(b.t.regs, b.t.leads)}</b></span><span class="pill">FD из регистраций <b>${pct(b.t.ftd, b.t.regs)}</b></span><span class="pill">средний FD <b>${b.t.ftd ? usd2(b.t.ftd_sum / b.t.ftd) : '—'}</b></span></div></div>
        ${tiles(b.t)}${charts(b.daily)}
        <div class="bar"><h3 class="sub" style="margin:0">Сотрудники бота</h3>${поиск('#d-emp', 'Найти сотрудника')}</div>
        ${b.emp.length ? '<div class="rows" id="d-emp">' + rowHead('Сотрудник', true) + b.emp.map((e) => row(e.name, '', e, 'e:' + e.name, true)).join('') + '</div>' : '<p class="lead">По этому боту за период денег и регистраций нет.</p>'}
        <h3 class="sub">Игроки бота</h3><div id="d-pl"></div>`;
      return { t: 'Бот · ' + имяБота(b), html, после: () => списокИгроков($('#d-pl'), (r) => P.b[r[2]] === id, 'b') };
    },
    e(name) {
      const e = D.employees.find((x) => x.name === name); if (!e) return null;
      const html = `<div class="head-blk"><div class="kicker">Сотрудник · ${period()}</div><h2>${esc(e.name)}</h2></div>${tiles(e.t, '', false, 'чаты с его тегом')}
        <h3 class="sub">По ботам</h3><div class="rows">${rowHead('Бот', true)}${e.bots.map((x) => { const b = бот(x.id); return row(имяБота(b), b.space, x, 'b:' + x.id, true); }).join('')}</div>
        <h3 class="sub">Игроки сотрудника</h3><div id="d-pl"></div>`;
      return { t: 'Сотрудник · ' + e.name, html, после: () => списокИгроков($('#d-pl'), (r) => P.e[r[1]] === name, 'e') };
    },
  };
  let смена = 0;
  function показатьПанель(куда) {   // куда: 'f' — вглубь, 'b' — назад, без — первое открытие
    const верх = стек[стек.length - 1]; if (!верх) return;
    const [вид, ...ост] = верх.split(':'), п = панели[вид] && панели[вид](ост.join(':'));
    if (!п) return;
    const bd = $('#dr-bd'), моя = ++смена;
    const вставить = () => {
      if (моя !== смена) return;
      const [k, ...имя] = п.t.split(' · ');
      $('#dr-t').textContent = имя.join(' · ') || п.t; $('#dr-k').textContent = k + ' · октябрь';
      bd.className = 'dr-bd'; bd.innerHTML = п.html; bd.scrollTop = 0;
      $('#dr-back').hidden = стек.length < 2;
      if (куда && !reduce) { void bd.offsetWidth; bd.classList.add(куда === 'b' ? 'in-b' : 'in-f'); }
      if (п.после) п.после();
    };
    if (куда && !reduce && dr.classList.contains('on')) { bd.className = 'dr-bd ' + (куда === 'b' ? 'out-b' : 'out-f'); setTimeout(вставить, 190); }
    else вставить();
  }
  function открыть(что, с_нуля) {
    if (с_нуля) стек.length = 0;
    const вглубь = !с_нуля && dr.classList.contains('on');
    стек.push(что); показатьПанель(вглубь ? 'f' : '');
    dr.classList.add('on'); dim.classList.add('on'); dr.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock');
  }
  function закрыть() { dr.classList.remove('on'); dim.classList.remove('on'); dr.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); стек.length = 0; }
  $('#dr-x').addEventListener('click', закрыть); dim.addEventListener('click', закрыть);
  $('#dr-back').addEventListener('click', () => { стек.pop(); показатьПанель('b'); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && dr.classList.contains('on')) закрыть(); });
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]'); if (!o) return;
    e.preventDefault(); открыть(o.dataset.open, !dr.contains(o));   // из панели — вглубь со стрелкой «назад», со страницы — с нуля
  });

  /* ── поиск-лупа: наведение раскрывает и сразу даёт писать; пусто и курсор ушёл — сворачивается ── */
  const фильтр = (sx) => { const цель = sx.dataset.sx; if (!цель || цель === '#pl-x') return; const box = $(цель); if (!box) return; const v = sx.querySelector('input').value.trim().toLowerCase();
    [...box.children].forEach((el) => { if (el.classList.contains('hd')) return; el.hidden = v && !el.textContent.toLowerCase().includes(v); }); };
  document.addEventListener('mouseover', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (!sx || sx.classList.contains('on')) return; sx.classList.add('on'); const i = sx.querySelector('input'); setTimeout(() => i.focus({ preventScroll: true }), 60); });
  document.addEventListener('mouseout', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (!sx || sx.contains(e.relatedTarget)) return; const i = sx.querySelector('input'); if (!i.value) { sx.classList.remove('on'); i.blur(); } });
  document.addEventListener('focusout', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx && !e.target.value && !sx.matches(':hover')) sx.classList.remove('on'); });
  document.addEventListener('click', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx) { sx.classList.add('on'); sx.querySelector('input').focus(); } });
  document.addEventListener('input', (e) => { const sx = e.target.closest && e.target.closest('.sx'); if (sx) фильтр(sx); });

  /* ── свет под курсором ── */
  document.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); }, { passive: true });

  /* ── главные страницы без перезагрузки ── */
  const ГЛАВНЫЕ = ['obzor', 'spaces', 'sotrudniki', 'kogorta', 'tablica', 'sverka', 'rashozhdeniya'];
  let был = '';
  const show = () => { const h = decodeURIComponent(location.hash.slice(1)), h0 = h.split('/')[0]; const v = ГЛАВНЫЕ.includes(h0) ? h0 : 'obzor';
    вид = v; $('#app').innerHTML = V[v](); setNav(v); scrollTo({ top: 0, behavior: 'instant' }); onScroll();
    const m = /^(s|b|e|k|kb):(.+)$/.exec(h); if (m) { if (m[1][0] === 'k' && !KP) игрокиК().then(() => открыть(h, true), () => {}); else открыть(h, true); }   // старые ссылки на спейс/бота/сотрудника открывают панель
  };
  const go = () => { if (location.hash === был) return; был = location.hash; закрыть();
    if (document.startViewTransition && !reduce) { const t = document.startViewTransition(show); t.ready.catch(() => {}); t.finished.catch(() => {}); setTimeout(() => t.skipTransition(), 450); } else show(); };

  fetch('data.json', { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(async (d) => {
    D = d;
    $('#foot').textContent = 'Nexus · отчёт за ' + period() + ' · склад ОКК от ' + String(d.period.upd).slice(0, 16).replace('T', ' ') + ' UTC' + (d.check.pp ? ', сверен с партнёркой' : ' · сверка с партнёркой не проведена');
    был = location.hash; show(); addEventListener('hashchange', go);
  }).catch((e) => { $('#app').innerHTML = '<div class="err">Отчёт не загрузился (' + esc(e.message) + '). Это не «данных нет» — обновите страницу; если не помогает, войдите заново.</div>'; });
})();
