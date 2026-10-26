/* РОВНЫЕ РЯДЫ КАРТОЧЕК (26.10.2026, владелец: «4 — две в строку и две во вторую, 6 — три и три, без одиноких переносов»).
   Для сеток карточек .cards (и .cards.tiles): не больше трёх в ряд и без одной карточки в последнем ряду —
   1–3 → в один ряд; 4 → 2+2; 5 → 3+2; 6 → 3+3; 7 → 4+3; 8 → 3+3+2; 9 → 3+3+3; 10 → 4+4+2.
   На узком экране — сколько влезает при наименьшей ширине карточки из CSS, тоже поровну. Плитки-цифры (.stats) не трогаем. */
(() => {
  const МИН = [['.cards.tiles', 200], ['.cards', 300]];
  const мин = (g) => (МИН.find(([s]) => g.matches(s)) || [null, 300])[1];
  function ровно(g) {
    const n = [...g.children].filter((c) => !c.hidden && getComputedStyle(c).display !== 'none').length, w = g.clientWidth;
    if (!n || !w) return;
    if (g.style.gridTemplateColumns && !g._ровно) return;   // колонки задала сама страница (например, список расходов) — не трогаем
    const gap = parseFloat(getComputedStyle(g).columnGap) || 14;
    const влезает = Math.max(1, Math.floor((w + gap) / (Math.min(мин(g), w) + gap)));
    let cols = n <= 3 ? n : n === 4 ? 2 : n % 3 === 1 ? 4 : 3;
    if (cols > влезает) cols = Math.ceil(n / Math.ceil(n / влезает));
    const v = `repeat(${cols},minmax(0,1fr))`;
    if (g.style.gridTemplateColumns !== v) g.style.gridTemplateColumns = v;
    g._ровно = true;
  }
  const ro = new ResizeObserver((es) => es.forEach((e) => ровно(e.target)));
  const следить = new WeakSet();
  let ждёт = false;
  const все = () => { ждёт = false; document.querySelectorAll('.cards').forEach((g) => { if (!следить.has(g)) { следить.add(g); ro.observe(g); } ровно(g); }); };
  new MutationObserver(() => { if (!ждёт) { ждёт = true; setTimeout(все, 0); } }).observe(document.body, { childList: true, subtree: true });
  addEventListener('hashchange', () => { setTimeout(все, 60); setTimeout(все, 450); });   // разделы переключаются без смены страницы — пересчитать открытый
  все();
})();
