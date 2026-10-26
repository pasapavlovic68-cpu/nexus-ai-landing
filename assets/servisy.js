/* ПЕРЕКЛЮЧАТЕЛЬ СЕРВИСОВ NEXUS (26.10.2026, владелец: «связать кнопками — я думал, это будет один сервис»).
   Кнопка рядом с названием в шапке открывает список: отчёт, карта системы, базы, статистика — со своими значками.
   Страница говорит, кто она, атрибутом <html data-servis="…">. Нужна шапка #head с .brand (как у карты, баз и отчёта). */
(() => {
  const СЕРВИСЫ = [
    { id: 'otchet', имя: 'Отчёт за октябрь', что: 'цифры месяца, сотрудники, расхождения', href: '/otchet/oktyabr-2026/', ic: '/assets/otchet/favicon-64.png' },
    { id: 'karta', имя: 'Карта системы', что: 'серверы, переезд, расходы, сайты', href: '/karta/', ic: '/assets/karta/favicon-64.png' },
    { id: 'bazy', имя: 'Базы', что: 'таблицы, копии и нагрузка', href: '/karta/bazy/', ic: '/assets/bazy/favicon-64.png' },
    { id: 'stats', имя: 'Статистика сайта', что: 'кто заходит и откуда', href: '/stats/', ic: '/assets/stats/favicon-64.png' },
  ];
  const head = document.getElementById('head'), brand = head && head.querySelector('.brand'); if (!brand) return;
  const тек = document.documentElement.dataset.servis || '';
  const w = document.createElement('div'); w.className = 'sv';
  w.innerHTML = '<button type="button" class="sv-btn" aria-haspopup="true" aria-expanded="false" aria-label="Другие сервисы Nexus">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></svg></button>'
    + '<div class="sv-pop" role="menu"><div class="sv-h">Сервисы Nexus</div>'
    + СЕРВИСЫ.map((s) => `<a role="menuitem" class="sv-it${s.id === тек ? ' on' : ''}" href="${s.href}"${s.id === тек ? ' aria-current="page"' : ''}><img src="${s.ic}" alt="" width="34" height="34"><span><b>${s.имя}</b><small>${s.id === тек ? 'вы здесь' : s.что}</small></span></a>`).join('')
    + '</div>';
  brand.after(w);
  const btn = w.querySelector('.sv-btn');
  const set = (o) => { w.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(!w.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!w.contains(e.target)) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();
