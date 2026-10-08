/* Nexus КЦ: demo behaviour (generated, do not edit). No network, no browser-extension APIs: everything is simulated. */
(function () {
'use strict';
var CFG = {"locale":"ru-RU","timeOpts":{"hour":"2-digit","minute":"2-digit"},"regions":{"africa":"Африка","latam":"Латам","arab":"Арабский регион"},"geos":{"africa":["Нигерия","ЮАР","Гана","Кения","Уганда","Камерун"],"latam":["Мексика","Колумбия","Перу","Аргентина","Чили","Бразилия","Эквадор"],"arab":["Марокко","Алжир","Египет","ОАЭ"]},"stages":{"africa":["Новый лид","Верификация","Перезвон","Дожим","Напоминание","Индивидуальный запрос"],"latam":["Новый лид","Верификация","Консультация","Перезвон","Напоминание","Индивидуальный запрос"],"arab":["Новый лид","Верификация","Перезвон","Напоминание","Индивидуальный запрос"]},"employees":{"africa":["Оператор 12 | Рет.","Оператор 07 | Рет.","Оператор 21 | Продажи"],"latam":["Оператор 31 | Рет.","Оператор 34 | Продажи"],"arab":["Оператор 41 | Рет.","Оператор 45 | Продажи"]},"statuses":{"success":"Дозвон","no-answer":"Клиент не отвечает","busy":"Занято","wrong-number":"Неправильный номер","dropped":"Сбросил","offline":"Вне сервиса"},"results":[{"s":"success","c":"Договорились созвониться завтра"},{"s":"no-answer","c":""},{"s":"success","c":"Просит перезвонить вечером"},{"s":"busy","c":""}],"seeds":[{"chat":"31905744","s":"success","c":"Просит перезвонить вечером","region":"africa","days":1,"at":"14:31"},{"chat":"60214877","s":"busy","c":"","region":"africa","days":1,"at":"13:12"},{"chat":"60377125","s":"wrong-number","c":"","region":"africa","days":2,"at":"16:05"},{"chat":"77390218","s":"no-answer","c":"","region":"latam","days":1,"at":"14:39"},{"chat":"52008341","s":"success","c":"Удобно после 18:00","region":"latam","days":1,"at":"11:47"},{"chat":"52114096","s":"dropped","c":"","region":"latam","days":2,"at":"15:20"},{"chat":"55120944","s":"busy","c":"","region":"arab","days":1,"at":"12:26"},{"chat":"58830412","s":"offline","c":"","region":"arab","days":2,"at":"10:58"}],"clients":[{"name":"Дмитрий Соколов","phone":"+234 802 55 40 118","chat":"48210573","region":"africa","geo":"Нигерия","tag":"Перезвон","time":"14:38","hue":212,"msgs":[["in","Здравствуйте! Можно, чтобы мне перезвонили? Голосом удобнее."],["out","Конечно, Дмитрий. Передаю заявку в колл-центр — вам позвонят в ближайшее время."],["in","Спасибо, жду звонка."]]},{"name":"Карлос Мендоса","phone":"+52 55 5550 0142","chat":"77390218","region":"latam","geo":"Мексика","tag":"Верификация","time":"14:21","hue":28,"msgs":[["in","Добрый день. Не получается завершить подтверждение профиля."],["out","Поможем по телефону — оформляю звонок специалиста."],["in","Хорошо, я на связи."]]},{"name":"Юсуф Бенали","phone":"+212 600 555 018","chat":"55120944","region":"arab","geo":"Марокко","tag":"Новый лид","time":"13:57","hue":158,"msgs":[["in","Здравствуйте, хочу узнать подробнее о тарифах."],["out","Расскажем голосом — закажу для вас звонок."],["in","Отлично, жду."]]},{"name":"Амина Менса","phone":"+233 24 555 0167","chat":"31905744","region":"africa","geo":"Гана","tag":"Напоминание","time":"13:40","hue":318,"msgs":[["in","Напомните мне, пожалуйста, завтра о продлении."],["out","Записал. Колл-центр наберёт вас и напомнит."],["in","Спасибо!"]]}],"activity":[["Чат создан","13:02"],["Назначен оператор","13:04"],["Добавлен тег «%TAG%»","13:11"]],"t":{"send":"Отправить","sending":"Отправка","sent":"Звонок отправлен","fillRequired":"Заполните обязательные поля: ","req":{"vcf-employee":"Сотрудник","vcf-phone":"Номер телефона","vcf-chat-id":"ID чата","vcf-geo":"ГЕО","vcf-stage":"Этап"},"autofilled":"Данные подставлены из карточки клиента","historyHint":"Запись уже в истории — значок часов в шапке панели","notifOff":"Уведомления выключены — статус записан только в историю","dupTitle":"Повторный звонок за 24 часа","pending":"Ожидает","chatId":"ID чата","ack":"Принял ✓","close":"Закрыть","template":"Тема: \nУдобное время: ","notePrefix":"КЦ"}};
var lib = { hasFire: function () { return false; } };
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function regionDisplayName(region) { return CFG.regions[region] || ''; }
function vcfReactionKeyFromRecord(item) { return item.key; }
function vcfHasFireReaction(key) { return lib.hasFire(key); }
function createHistoryItemsMarkup(items) {
  return items
    .map((item) => {
      const reactionKey = vcfReactionKeyFromRecord(item);
      const reactionState = vcfHasFireReaction(reactionKey) ? "checked" : "idle";
      const reactionLabel = reactionState === "checked"
        ? "Отметка успеха снята"
        : "Отметить как успешный";
      const regionLabel = regionDisplayName(item.region);
      const dateStr = item.sentAt
        ? new Date(item.sentAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })
        : "";
      return `
      <div class="vcf-history-item${item.statusClass ? " vcf-history-item--" + item.statusClass.replace("vcf-history-status-", "") : ""}" data-chat-id="${escapeHtml(item.chatId)}" data-status="${escapeHtml(item.status)}" data-display-status="${escapeHtml(item.displayStatus || "")}" data-region="${escapeHtml(item.region || "")}">
        <div class="vcf-history-item-top">
          <span class="vcf-history-status ${escapeHtml(item.statusClass)}">${escapeHtml(item.displayStatus || item.status)}</span>
          <button type="button"
                  class="vcf-history-reaction"
                  data-state="${reactionState}"
                  data-reaction-key="${escapeHtml(reactionKey)}"
                  aria-label="${reactionLabel}"
                  title="${reactionLabel}">
            <span class="vcf-history-reaction-fire" aria-hidden="true">
              <svg class="vcf-fire-svg" viewBox="0 0 16 22" focusable="false" aria-hidden="true">
                <path class="vcf-fire-tongue vcf-fire-tongue--outer"
                      d="M8 21 C3.5 21 1.5 16 3 12 C4 9.5 3.5 7 5 4 C5.8 6.5 7 5 8 1.5 C9.5 4 11 7.5 12 12 C13 16 11.5 21 8 21 Z"
                      fill="#ff5722"/>
                <path class="vcf-fire-tongue vcf-fire-tongue--middle"
                      d="M8 20 C5.5 20 4 16.5 5 13.5 C5.7 11.5 5.3 9.5 6.5 7 C7.2 8.8 8 8 8.2 5 C9.5 7 10.8 10 11 13 C11.5 16.5 10 20 8 20 Z"
                      fill="#ff9800"/>
                <path class="vcf-fire-tongue vcf-fire-tongue--inner"
                      d="M8 18.5 C6.5 18.5 5.8 16.5 6.5 14.5 C7 13 6.8 11.5 7.5 10 C7.9 11 8.3 10.5 8.2 8.5 C9 10 9.7 12 9.5 14 C10 16.5 9 18.5 8 18.5 Z"
                      fill="#ffd54f"/>
              </svg>
            </span>
            <span class="vcf-history-reaction-check" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
                <path d="M3.5 8.5 L6.5 11.5 L12.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <span class="vcf-history-time">${escapeHtml(item.time)}${dateStr ? `<span class="vcf-history-date">${escapeHtml(dateStr)}</span>` : ""}</span>
        </div>
        ${regionLabel ? `<div class="vcf-history-region">${escapeHtml(regionLabel)}</div>` : ""}
        <div class="vcf-history-chat-id">ID чата: ${escapeHtml(item.chatId)}</div>
        ${item.comment ? `<div class="vcf-history-comment">${escapeHtml(item.comment)}</div>` : ""}
      </div>`;
    })
    .join("");
}
lib.escapeHtml = escapeHtml;
lib.createHistoryItemsMarkup = createHistoryItemsMarkup;
function kcRuntime(CFG, lib) {
  const T = CFG.t
  const doc = document
  const root = doc.getElementById('nexus-kc-root')
  if (!root) return
  const q = (s, r) => (r || root).querySelector(s)
  const qa = (s, r) => Array.from((r || root).querySelectorAll(s))
  const esc = (v) => lib.escapeHtml(String(v == null ? '' : v))
  const narrow = window.matchMedia('(max-width: 860px)')

  const panel = q('#vcf-panel')
  const openBtn = q('#vcf-open')
  const form = q('#vcf-form')
  const submitBtn = q('#vcf-submit')
  const statusEl = q('#vcf-status')
  const dupEl = q('#vcf-duplicate-warning')
  const historyPanel = q('#vcf-history-panel')
  const historyBtn = q('#vcf-history-button')
  const historyList = q('#vcf-history-list')
  const historyFilter = q('#vcf-history-filter')
  const emptyHistory = historyList.innerHTML
  const empDd = q('.vcf-employee-dropdown')
  const geoDd = q('#vcf-geo').closest('.vcf-dropdown')
  const stageDd = q('#vcf-stage').closest('.vcf-dropdown')
  const switches = [q('#vcf-direction-switch'), q('#vcf-history-direction-switch')]

  const state = {
    region: 'africa', client: 0, size: 0.7, sizeTouched: false, notif: true, busy: false,
    sends: 0, chip: '', employee: {}, recent: [], history: [], notes: {}, calls: {}, timers: [],
  }
  Object.keys(CFG.employees).forEach((r) => { state.employee[r] = CFG.employees[r][0] })

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(CFG.locale, CFG.timeOpts)
  const fmtDate = (ts) => new Date(ts).toLocaleDateString(CFG.locale, { day: '2-digit', month: '2-digit', year: '2-digit' })
  const digits = (v) => String(v || '').replace(/\D/g, '')
  const later = (fn, ms) => { const id = window.setTimeout(fn, ms); state.timers.push(id); return id }
  const initials = (name) => name.split(' ').map((w) => w.charAt(0)).join('').slice(0, 2)
  const current = () => CFG.clients[state.client]

  function historyRecord(key, chatId, comment, region, sentAt) {
    return {
      chatId: String(chatId), status: CFG.statuses[key], displayStatus: CFG.statuses[key],
      statusClass: 'vcf-history-status-' + key, comment: comment || '', region,
      sentAt, time: fmtTime(sentAt), key: chatId + '|' + sentAt, fire: false,
    }
  }
  const now0 = Date.now()
  const daysAgoAt = (days, hhmm) => {
    const d = new Date(now0 - days * 24 * 3600 * 1000)
    d.setHours(Number(hhmm.split(':')[0]), Number(hhmm.split(':')[1]), 0, 0)
    return d.getTime()
  }
  state.history = CFG.seeds
    .map((s) => historyRecord(s.s, s.chat, s.c, s.region, daysAgoAt(s.days, s.at)))
    .sort((a, b) => b.sentAt - a.sentAt)
  lib.hasFire = (key) => state.history.some((h) => h.key === key && h.fire)
  function setDropdown(dd, value) {
    q('input[type="hidden"]', dd).value = value || ''
    q('.vcf-dropdown-value', dd).textContent = value || dd.dataset.placeholder
    dd.classList.toggle('vcf-dropdown-has-value', Boolean(value))
    qa('.vcf-dropdown-option', dd).forEach((o) => o.setAttribute('aria-selected', o.dataset.value === value ? 'true' : 'false'))
  }
  function fillMenu(dd, list, asRows) {
    q('.vcf-dropdown-menu', dd).innerHTML = list.map((v) => {
      const opt = '<button class="vcf-dropdown-option" type="button" role="option" data-value="' + esc(v) + '">' + esc(v) + '</button>'
      return asRows ? '<div class="vcf-employee-row">' + opt + '</div>' : opt
    }).join('')
  }
  function closeDropdown(dd) {
    q('.vcf-dropdown-menu', dd).hidden = true
    q('.vcf-dropdown-button', dd).setAttribute('aria-expanded', 'false')
    dd.classList.remove('vcf-dropdown-open')
  }
  function closeDropdowns() { qa('.vcf-dropdown').forEach(closeDropdown) }
  function closeSwitches() {
    switches.forEach((sw) => {
      q('.vcf-direction-menu', sw).hidden = true
      q('.vcf-direction-button', sw).setAttribute('aria-expanded', 'false')
      sw.classList.remove('vcf-direction-open')
    })
  }

  root.addEventListener('click', (event) => {
    const ddButton = event.target.closest('.vcf-dropdown-button')
    if (ddButton) {
      const dd = ddButton.closest('.vcf-dropdown')
      const shouldOpen = q('.vcf-dropdown-menu', dd).hidden
      closeDropdowns()
      if (shouldOpen) {
        q('.vcf-dropdown-menu', dd).hidden = false
        ddButton.setAttribute('aria-expanded', 'true')
        dd.classList.add('vcf-dropdown-open')
      }
      return
    }
    const option = event.target.closest('.vcf-dropdown-option')
    if (option) {
      const dd = option.closest('.vcf-dropdown')
      setDropdown(dd, option.dataset.value)
      closeDropdown(dd)
      q('.vcf-dropdown-button', dd).focus()
      if (dd === empDd) state.employee[state.region] = option.dataset.value
      clearStatus()
      return
    }
    const swButton = event.target.closest('.vcf-direction-button')
    if (swButton) {
      const sw = swButton.closest('.vcf-direction-switch')
      const menu = q('.vcf-direction-menu', sw)
      const shouldOpen = menu.hidden
      closeSwitches()
      menu.hidden = !shouldOpen
      swButton.setAttribute('aria-expanded', String(shouldOpen))
      sw.classList.toggle('vcf-direction-open', shouldOpen)
      return
    }
    const swOption = event.target.closest('.vcf-direction-option')
    if (swOption) {
      const sw = swOption.closest('.vcf-direction-switch')
      applyRegion(swOption.dataset.direction)
      closeSwitches()
      q('.vcf-direction-button', sw).focus()
    }
  })
  doc.addEventListener('click', (event) => {
    if (!event.target.closest('.vcf-dropdown')) closeDropdowns()
    if (!event.target.closest('.vcf-direction-switch')) closeSwitches()
  })
  doc.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    closeDropdowns()
    closeSwitches()
    if (historyPanel.classList.contains('vcf-history-panel-visible')) closeHistory()
  })
  function applyRegion(region) {
    state.region = CFG.regions[region] ? region : 'africa'
    switches.forEach((sw) => {
      q('.vcf-direction-value', sw).textContent = CFG.regions[state.region]
      qa('.vcf-direction-option', sw).forEach((o) => o.setAttribute('aria-selected', o.dataset.direction === state.region ? 'true' : 'false'))
    })
    fillMenu(geoDd, CFG.geos[state.region])
    setDropdown(geoDd, '')
    fillMenu(stageDd, CFG.stages[state.region])
    setDropdown(stageDd, '')
    fillMenu(empDd, CFG.employees[state.region], true)
    setDropdown(empDd, state.employee[state.region] || '')
    applyHistoryFilters()
    renderDuplicates()
  }
  function showStatus(message, type) { statusEl.textContent = message; statusEl.dataset.type = type }
  function clearStatus() { statusEl.textContent = ''; statusEl.dataset.type = '' }
  function setStep(n) {
    qa('.kc-step', doc).forEach((el) => {
      const i = Number(el.dataset.step)
      el.classList.toggle('is-done', i < n)
      el.classList.toggle('is-active', i === n)
      q('.kc-step__n', el).textContent = i < n ? '✓' : String(i)
    })
  }
  let stepNow = 1
  function advance(n) { if (n > stepNow) { stepNow = n; setStep(n) } }
  const chatList = doc.getElementById('kc-chats')
  function renderChats() {
    chatList.innerHTML = CFG.clients.map((c, i) => (
      '<li><button type="button" class="crm-chat" data-client="' + i + '" aria-current="' + (i === state.client ? 'true' : 'false') + '">'
      + '<span class="crm-ava" style="--h:' + c.hue + '" aria-hidden="true">' + esc(initials(c.name)) + '</span>'
      + '<span class="crm-chat__row"><span class="crm-chat__name">' + esc(c.name) + '</span>'
      + '<span class="crm-chat__time">' + esc(c.time) + '</span></span>'
      + '<span class="crm-chat__row crm-chat__row--sub"><span class="crm-chat__snip">' + esc(c.msgs[c.msgs.length - 1][1]) + '</span>'
      + '<span class="crm-chat__reg">' + esc(CFG.regions[c.region]) + '</span></span>'
      + '</button></li>'
    )).join('')
  }
  function renderCard() {
    const c = current()
    const set = (id, html) => { doc.getElementById(id).innerHTML = html }
    const ava = doc.getElementById('kc-c-ava')
    ava.textContent = initials(c.name)
    ava.style.setProperty('--h', c.hue)
    set('kc-c-name', esc(c.name))
    set('kc-c-phone', esc(c.phone))
    set('kc-c-chat', esc(c.chat))
    set('kc-c-geo', esc(c.geo))
    set('kc-c-region', esc(CFG.regions[c.region]))
    set('kc-c-tag', esc(c.tag))
    renderNote()
    doc.getElementById('kc-thread').innerHTML = c.msgs.map((m) => (
      '<div class="crm-msg' + (m[0] === 'out' ? ' crm-msg--out' : '') + '">' + esc(m[1]) + '</div>'
    )).join('')
    doc.getElementById('kc-activity').innerHTML = CFG.activity.map((a) => (
      '<li>' + esc(a[0].replace('%TAG%', c.tag)) + '<time>' + esc(a[1]) + '</time></li>'
    )).join('')
  }
  function renderNote() {
    const note = state.notes[current().chat] || ''
    const el = doc.getElementById('kc-c-note')
    el.textContent = note || '—'
    el.closest('.crm-field').classList.toggle('is-empty', !note)
  }
  function pulse(el, cls) {
    if (!el) return
    el.classList.remove(cls)
    void el.offsetWidth
    el.classList.add(cls)
  }

  chatList.addEventListener('click', (event) => {
    const item = event.target.closest('.crm-chat')
    if (!item) return
    selectClient(Number(item.dataset.client))
  })
  function selectClient(index) {
    if (index === state.client || !CFG.clients[index]) return
    state.client = index
    qa('.crm-chat', chatList).forEach((el, i) => el.setAttribute('aria-current', i === index ? 'true' : 'false'))
    renderCard()
    applyRegion(current().region)
    prefill(!panel.hidden)
  }
  function prefill(flash) {
    const c = current()
    q('#vcf-lead-name').value = c.name
    q('#vcf-phone').value = c.phone
    q('#vcf-chat-id').value = c.chat
    q('#vcf-individual-request').value = ''
    q('#vcf-smart-toggle').checked = false
    const filled = [q('#vcf-lead-name'), q('#vcf-phone'), q('#vcf-chat-id')]
    const sources = ['phone', 'chat']
    if (CFG.geos[state.region].indexOf(c.geo) !== -1) {
      setDropdown(geoDd, c.geo)
      filled.push(q('.vcf-dropdown-button', geoDd))
      sources.push('geo')
    }
    if (CFG.stages[state.region].indexOf(c.tag) !== -1) {
      setDropdown(stageDd, c.tag)
      filled.push(q('.vcf-dropdown-button', stageDd))
      sources.push('tag')
    }
    renderDuplicates()
    if (!flash) return
    filled.forEach((el) => pulse(el, 'kc-autofill'))
    sources.forEach((f) => pulse(doc.querySelector('.crm-field[data-f="' + f + '"]'), 'kc-pulse'))
    showStatus(T.autofilled, 'info')
  }
  let animTimer = null
  function showPanel() {
    window.clearTimeout(animTimer)
    panel.classList.remove('vcf-panel-opening', 'vcf-panel-open', 'vcf-panel-closing')
    panel.hidden = false
    panel.getBoundingClientRect()
    window.requestAnimationFrame(() => {
      panel.classList.add('vcf-panel-opening', 'vcf-panel-open')
      animTimer = window.setTimeout(() => panel.classList.remove('vcf-panel-opening'), 260)
    })
    root.classList.add('kc-panel-open')
    doc.body.classList.add('kc-opened')
    openBtn.classList.remove('kc-attn')
    fitSize()
    prefill(true)
    advance(2)
    later(() => advance(3), 2200)
  }
  function hidePanel() {
    window.clearTimeout(animTimer)
    if (panel.hidden) return
    panel.classList.remove('vcf-panel-opening', 'vcf-panel-open')
    panel.classList.add('vcf-panel-closing')
    root.classList.remove('kc-panel-open')
    animTimer = window.setTimeout(() => {
      panel.hidden = true
      panel.classList.remove('vcf-panel-closing')
    }, 260)
  }
  openBtn.addEventListener('click', () => { panel.hidden ? showPanel() : hidePanel() })
  q('#vcf-close').addEventListener('click', () => { closeHistory(); hidePanel() })
  const callout = doc.getElementById('kc-callout')
  if (callout) callout.addEventListener('click', () => { if (panel.hidden) showPanel() })
  function setSize(k) {
    state.size = Math.round(Math.min(1, Math.max(0.5, Number(k) || 0.7)) * 10) / 10
    root.style.zoom = String(state.size)
    doc.documentElement.style.setProperty('--kc-k', String(state.size))
    openBtn.style.zoom = String(1 / state.size)
    qa('.vcf-size-btn').forEach((b) => {
      const on = Math.abs(Number(b.dataset.size) - state.size) < 0.001
      b.classList.toggle('vcf-size-btn--active', on)
      b.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
  }
  function fitSize() {
    if (state.sizeTouched || panel.hidden) return
    while (state.size > 0.5 && panel.scrollHeight > panel.clientHeight + 12) setSize(state.size - 0.1)
  }
  q('#vcf-size-options').addEventListener('click', (event) => {
    const b = event.target.closest('.vcf-size-btn')
    if (!b) return
    state.sizeTouched = true
    setSize(b.dataset.size)
  })
  window.addEventListener('resize', fitSize)
  function applyTheme(theme) {
    const dark = theme === 'dark'
    root.classList.toggle('vcf-theme-dark', dark)
    root.classList.toggle('vcf-theme-light', !dark)
    q('#vcf-theme-toggle').checked = dark
    qa('.vcf-toast-stack, .vcf-call-toast', doc).forEach((el) => {
      el.classList.toggle('vcf-call-toast-dark', dark)
      el.classList.toggle('vcf-call-toast-light', !dark)
    })
  }
  q('#vcf-theme-toggle').addEventListener('change', (event) => applyTheme(event.target.checked ? 'dark' : 'light'))
  q('#vcf-notif-toggle').addEventListener('change', (event) => {
    state.notif = event.target.checked
    root.classList.toggle('vcf-notif-off', !state.notif)
  })
  q('#vcf-smart-toggle').addEventListener('change', (event) => {
    const area = q('#vcf-individual-request')
    if (event.target.checked) {
      if (area.value.indexOf(T.template) !== 0) area.value = T.template + (area.value.trim() ? '\n' + area.value.trim() : '')
    } else if (area.value.indexOf(T.template) === 0) {
      area.value = area.value.slice(T.template.length).trim()
    }
  })
  const clockSvg = '<svg class="vcf-duplicate-warning-clock" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">'
    + '<circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/>'
    + '<path d="M6 3 V6 L8 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>'
  function renderDuplicates() {
    const chatId = q('#vcf-chat-id').value.trim()
    const phone = digits(q('#vcf-phone').value)
    const list = state.recent.filter((r) => (chatId && r.chatId === chatId) || (phone && digits(r.phone) === phone))
    if (!list.length) {
      dupEl.hidden = true
      dupEl.innerHTML = ''
      return
    }
    const rows = list.map((d) => {
      const resultClass = 'vcf-duplicate-warning-result' + (d.statusKey ? ' vcf-history-status-' + d.statusKey : '')
      return '<div class="vcf-duplicate-warning-row">'
        + '<span class="vcf-duplicate-warning-stage">' + esc(d.stage) + '</span>'
        + '<span class="' + resultClass + '">' + esc(d.statusKey ? CFG.statuses[d.statusKey] : T.pending) + '</span>'
        + '<span class="vcf-duplicate-warning-time">'
        + '<span class="vcf-duplicate-warning-time-row">' + clockSvg + esc(fmtTime(d.sentAt)) + '</span>'
        + '<span class="vcf-duplicate-warning-date">' + esc(fmtDate(d.sentAt)) + '</span>'
        + '</span></div>'
    }).join('')
    dupEl.innerHTML = '<span class="vcf-duplicate-warning-main">' + esc(T.dupTitle) + '</span>'
      + '<div class="vcf-duplicate-warning-list">' + rows + '</div>'
    dupEl.hidden = false
  }
  q('#vcf-chat-id').addEventListener('input', renderDuplicates)
  q('#vcf-phone').addEventListener('input', renderDuplicates)
  function resetSubmit() {
    submitBtn.innerHTML = '<span>' + esc(T.send) + '</span>'
    submitBtn.removeAttribute('aria-label')
    submitBtn.disabled = false
    submitBtn.classList.remove('is-success', 'is-error')
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (state.busy) return
    clearStatus()
    const missing = Object.keys(T.req).filter((id) => !q('#' + id).value.trim()).map((id) => T.req[id])
    if (missing.length) {
      showStatus(T.fillRequired + missing.join(', ') + '.', 'error')
      return
    }
    if (!dupEl.hidden) pulse(dupEl, 'kc-flash')
    state.busy = true
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="vcf-loading-wave" aria-label="' + esc(T.sending) + '">'
      + T.sending.split('').map((ch, i) => '<span style="--i:' + i + '">' + esc(ch) + '</span>').join('') + '</span>'
    const call = {
      chatId: q('#vcf-chat-id').value.trim(), phone: q('#vcf-phone').value.trim(),
      stage: q('#vcf-stage').value, region: state.region, sentAt: 0, statusKey: '',
    }
    later(() => {
      call.sentAt = Date.now()
      state.recent.push(call)
      const n = (state.calls[call.chatId + '|' + call.stage] || 0) + 1
      state.calls[call.chatId + '|' + call.stage] = n
      state.notes[call.chatId] = T.notePrefix + ' · ' + call.stage + (n > 1 ? ' (' + n + ')' : '') + ' · ' + fmtDate(call.sentAt)
      if (current().chat === call.chatId) {
        renderNote()
        pulse(doc.querySelector('.crm-field[data-f="note"]'), 'kc-pulse')
      }
      submitBtn.innerHTML = '<span>' + esc(T.sent) + '</span>'
      submitBtn.setAttribute('aria-label', T.sent)
      submitBtn.classList.add('is-success')
      advance(4)
      const result = CFG.results[state.sends % CFG.results.length]
      state.sends += 1
      later(() => {
        resetSubmit()
        state.busy = false
        renderDuplicates()
      }, 2000)
      later(() => deliverStatus(call, result), 3000)
    }, 900)
  })
  function deliverStatus(call, result) {
    call.statusKey = result.s
    state.history.unshift(historyRecord(result.s, call.chatId, result.c, call.region, Date.now()))
    renderDuplicates()
    if (historyPanel.classList.contains('vcf-history-panel-visible')) renderHistory()
    if (!state.notif) {
      if (!panel.hidden) showStatus(T.notifOff, 'info')
      pulse(historyBtn, 'kc-attn')
      return
    }
    showToast(result.s, call.chatId, result.c, call.region)
  }
  function toastStack() {
    let stack = doc.getElementById('vcf-toast-stack')
    if (stack) return stack
    stack = doc.createElement('div')
    stack.id = 'vcf-toast-stack'
    stack.className = 'vcf-toast-stack vcf-toast-stack-flat'
    stack.innerHTML = '<div class="vcf-toast-stack-list"></div>'
    doc.body.appendChild(stack)
    return stack
  }
  function showToast(key, chatId, comment, region) {
    const dark = root.classList.contains('vcf-theme-dark')
    const stack = toastStack()
    const list = q('.vcf-toast-stack-list', stack)
    const toast = doc.createElement('div')
    const themeClass = dark ? 'vcf-call-toast-dark' : 'vcf-call-toast-light'
    stack.classList.remove('vcf-call-toast-dark', 'vcf-call-toast-light')
    stack.classList.add(themeClass)
    toast.className = 'vcf-call-toast vcf-call-toast-' + key + ' ' + themeClass
    toast.setAttribute('role', 'status')
    toast.innerHTML = '<button class="vcf-call-toast-close" type="button" aria-label="' + esc(T.close) + '">×</button>'
      + '<div class="vcf-call-toast-content">'
      + '<span class="vcf-call-toast-region">' + esc(CFG.regions[region] || '') + '</span>'
      + '<span class="vcf-call-toast-status">' + esc(CFG.statuses[key]) + '</span>'
      + '<span class="vcf-call-toast-chat">' + esc(T.chatId) + ': ' + esc(chatId) + '</span>'
      + (comment ? '<span class="vcf-call-toast-comment">' + esc(comment) + '</span>' : '')
      + '</div>'
      + '<button class="vcf-call-toast-ack" type="button">' + esc(T.ack) + '</button>'
    list.insertBefore(toast, list.firstChild)
    qa('.vcf-call-toast', list).slice(3).forEach((old) => old.remove())
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => toast.classList.add('vcf-call-toast-visible')))
    const dismiss = (event) => {
      event.stopPropagation()
      toast.classList.remove('vcf-call-toast-visible')
      toast.classList.add('vcf-call-toast-exit')
      window.setTimeout(() => {
        toast.remove()
        if (!q('.vcf-call-toast', stack)) stack.remove()
      }, 320)
      if (!historyPanel.classList.contains('vcf-history-panel-visible')) {
        pulse(historyBtn, 'kc-attn')
        if (!panel.hidden && !state.busy) showStatus(T.historyHint, 'info')
      }
    }
    q('.vcf-call-toast-close', toast).addEventListener('click', dismiss)
    q('.vcf-call-toast-ack', toast).addEventListener('click', dismiss)
  }
  function renderHistory() {
    historyList.innerHTML = state.history.length ? lib.createHistoryItemsMarkup(state.history) : emptyHistory
    applyHistoryFilters()
  }
  function applyHistoryFilters() {
    const query = historyFilter.value.trim().toLowerCase()
    qa('.vcf-history-item', historyList).forEach((item) => {
      const okSearch = !query || (item.dataset.chatId || '').indexOf(query) !== -1
      const okChip = !state.chip || (item.dataset.displayStatus || '').indexOf(state.chip) === 0
      const okRegion = item.dataset.region === state.region
      item.hidden = !okSearch || !okChip || !okRegion
    })
  }
  function openHistory() {
    panel.scrollTop = 0
    renderHistory()
    historyPanel.classList.add('vcf-history-panel-visible')
    historyBtn.setAttribute('aria-pressed', 'true')
    historyBtn.classList.remove('kc-attn')
    if (statusEl.textContent === T.historyHint || statusEl.textContent === T.notifOff) clearStatus()
    if (!narrow.matches) window.setTimeout(() => historyFilter.focus(), 180)
  }
  function closeHistory() {
    historyPanel.classList.remove('vcf-history-panel-visible')
    historyBtn.setAttribute('aria-pressed', 'false')
  }
  historyBtn.addEventListener('click', () => {
    historyPanel.classList.contains('vcf-history-panel-visible') ? closeHistory() : openHistory()
  })
  q('#vcf-history-close').addEventListener('click', closeHistory)
  historyFilter.addEventListener('input', applyHistoryFilters)
  const chips = qa('.vcf-history-filter-chip')
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('vcf-history-filter-chip-active'))
    chip.classList.add('vcf-history-filter-chip-active')
    state.chip = chip.dataset.status
    applyHistoryFilters()
  }))
  historyList.addEventListener('click', (event) => {
    const btn = event.target.closest('.vcf-history-reaction')
    if (!btn) return
    const record = state.history.filter((h) => h.key === btn.dataset.reactionKey)[0]
    if (!record) return
    record.fire = !record.fire
    btn.setAttribute('data-state', record.fire ? 'checked' : 'idle')
  })
  resetSubmit()
  applyTheme('dark')
  setSize(narrow.matches ? 0.8 : window.innerWidth >= 1800 ? 0.9 : window.innerWidth >= 1500 ? 0.8 : 0.7)
  renderChats()
  renderCard()
  applyRegion(current().region)
  setStep(1)
  openBtn.classList.add('kc-attn')
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { kcRuntime(CFG, lib); });
else kcRuntime(CFG, lib);
})();
