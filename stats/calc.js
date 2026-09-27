/* Nexus AI · калькулятор стоимости проекта для дашборда /stats.
   Самодостаточный модуль: сам внедряет стили и разметку модалки, без библиотек.
   API: window.NexusCalc.open() / window.NexusCalc.close() */
(function(){
  'use strict';
  if(window.NexusCalc) return;

  /* =====================================================================
     ЦЕНЫ. Все числа — только здесь. Модель: рынок СНГ, 2026.
     Себестоимость = Σ часов × ставка
     Цена = max(минимум_услуги,
                вверх_до_50( себестоимость × Кслож × Ксроч × КбезAPI × (1 + 0.15 × N_интеграций)
                             × (1 + буфер) × (1 + маржа) ) + внешние_расходы)
     При всех коэффициентах 1.0: 1 час ≈ $25 × 1.2 × 1.3 = $39.
     Уникальный дизайн и анимации делаем всегда — они уже в базовых часах.

     Как задаются вопросы продукта (qs):
       type:'one'  — один выбор; type:'many' — несколько; type:'num' — степпер числа.
       У вариантов/степперов:
         h      — часы работы (добавляются строкой в разбивку);
         w      — «вес» сложности; сумма весов сравнивается с порогами продукта cx:[средний, сложный];
         int    — сколько внешних систем добавляет (+15% за каждую);
         noApi  — у системы клиента нет API (×1.2);
         min    — поднимает минимум услуги (minWhy — подпись в разбивке);
         base   — заменяет базу продукта (часы, минимум, название);
         none   — «ничего не нужно»: не попадает в смету клиенту.
       У степпера: free — сколько входит в базу, h — часов за каждую единицу сверх,
         wAt:[[порог, вес], …] — вес сложности от значения, int — интеграций за единицу сверх intFree.
       when:{q, is:[…]} или {q, gt:n} — вопрос виден только при таком ответе.
     ===================================================================== */
  const PRICING = {
    rate: 25,            // $ за час работы
    buffer: 0.20,        // резерв на риски и доработки
    margin: 0.30,        // маржа студии
    intStep: 0.15,       // +15% за каждую внешнюю систему (CRM, трекер, Google Таблица, платёжка, ERP)
    noApi: 1.2,          // КбезAPI — у системы клиента нет API
    roundTo: 50,         // округление цены вверх, $
    // Кслож: ступени. Вилка: «мин» — на ступень ниже, «макс» — на ступень выше
    complexity: [
      {k:'simple', label:'простой', mult:1.0},
      {k:'medium', label:'средний', mult:1.3},
      {k:'hard',   label:'сложный', mult:1.6}
    ],
    hardTop: 1.25,       // верх вилки для сложного проекта: цена × 1.25
    // Ксроч. days — во сколько раз сжимается срок
    urgency: {
      normal: {label:'Обычно',        sub:'спокойный темп',    mult:1.0,  days:1},
      fast:   {label:'Срочно',        sub:'быстрее 2 недель',  mult:1.25, days:0.75},
      rush:   {label:'Очень срочно',  sub:'быстрее недели',    mult:1.5,  days:0.55}
    },
    // срок: 5–6 продуктивных часов в день + 30% на согласования
    days: {perDayMin:5, perDayMax:6, approvals:0.30},
    // внешние расходы (хостинг, API ИИ, лицензии, Chatterfy) — разово, отдельной строкой
    ext: {def:0, step:10, max:20000},
    // поддержка после запуска — фиксированные тарифы в месяц
    support: {
      overHour: 35,      // $ за час сверх пакета
      tiers: {
        start:    {name:'Старт',  price:80,  short:'до 1 ч правок',     desc:'мониторинг, бэкапы, домен и SSL, до 1 ч правок, реакция 1 рабочий день'},
        business: {name:'Бизнес', price:200, short:'до 4 ч · ответ 4 ч', desc:'мониторинг, бэкапы, до 4 ч правок в месяц, реакция до 4 часов'},
        pro:      {name:'Про',    price:450, short:'до 10 ч · ответ 1 ч', desc:'до 10 ч правок, реакция до 1 часа, приоритет, ежемесячный отчёт'}
      }
    },

    products: {
      // Лендинг 16 ч, мин $600; многостраничный ~31 ч, мин $1 200
      site: {
        name:'Лендинг / сайт', icon:'site', hours:16, min:600, cx:[3,6],
        support:'start', extHint:'Домен и хостинг ≈ $20–60 в год',
        qs:[
          {id:'kind', type:'one', title:'Формат', def:'landing', opts:[
            {k:'landing', label:'Лендинг', sub:'одна страница', base:{h:16, min:600, label:'Лендинг',
              copy:'Лендинг: уникальный дизайн, анимации, адаптив под телефон, домен и публикация'}},
            {k:'multi', label:'Многостраничный', sub:'до 5 страниц в базе', base:{h:31, min:1200, label:'Многостраничный сайт',
              copy:'Многостраничный сайт: уникальный дизайн, анимации, адаптив, домен и публикация'}}
          ]},
          {id:'pages', type:'num', when:{q:'kind', is:['multi']}, title:'Сколько страниц', short:'Страниц', unit:'стр.',
            min:2, max:40, step:1, def:5, free:5, h:3, wAt:[[10,1],[20,2]], hint:'5 страниц — в базе, дальше +3 ч за страницу'},
          {id:'lang', type:'one', title:'Языки', def:'one', opts:[
            {k:'one', label:'Один язык', none:true},
            {k:'two', label:'RU + EN', h:4, row:'Вторая языковая версия'},
            {k:'more', label:'3 и больше', h:8, w:1, row:'Три и больше языков'}
          ]},
          {id:'forms', type:'many', title:'Заявки и оплата', def:['tg'], opts:[
            {k:'tg', label:'Заявки в Telegram', h:1},
            {k:'crm', label:'Передача в CRM', h:4, int:1, intName:'CRM'},
            {k:'pay', label:'Онлайн-оплата', h:6, int:1, w:1, intName:'платёжка'},
            {k:'quiz', label:'Квиз / калькулятор', h:6, w:1}
          ]},
          {id:'extra', type:'many', title:'Дополнительно', def:[], opts:[
            {k:'cms', label:'CMS / админка', sub:'клиент сам меняет тексты', h:12, w:2},
            {k:'texts', label:'Тексты под ключ', h:6},
            {k:'seo', label:'SEO и аналитика', sub:'мета, карта сайта, цели', h:5, row:'SEO-база и аналитика'}
          ]}
        ]
      },

      // бот простой 8 ч, мин $300; сложный (ИИ / CRM / оплаты) — мин $900
      bot: {
        name:'Telegram-бот', icon:'bot', hours:8, min:300, cx:[3,5],
        copy:'Бот: меню, приём заявок, ответы по кнопкам, оформление сообщений',
        support:'start', extHint:'Сервер ≈ $5–10/мес, API ИИ — по объёму',
        qs:[
          {id:'scen', type:'num', title:'Сколько сценариев / команд', short:'Сценариев / команд', unit:'шт.',
            min:1, max:50, step:1, def:5, free:5, h:1, wAt:[[12,1],[25,2]], hint:'5 входят в базу: меню, заявка, FAQ. Дальше +1 ч за каждый'},
          {id:'pay', type:'one', title:'Приём оплаты', def:'no', opts:[
            {k:'no', label:'Не нужен', none:true},
            {k:'stars', label:'Telegram Stars', h:3, row:'Оплата в Telegram Stars'},
            {k:'acq', label:'Эквайринг / крипто', sub:'ЮKassa, Stripe, CryptoBot', h:6, w:1, int:1, intName:'платёжка',
              min:900, minWhy:'сложный бот (ИИ / CRM / оплаты)', row:'Приём оплаты: эквайринг'}
          ]},
          {id:'dest', type:'one', title:'Куда уходят заявки', def:'chat', opts:[
            {k:'chat', label:'В чат менеджеру', copy:'Заявки — в чат менеджеру'},
            {k:'sheets', label:'Google Таблица', h:3, int:1, intName:'Google Таблица', row:'Выгрузка в Google Таблицу'},
            {k:'crm', label:'CRM', sub:'amoCRM, Bitrix24 и др.', h:6, w:1, int:1, intName:'CRM',
              min:900, minWhy:'сложный бот (ИИ / CRM / оплаты)', row:'Интеграция с CRM'}
          ]},
          {id:'ai', type:'one', title:'ИИ-ответы (GPT)', def:'no', opts:[
            {k:'no', label:'Без ИИ', none:true},
            {k:'faq', label:'По базе знаний', h:8, w:2, min:900, minWhy:'сложный бот (ИИ / CRM / оплаты)', row:'ИИ-ответы по базе знаний'},
            {k:'agent', label:'ИИ-агент', sub:'записывает, считает, создаёт заявки', h:16, w:3, min:900, minWhy:'сложный бот (ИИ / CRM / оплаты)', row:'ИИ-агент с действиями'}
          ]},
          {id:'extra', type:'many', title:'Ещё', def:[], opts:[
            {k:'web', label:'Веб-админка', sub:'заявки, пользователи, тексты', h:12, w:1},
            {k:'mail', label:'Рассылки по сегментам', h:4},
            {k:'i18n', label:'Мультиязычность', h:3},
            {k:'pb', label:'Постбэки в трекер', sub:'Keitaro, Binom', h:3, int:1, intName:'трекер'}
          ]}
        ]
      },

      // Mini App MVP (1 сценарий, 3–5 экранов) 40 ч, мин $1 500
      miniapp: {
        name:'Telegram Mini App', icon:'miniapp', hours:40, min:1500, cx:[3,6],
        copy:'Mini App: вход через Telegram, уникальный дизайн и анимации, 1 сценарий, до 5 экранов',
        support:'business', extHint:'Сервер и база ≈ $10–30/мес',
        qs:[
          {id:'screens', type:'num', title:'Сколько экранов', short:'Экранов', unit:'шт.',
            min:3, max:40, step:1, def:5, free:5, h:4, wAt:[[10,1],[20,2]], hint:'MVP — до 5 экранов. Дальше +4 ч за экран'},
          {id:'flows', type:'num', title:'Пользовательских сценариев', short:'Сценариев', unit:'шт.',
            min:1, max:10, step:1, def:1, free:1, h:10, wAt:[[3,1],[5,2]], hint:'Запись, заказ, личный кабинет… Один — в базе'},
          {id:'pay', type:'one', title:'Приём оплаты', def:'no', opts:[
            {k:'no', label:'Не нужен', none:true},
            {k:'stars', label:'Telegram Stars', h:4, row:'Оплата в Telegram Stars'},
            {k:'acq', label:'Эквайринг / крипто', h:8, w:1, int:1, intName:'платёжка', row:'Приём оплаты: эквайринг'}
          ]},
          {id:'links', type:'many', title:'Связать с', def:[], opts:[
            {k:'crm', label:'CRM', h:8, w:1, int:1, intName:'CRM', row:'Интеграция с CRM'},
            {k:'bot', label:'Ботом-компаньоном', h:6, row:'Бот-компаньон'},
            {k:'sheets', label:'Google Таблицей', h:3, int:1, intName:'Google Таблица', row:'Выгрузка в Google Таблицу'},
            {k:'pb', label:'Трекером', sub:'постбэки', h:3, int:1, intName:'трекер', row:'Постбэки в трекер'}
          ]},
          {id:'extra', type:'many', title:'Ещё', def:[], opts:[
            {k:'admin', label:'Админ-панель', sub:'заказы, пользователи, контент', h:16, w:1},
            {k:'i18n', label:'Мультиязычность', h:4},
            {k:'push', label:'Уведомления через бота', h:3}
          ]}
        ]
      },

      // расширение простое 18 ч, мин $700; + интеграция CRM 30 ч, мин $1 200
      ext: {
        name:'Chrome-расширение для CRM', icon:'ext', hours:18, min:700, cx:[3,6],
        copy:'Расширение Chrome, работает прямо в интерфейсе CRM',
        support:'business', extHint:'Обычно без внешних расходов',
        qs:[
          {id:'crm', type:'one', title:'Какая CRM', def:'popular', opts:[
            {k:'popular', label:'Популярная', sub:'amoCRM, Bitrix24, HubSpot', copy:'CRM: популярная (amoCRM / Bitrix24 / HubSpot)'},
            {k:'custom', label:'Своя / редкая', sub:'изучаем интерфейс с нуля', h:6, w:1, row:'Своя или редкая CRM'}
          ]},
          {id:'api', type:'one', title:'Есть ли у CRM API', def:'yes', opts:[
            {k:'yes', label:'Есть API', copy:'У CRM есть API'},
            {k:'no', label:'Нет API', sub:'работаем через интерфейс', noApi:true, copy:'Работа без API — через интерфейс CRM'}
          ]},
          {id:'acts', type:'many', title:'Что автоматизировать', def:['fill'], opts:[
            {k:'fill', label:'Автоподстановка данных', h:3},
            {k:'call', label:'Звонок в один клик', h:3},
            {k:'tpl', label:'Шаблоны сообщений', h:2},
            {k:'bulk', label:'Массовые действия', h:6, w:1},
            {k:'parse', label:'Сбор данных со страницы', h:5, w:1},
            {k:'queue', label:'Очередь без дублей', h:6, w:1, row:'Очередь и дедупликация'},
            {k:'panel', label:'Панель внутри CRM', h:5, row:'Панель в интерфейсе CRM'}
          ]},
          {id:'out', type:'many', title:'Куда передавать данные', def:[], opts:[
            {k:'sheets', label:'Google Таблица', h:3, int:1, intName:'Google Таблица', row:'Выгрузка в Google Таблицу'},
            {k:'crm', label:'В CRM / ваш сервер', sub:'интеграция по API', h:12, w:1, int:1, intName:'CRM',
              min:1200, minWhy:'расширение с интеграцией CRM', row:'Интеграция с CRM / сервером'}
          ]},
          {id:'ai', type:'one', title:'ИИ-функции', def:'no', opts:[
            {k:'no', label:'Без ИИ', none:true},
            {k:'ai', label:'Подсказки и резюме', sub:'разбор карточки, ответы', h:10, w:2, row:'ИИ-подсказки и резюме'}
          ]}
        ]
      },

      // дашборд метрик 20 ч, мин $800; с ИИ-контролем качества 64 ч, мин $2 500
      dash: {
        name:'Дашборд / аналитика', icon:'dash', hours:20, min:800, cx:[3,6],
        copy:'Дашборд: метрики и воронка на одном экране, уникальный дизайн',
        support:'pro', extHint:'API ИИ ≈ $20–100/мес, хостинг ≈ $10/мес',
        qs:[
          {id:'src', type:'num', title:'Сколько источников данных', short:'Источников данных', unit:'шт.',
            min:1, max:15, step:1, def:1, free:1, h:6, int:1, wAt:[[3,1],[6,2]], hint:'Один — в базе. Каждый следующий: +6 ч и +15% как интеграция'},
          {id:'qa', type:'one', title:'ИИ-контроль качества диалогов', def:'no', opts:[
            {k:'no', label:'Не нужен', none:true},
            {k:'qa', label:'Оценка по рубрике', sub:'грейды, рейтинг сотрудников', h:44, w:2,
              min:2500, minWhy:'дашборд с ИИ-контролем качества', row:'ИИ-контроль качества диалогов'}
          ]},
          {id:'views', type:'num', title:'Экранов / отчётов', short:'Экранов', unit:'шт.',
            min:1, max:20, step:1, def:3, free:3, h:3, wAt:[[8,1]], hint:'3 — в базе. Дальше +3 ч за экран'},
          {id:'extra', type:'many', title:'Ещё', def:[], opts:[
            {k:'roles', label:'Роли и права', h:8, w:1, row:'Роли и права доступа'},
            {k:'rt', label:'Реалтайм', sub:'вместо обновления раз в час', h:10, w:1, row:'Данные в реальном времени'},
            {k:'csv', label:'Экспорт CSV / Excel', h:3},
            {k:'tg', label:'Отчёты в Telegram', h:4}
          ]}
        ]
      },

      // постбэки разово 4 ч, мин $150; интеграция систем 40–130 ч, мин $1 000
      integr: {
        name:'Интеграции и автоматизация', icon:'integr', hours:40, min:1000, cx:[3,5],
        support:'pro', extHint:'Сервер для синхронизации ≈ $5–20/мес',
        qs:[
          {id:'kind', type:'one', title:'Задача', def:'sync', opts:[
            {k:'pb', label:'Постбэки в трекер', sub:'разовая настройка', base:{h:4, min:150, label:'Постбэки в трекер (Keitaro / Binom)',
              copy:'Настройка постбэков в трекер (Keitaro / Binom)'}},
            {k:'sync', label:'Связка систем', sub:'CRM ↔ ERP, бот ↔ CRM…', base:{h:40, min:1000, label:'Интеграция систем',
              copy:'Интеграция систем и автоматический обмен данными'}}
          ]},
          {id:'pbn', type:'num', when:{q:'kind', is:['pb']}, title:'Сколько источников / офферов', short:'Источников', unit:'шт.',
            min:1, max:20, step:1, def:1, free:1, h:1.5, hint:'Один — в базе, дальше +1,5 ч за каждый'},
          {id:'pbmon', type:'one', when:{q:'kind', is:['pb']}, title:'Мониторинг', def:'no', opts:[
            {k:'no', label:'Не нужен', none:true},
            {k:'yes', label:'Алерты в Telegram', sub:'если постбэки перестали идти', h:3, row:'Алерты об ошибках в Telegram'}
          ]},
          {id:'sys', type:'num', when:{q:'kind', is:['sync']}, title:'Сколько систем связать', short:'Систем', unit:'шт.',
            min:2, max:8, step:1, def:2, free:2, h:15, wAt:[[4,1],[6,2]], hint:'2 системы — в базе (40 ч), каждая следующая +15 ч'},
          {id:'api', type:'one', when:{q:'kind', is:['sync']}, title:'У всех систем есть API?', def:'yes', opts:[
            {k:'yes', label:'Да', copy:'У всех систем есть API'},
            {k:'no', label:'Нет у одной или нескольких', noApi:true, copy:'Часть систем — без API'}
          ]},
          {id:'mode', type:'one', when:{q:'kind', is:['sync']}, title:'Как синхронизировать', def:'sched', opts:[
            {k:'sched', label:'По расписанию', copy:'Регулярная синхронизация по расписанию'},
            {k:'rt', label:'В реальном времени', sub:'в обе стороны', h:20, w:2, row:'Двусторонняя синхронизация в реальном времени'}
          ]},
          {id:'more', type:'many', when:{q:'kind', is:['sync']}, title:'Ещё', def:[], opts:[
            {k:'pbx', label:'Постбэки в трекер', sub:'Keitaro / Binom', h:4, int:1, intName:'трекер'},
            {k:'rec', label:'Сверка данных', sub:'отчёт о расхождениях', h:12, w:1, row:'Сверка данных и отчёт о расхождениях'},
            {k:'mon', label:'Логи и алерты', sub:'в Telegram', h:4, row:'Логи и алерты в Telegram'}
          ]}
        ]
      },

      // автоворонка Chatterfy 10 ч, мин $400
      funnel: {
        name:'Автоворонка Chatterfy', icon:'funnel', hours:10, min:400, cx:[3,5],
        copy:'Автоворонка в Chatterfy под ключ, с оформлением сообщений',
        support:'business', extHint:'Chatterfy ≈ $3/день ≈ $90/мес',
        qs:[
          {id:'stages', type:'one', title:'Этапы воронки', def:'reg', opts:[
            {k:'reg', label:'Reg', sub:'регистрация', copy:'Этапы: Reg'},
            {k:'fd', label:'Reg → FD', sub:'+ первый депозит', h:4, row:'Этап FD', copy:'Этапы: Reg → FD'},
            {k:'rd', label:'Reg → FD → RD', sub:'+ повторные депозиты', h:8, w:1, row:'Этапы FD и RD', copy:'Этапы: Reg → FD → RD'}
          ]},
          {id:'chains', type:'num', title:'Цепочек дожима', short:'Цепочек дожима', unit:'шт.',
            min:1, max:15, step:1, def:2, free:2, h:1.5, wAt:[[6,1]], hint:'2 — в базе, дальше +1,5 ч за цепочку'},
          {id:'geo', type:'num', title:'ГЕО / языков', short:'ГЕО / языков', unit:'шт.',
            min:1, max:15, step:1, def:1, free:1, h:2, wAt:[[4,1],[8,2]], hint:'Каждое следующее ГЕО: +2 ч на адаптацию'},
          {id:'extra', type:'many', title:'Ещё', def:[], opts:[
            {k:'ab', label:'A/B-тесты', sub:'сообщений и сценариев', h:4, w:1},
            {k:'trk', label:'Постбэки в трекер', sub:'Keitaro / Binom', h:3, int:1, intName:'трекер'},
            {k:'ai', label:'ИИ-ответы', sub:'GPT в диалогах', h:6, w:2, row:'ИИ-ответы в диалогах'}
          ]}
        ]
      },

      // CRM MVP 90 ч, мин $3 500
      crm: {
        name:'CRM под ключ', icon:'crm', hours:90, min:3500, cx:[4,7],
        copy:'CRM: клиенты, карточки, задачи, роли и доступы, уникальный дизайн',
        support:'pro', extHint:'Сервер и база ≈ $20–60/мес, API ИИ — по объёму',
        qs:[
          {id:'mods', type:'many', title:'Модули', hint:'В базе: клиенты, карточки, задачи, роли', def:['deals'], opts:[
            {k:'chats', label:'Чаты мессенджеров', sub:'Telegram, WhatsApp', h:40, w:2, int:1, intName:'мессенджеры', row:'Модуль: чаты мессенджеров'},
            {k:'deals', label:'Сделки и воронка', h:16, row:'Модуль: сделки и воронка'},
            {k:'pay', label:'Оплаты и зарплаты', h:24, w:1, row:'Модуль: оплаты и зарплаты'},
            {k:'an', label:'Аналитика', sub:'дашборды, отчёты', h:24, w:1, row:'Модуль: аналитика'},
            {k:'mini', label:'Mini App', sub:'для сотрудников', h:30, w:1, row:'Модуль: Mini App'},
            {k:'ai', label:'ИИ-подсказки', sub:'операторам в чатах', h:30, w:2, row:'Модуль: ИИ-подсказки'}
          ]},
          {id:'staff', type:'one', title:'Сотрудников в системе', def:'s', opts:[
            {k:'s', label:'до 10', copy:'До 10 сотрудников'},
            {k:'m', label:'10–50', h:8, w:1, row:'10–50 сотрудников', copy:'10–50 сотрудников'},
            {k:'l', label:'50–200', h:20, w:2, row:'50–200 сотрудников', copy:'50–200 сотрудников'},
            {k:'xl', label:'200+', h:36, w:3, row:'200+ сотрудников', copy:'200+ сотрудников'}
          ]},
          {id:'ints', type:'num', title:'Внешних интеграций', short:'Внешних интеграций', unit:'шт.',
            min:0, max:10, step:1, def:0, free:0, h:10, int:1, hint:'Телефония, платёжка, трекер, ERP… +10 ч и +15% за каждую'},
          {id:'api', type:'one', when:{q:'ints', gt:0}, title:'У этих систем есть API?', def:'yes', opts:[
            {k:'yes', label:'Да', copy:'У внешних систем есть API'},
            {k:'no', label:'Нет у некоторых', noApi:true, copy:'Часть систем — без API'}
          ]},
          {id:'mig', type:'one', title:'Перенос данных', def:'no', opts:[
            {k:'no', label:'Начинаем с нуля', none:true},
            {k:'yes', label:'Из старой системы', h:12, w:1, row:'Перенос данных из старой системы'}
          ]}
        ]
      }
    }
  };

  /* ---------------- вопросы клиенту (шаг 02) ----------------
     Живым языком, на «вы». Порядок: задача → ключевые функции → общие (tail). */
  const ASK_TAIL = {
    users:'Кто будет пользоваться — вы, сотрудники или ваши клиенты? Примерно сколько человек?',
    refs:'Есть ли примеры или референсы, которые вам нравятся? Пришлите ссылки или скриншоты.',
    deadline:'К какому сроку нужно запустить?',
    budget:'Есть ли ориентир по бюджету? Так мы сразу предложим подходящий вариант.'
  };
  const ASK = {
    site:{q:[
      'Расскажите коротко о бизнесе: чем занимаетесь и какую задачу должен решить сайт?',
      'Нужен одностраничный лендинг или сайт из нескольких страниц? Если несколько — какие разделы?',
      'На каких языках нужен сайт?',
      'Куда отправлять заявки с сайта — в Telegram или в CRM (какую)? Нужна ли онлайн-оплата?',
      'Хотите сами менять тексты и фото на сайте, или правки будем вносить мы?',
      'Есть ли готовые тексты, логотип и фирменный стиль?'
    ], tail:['refs','deadline','budget']},
    bot:{q:[
      'Расскажите о бизнесе: чем занимаетесь и что должен делать бот — какие заявки принимать, на какие вопросы отвечать?',
      'Нужна ли оплата прямо в боте — Telegram Stars, карта или крипта?',
      'Куда передавать заявки: менеджеру в чат, в Google Таблицу или в CRM (какую)?',
      'Нужны ли ответы с ИИ по вашей базе знаний — как у живого консультанта?',
      'Нужны ли рассылки, несколько языков или веб-админка для управления ботом?'
    ], tail:['users','refs','deadline','budget']},
    miniapp:{q:[
      'Расскажите о бизнесе: что пользователь должен сделать в приложении — записаться, заказать, посмотреть личный кабинет?',
      'Сколько примерно экранов и разделов вы видите?',
      'Нужен ли приём оплаты внутри приложения?',
      'С чем связать приложение: с CRM, ботом, Google Таблицей или трекером?'
    ], tail:['users','refs','deadline','budget']},
    ext:{q:[
      'Расскажите о задаче: какую рутину команда сейчас делает в CRM вручную?',
      'В какой CRM вы работаете? Пришлите, пожалуйста, скриншот рабочего экрана.',
      'Есть ли у CRM открытый API или доступ к нему?',
      'Какие действия автоматизировать: подстановку данных, звонки, шаблоны, массовые действия, очередь без дублей?',
      'Куда передавать данные — в Google Таблицу, обратно в CRM или на ваш сервер?'
    ], tail:['users','deadline','budget']},
    dash:{q:[
      'Расскажите о бизнесе: какие решения хотите принимать по дашборду?',
      'Откуда брать данные — CRM, реклама, таблицы, мессенджеры? Сколько всего источников?',
      'Какие метрики и отчёты важнее всего видеть каждый день?',
      'Нужна ли проверка диалогов операторов с помощью ИИ — оценки и рейтинг команды?',
      'Нужны ли роли и доступы, обновление в реальном времени, выгрузки или отчёты в Telegram?'
    ], tail:['users','refs','deadline','budget']},
    integr:{q:[
      'Расскажите о задаче: какие данные сейчас переносятся вручную и сколько времени это занимает?',
      'Какие системы нужно связать и что между ними должно передаваться?',
      'Есть ли у этих систем API — или доступ к нему?',
      'Как часто обновлять данные: по расписанию или сразу, в реальном времени?',
      'Нужны ли постбэки в трекер (Keitaro, Binom), сверка данных или оповещения об ошибках?'
    ], tail:['deadline','budget']},
    funnel:{q:[
      'Расскажите о продукте: что продвигаем, в каких ГЕО и на каких языках общаемся с аудиторией?',
      'Какие этапы нужно вести: регистрация, первый депозит, повторные депозиты?',
      'Сколько цепочек дожима и сообщений вы видите?',
      'Какой источник трафика и какой трекер используете?',
      'Нужны ли A/B-тесты сообщений или ИИ-ответы в диалогах?'
    ], tail:['refs','deadline','budget']},
    crm:{q:[
      'Расскажите о бизнесе: какие процессы нужно вести в CRM — заявки, сделки, чаты, оплаты, зарплаты?',
      'Сколько сотрудников будет работать в системе и какие у них роли?',
      'Какими мессенджерами и сервисами пользуетесь — что нужно подключить (телефония, платёжка, трекер)?',
      'Нужно ли перенести данные из старой системы? Из какой?',
      'Нужны ли аналитика, ИИ-подсказки операторам или Mini App для сотрудников?'
    ], tail:['refs','deadline','budget']}
  };
  const askList = pk => ASK[pk].q.concat(ASK[pk].tail.map(k => ASK_TAIL[k]));

  // порядок продуктов на первом шаге
  const ORDER = ['site','bot','miniapp','ext','dash','integr','funnel','crm'];
  const STEPS = ['Продукт','Вопросы','Задача','Условия','Смета'];
  const ST = {prod:0, ask:1, task:2, cond:3, fin:4};

  const ICONS = {
    site:'<path d="M3 9h18M3 9v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9M3 9V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/>',
    bot:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
    miniapp:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4M9 7h6M9 11h6"/>',
    ext:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12h8M12 8v8"/>',
    dash:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    integr:'<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M9 6h6M18 9v6M8.2 8.2l7.6 7.6"/>',
    funnel:'<path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z"/>',
    crm:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>'
  };
  const svg = (inner, s = 20, sw = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const I_X = svg('<path d="M6 6l12 12M18 6 6 18"/>', 16, 2);
  const I_BACK = svg('<path d="M15 18l-6-6 6-6"/>', 16, 2);
  const I_NEXT = svg('<path d="M9 18l6-6-6-6"/>', 16, 2);
  const I_CHECK = svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 12, 3);

  /* ---------------- стили ---------------- */
  const CSS = `
  .ncalc{--nc-accent:var(--accent,#4f8cff); --nc-bright:var(--accent-bright,#79a8ff); --nc-deep:var(--accent-deep,#1e4fd0);
    --nc-txt:var(--txt,#eef0f6); --nc-muted:var(--muted,#8b90a6); --nc-muted2:var(--muted-2,#7a8098);
    --nc-glass:var(--glass,rgba(255,255,255,0.04)); --nc-glass2:var(--glass-2,rgba(255,255,255,0.025)); --nc-border:var(--border,rgba(255,255,255,0.09));
    --nc-out:cubic-bezier(0.23,1,0.32,1); --nc-drawer:cubic-bezier(0.32,0.72,0,1);
    position:fixed; inset:0; z-index:100; display:grid; place-items:center; padding:16px;
    font-family:'Sora',sans-serif; color:var(--nc-txt); line-height:1.5; text-align:left;}
  .ncalc[hidden]{display:none;}
  .ncalc *,.ncalc *::before,.ncalc *::after{box-sizing:border-box; margin:0; padding:0;}
  .ncalc button,.ncalc input{font-family:inherit; color:inherit;}
  .nc-back{position:absolute; inset:0; background:rgba(3,4,8,.62); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
    opacity:0; transition:opacity .2s ease-out;}
  .ncalc.is-open .nc-back{opacity:1; transition-duration:.26s;}

  /* окно: то же стекло, что у модалок дашборда */
  .nc-card{--nc-th:118px; --nc-fh:76px;
    position:relative; width:100%; max-width:640px; max-height:calc(100vh - 32px); max-height:calc(100dvh - 32px);
    display:flex; flex-direction:column; overflow:hidden; border-radius:24px;
    border:1px solid var(--nc-border); box-shadow:0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
    opacity:0; transform:translateY(12px) scale(.98);
    transition:opacity .2s ease-out, transform .2s var(--nc-out);}
  /* стекло окна — в псевдоэлементе: backdrop-filter на самом окне сделал бы его «корнем»,
     и размытие плашек шапки/низа перестало бы видеть контент под ними */
  .nc-card::before{content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
    background:var(--nc-glass); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);}
  .ncalc.is-open .nc-card{opacity:1; transform:none; transition-duration:.26s;}

  /* шапка и низ окна — без своего фона, поверх прокручиваемого тела.
     Стеклянная плашка (::before) проявляется, только когда контент уходит под них; текст не двигается */
  .nc-top,.nc-foot{position:absolute; left:0; right:0; z-index:3;}
  .nc-top{top:0; padding:22px 26px 12px;}
  .nc-foot{bottom:0; display:flex; align-items:center; gap:10px; padding:14px 26px 20px;}
  .nc-top::before,.nc-foot::before{content:''; position:absolute; z-index:-1; border-radius:14px; pointer-events:none;
    background:rgba(9,11,19,0.62); border:1px solid rgba(255,255,255,0.09);
    backdrop-filter:blur(18px) saturate(1.3); -webkit-backdrop-filter:blur(18px) saturate(1.3);
    box-shadow:0 12px 36px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.05);
    opacity:0; transition:opacity .3s var(--nc-out), transform .3s var(--nc-out);}
  .nc-top::before{inset:8px 10px 0; transform:translateY(-6px) scale(.985);}
  .nc-foot::before{inset:4px 10px 8px; transform:translateY(6px) scale(.985);}
  .nc-card.top-on .nc-top::before,.nc-card.bot-on .nc-foot::before{opacity:1; transform:none;}

  .nc-head{display:flex; align-items:center; justify-content:space-between; gap:12px;}
  .nc-kicker{font-family:'Space Mono',monospace; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--nc-bright); opacity:.85;}
  .nc-ib{flex:none; width:34px; height:34px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;
    color:var(--nc-muted); background:rgba(255,255,255,0.04); border:1px solid var(--nc-border); -webkit-tap-highlight-color:transparent;
    transition:color .15s ease, border-color .15s ease, background-color .15s ease, transform .15s var(--nc-out);}
  .nc-ib:active{transform:scale(.94);}

  /* прогресс: 5 шагов, по ним можно кликать */
  .nc-prog{display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin-top:16px;}
  .nc-ps{background:none; border:0; text-align:left; cursor:pointer; padding:0 0 2px; color:var(--nc-muted2); border-radius:6px; min-width:0;
    transition:color .2s ease; -webkit-tap-highlight-color:transparent;}
  .nc-ps:disabled{cursor:default; opacity:.45;}
  .nc-bar{display:block; height:3px; border-radius:2px; background:rgba(255,255,255,0.08); overflow:hidden;}
  .nc-bar i{display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--nc-bright),var(--nc-accent));
    transform:scaleX(0); transform-origin:0 50%; transition:transform .3s var(--nc-out);}
  .nc-ps.done .nc-bar i,.nc-ps.cur .nc-bar i{transform:none;}
  .nc-ps.done{color:var(--nc-muted);}
  .nc-ps.cur{color:var(--nc-txt);}
  .nc-pl{display:block; margin-top:8px; font-family:'Space Mono',monospace; font-size:10.5px; letter-spacing:1px; text-transform:uppercase;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .nc-pl b{font-weight:400; opacity:.6; margin-right:6px;}

  /* тело окна: прокрутка под шапкой и низом; горизонтальный сдвиг не даёт полосы */
  .nc-view{position:relative; flex:1 1 auto; min-height:0; overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain;
    scrollbar-width:thin; scrollbar-color:rgba(121,168,255,.25) transparent;}
  .nc-card.nc-morph .nc-view{overflow-y:hidden;}
  .nc-pane{padding:calc(var(--nc-th) + 6px) 26px calc(var(--nc-fh) + 6px);}
  .nc-pane.out{position:absolute; left:0; right:0; pointer-events:none;}
  .nc-h{font-size:22px; font-weight:700; letter-spacing:-.4px; line-height:1.2; outline:none;}
  .nc-sub{color:var(--nc-muted); font-size:13.5px; font-weight:300; margin-top:6px;}
  .nc-pane > .nc-sub{margin-bottom:18px;}

  /* шаг 1: продукты */
  .nc-prods{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;}
  .nc-prod{display:flex; align-items:center; gap:12px; padding:13px 14px; border-radius:16px; cursor:pointer; text-align:left; min-width:0;
    background:var(--nc-glass2); border:1px solid var(--nc-border); -webkit-tap-highlight-color:transparent;
    transition:border-color .15s ease, background-color .15s ease, transform .15s var(--nc-out);}
  .nc-prod .ic{flex:none; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
    color:var(--nc-bright); background:rgba(79,140,255,0.08); border:1px solid rgba(79,140,255,0.2); transition:background-color .15s ease, border-color .15s ease;}
  .nc-prod .tx{min-width:0;}
  .nc-prod b{display:block; font-size:14px; font-weight:600; line-height:1.3;}
  .nc-prod small{display:block; margin-top:3px; font-family:'Space Mono',monospace; font-size:11px; color:var(--nc-muted); font-variant-numeric:tabular-nums;}
  .nc-prod[aria-pressed="true"]{border-color:rgba(121,168,255,0.6); background-color:rgba(79,140,255,0.12);}
  .nc-prod[aria-pressed="true"] .ic{background:rgba(79,140,255,0.2); border-color:rgba(121,168,255,0.5);}
  .nc-prod[aria-pressed="true"] small{color:var(--nc-bright);}
  .nc-prod:active{transform:scale(.98);}

  /* шаг 2: вопросы клиенту */
  .nc-asks{display:flex; flex-direction:column; gap:8px;}
  .nc-ask{display:flex; align-items:flex-start; gap:10px; width:100%; padding:11px 13px; border-radius:12px; cursor:pointer; text-align:left;
    font-size:13.5px; line-height:1.45; color:var(--nc-muted); background:var(--nc-glass2); border:1px solid var(--nc-border);
    -webkit-tap-highlight-color:transparent;
    transition:color .15s ease, border-color .15s ease, background-color .15s ease, transform .15s var(--nc-out);}
  .nc-ask .n{flex:none; min-width:18px; margin-top:1px; font-family:'Space Mono',monospace; font-size:11px; color:var(--nc-bright);
    font-variant-numeric:tabular-nums; transition:opacity .15s ease;}
  .nc-ask[aria-pressed="true"]{color:var(--nc-txt); border-color:rgba(121,168,255,0.28); background-color:rgba(79,140,255,0.06);}
  .nc-ask[aria-pressed="false"] .n{opacity:0;}
  .nc-ask:active{transform:scale(.99);}
  .nc-ask .nc-cb{margin-top:2px;}
  .nc-ask-acts{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; flex-wrap:wrap;}
  .nc-ask-acts .nc-hint{margin:0; font-family:'Space Mono',monospace; font-size:10.5px;}

  /* вопросы */
  .nc-q{padding:16px 0; border-top:1px solid rgba(255,255,255,0.06);}
  .nc-q.first{border-top:0; padding-top:0;}
  .nc-q[hidden]{display:none;}
  .nc-qh{display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:10px;}
  .nc-qt{font-size:14px; font-weight:600; line-height:1.35;}
  .nc-qm{flex:none; font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--nc-muted2);}
  .nc-hint{display:block; margin-top:8px; font-size:12px; color:var(--nc-muted); font-weight:300;}
  .nc-opts{display:flex; flex-wrap:wrap; gap:8px;}
  .nc-opt{position:relative; display:inline-flex; align-items:flex-start; gap:9px; padding:9px 13px; border-radius:11px; cursor:pointer; text-align:left;
    color:var(--nc-muted); background:rgba(255,255,255,0.04); border:1px solid var(--nc-border); -webkit-tap-highlight-color:transparent; min-width:0;
    transition:background-color .15s ease, border-color .15s ease, color .15s ease, transform .15s var(--nc-out);}
  .nc-opt .t{display:flex; flex-direction:column; min-width:0;}
  .nc-opt .l{font-size:13px; font-weight:500; line-height:1.3;}
  .nc-opt .s{font-size:11.5px; font-weight:300; color:var(--nc-muted2); line-height:1.35; margin-top:2px; transition:color .15s ease;}
  .nc-opt .m{font-family:'Space Mono',monospace; font-size:10.5px; color:var(--nc-muted2); margin-top:3px; font-variant-numeric:tabular-nums; transition:color .15s ease;}
  .nc-opt[aria-pressed="true"]{color:#fff; background:rgba(79,140,255,0.2); border-color:rgba(121,168,255,0.6);}
  .nc-opt[aria-pressed="true"] .s{color:rgba(238,240,246,.7);}
  .nc-opt[aria-pressed="true"] .m{color:var(--nc-bright);}
  .nc-opt:active{transform:scale(.97);}
  .nc-cb{flex:none; width:16px; height:16px; margin-top:1px; border-radius:5px; border:1px solid rgba(255,255,255,0.22); display:flex; align-items:center; justify-content:center;
    color:#fff; transition:background-color .15s ease, border-color .15s ease;}
  .nc-cb svg{opacity:0; transform:scale(.6); transition:opacity .15s ease, transform .15s var(--nc-out);}
  [aria-pressed="true"] > .nc-cb{background:var(--nc-accent); border-color:var(--nc-accent);}
  [aria-pressed="true"] > .nc-cb svg{opacity:1; transform:none;}
  .nc-rec{position:absolute; top:-8px; right:8px; font-style:normal; font-family:'Space Mono',monospace; font-size:9px; letter-spacing:.6px; text-transform:uppercase;
    color:#fff; padding:1px 7px; border-radius:6px; white-space:nowrap; background:linear-gradient(135deg,var(--nc-accent),var(--nc-deep)); box-shadow:0 2px 10px rgba(79,140,255,.4);}
  /* поддержка: 4 компактные карточки в одну строку (на телефоне 2×2), бейдж не влияет на высоту */
  .nc-opts.g4{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; padding-top:8px;}
  .nc-opts.g4 .nc-opt{display:flex; padding:10px 12px;}
  .nc-opts.g4 .t{width:100%;}
  .nc-opts.g4 .s{white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .nc-opts.g4 .m{margin-top:6px; font-size:11px;}

  /* степпер числа */
  .nc-num{flex:none; display:inline-flex; align-items:center; gap:2px; padding:3px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid var(--nc-border);
    transition:border-color .15s ease, box-shadow .15s ease;}
  .nc-num:focus-within{border-color:rgba(121,168,255,0.6); box-shadow:0 0 0 4px rgba(79,140,255,0.15);}
  .nc-num button{width:36px; height:36px; border-radius:9px; border:0; background:rgba(255,255,255,0.05); cursor:pointer; font-size:18px; line-height:1;
    display:flex; align-items:center; justify-content:center; -webkit-tap-highlight-color:transparent;
    transition:background-color .15s ease, opacity .15s ease, transform .15s var(--nc-out);}
  .nc-num button:active{transform:scale(.92);}
  .nc-num button:disabled{opacity:.35; cursor:default; transform:none;}
  .nc-num input{width:64px; height:36px; border:0; background:none; outline:none; text-align:center; font-size:16px; font-weight:600;
    font-variant-numeric:tabular-nums; color:var(--nc-txt);}
  .nc-num input.wide{width:76px;}
  .nc-nrow{display:flex; align-items:center; gap:12px; flex-wrap:wrap;}
  .nc-nrow .u{font-size:13px; color:var(--nc-muted);}
  .nc-nrow .m{font-family:'Space Mono',monospace; font-size:11px; color:var(--nc-bright); font-variant-numeric:tabular-nums;}
  /* компактный вопрос в одну строку: подпись слева, степпер справа */
  .nc-inl{display:flex; align-items:center; justify-content:space-between; gap:14px;}
  .nc-inl .nc-il{min-width:0;}
  .nc-inl .nc-hint{margin-top:2px;}

  /* итог */
  .nc-hero{padding:18px 20px 16px; border-radius:18px; border:1px solid rgba(121,168,255,0.35);
    background:linear-gradient(135deg,rgba(79,140,255,0.14),rgba(30,79,208,0.05));}
  .nc-lab{font-family:'Space Mono',monospace; font-size:10px; letter-spacing:.8px; text-transform:uppercase; color:var(--nc-muted);}
  .nc-big{font-size:clamp(38px,7vw,50px); font-weight:800; letter-spacing:-1.5px; line-height:1.1; margin-top:6px; white-space:nowrap;
    font-variant-numeric:tabular-nums; background:linear-gradient(180deg,#fff,#c3cbe6); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;}
  .nc-facts{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-top:14px;}
  .nc-fact{padding:10px 12px; border-radius:12px; background:rgba(5,6,10,0.25); border:1px solid rgba(255,255,255,0.06); min-width:0;}
  .nc-fact b{display:block; margin-top:4px; font-size:14.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums;}
  .nc-sec{margin-top:20px; font-family:'Space Mono',monospace; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:var(--nc-muted2); margin-bottom:6px;}
  .nc-rows{display:flex; flex-direction:column;}
  .nc-row{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 14px; align-items:baseline; padding:8px 0; font-size:13.5px;
    border-top:1px solid rgba(255,255,255,0.05);}
  .nc-row:first-child{border-top:0;}
  .nc-row .v{font-weight:600; white-space:nowrap; text-align:right; font-variant-numeric:tabular-nums;}
  .nc-row small{grid-column:1 / -1; margin-top:-2px; font-size:11.5px; color:var(--nc-muted); font-weight:300;}
  .nc-row.mul .v{color:var(--nc-bright);}
  .nc-row.sub{color:var(--nc-muted);}
  .nc-row.sub .v{color:var(--nc-txt);}
  .nc-row.tot{font-size:15px; font-weight:700; border-top-color:rgba(121,168,255,0.3); padding-top:12px;}
  .nc-row.tot .v{font-size:17px;}
  .nc-row.warn .v{color:var(--nc-bright);}
  .nc-sup{display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 14px; align-items:baseline; margin-top:14px; padding:12px 14px; border-radius:14px;
    background:var(--nc-glass2); border:1px solid var(--nc-border); font-size:13.5px;}
  .nc-sup .v{font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums;}
  .nc-sup small{grid-column:1 / -1; font-size:11.5px; color:var(--nc-muted); font-weight:300;}
  .nc-fine{margin-top:16px; text-align:center; font-size:11.5px; color:var(--nc-muted2); font-weight:300;}

  /* низ окна: оценка + кнопки */
  .nc-est{margin-right:auto; min-width:0; line-height:1.25;}
  .nc-est .v{display:block; font-size:17px; font-weight:700; letter-spacing:-.3px; white-space:nowrap; font-variant-numeric:tabular-nums;}
  .nc-est .s{display:block; margin-top:3px; font-family:'Space Mono',monospace; font-size:10.5px; color:var(--nc-muted); white-space:nowrap;}
  .nc-est .e{font-size:13px; color:var(--nc-muted); font-weight:300;}

  /* кнопки — как .btn-primary / .btn-ghost дашборда */
  .nc-btn{position:relative; display:inline-flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; text-decoration:none; white-space:nowrap;
    padding:11px 20px; border-radius:12px; font-size:14px; line-height:1.3; -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none;}
  .nc-primary{color:#fff; font-weight:600; border:1px solid transparent;
    background-image:linear-gradient(135deg,#8fb6ff 0%,var(--nc-accent) 50%,var(--nc-deep) 100%); background-size:200% 200%; background-position:100% 100%;
    background-origin:border-box; box-shadow:0 6px 28px rgba(79,140,255,.3);
    transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .2s cubic-bezier(.2,.8,.2,1), background-position .22s cubic-bezier(.2,.8,.2,1), opacity .2s ease;}
  .nc-ghost{color:var(--nc-txt); font-weight:500; background-color:var(--nc-glass); border:1px solid var(--nc-border); background-origin:border-box;
    transition:transform .18s cubic-bezier(.2,.8,.2,1), background-color .2s cubic-bezier(.2,.8,.2,1), border-color .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s cubic-bezier(.2,.8,.2,1), color .2s cubic-bezier(.2,.8,.2,1), opacity .2s ease;}
  .nc-primary:active{transform:scale(.97); box-shadow:0 3px 14px rgba(79,140,255,.35);}
  .nc-ghost:active{transform:scale(.97); background-color:rgba(79,140,255,.16); border-color:rgba(121,168,255,.5);}
  .nc-btn:disabled{opacity:.45; cursor:not-allowed; transform:none; box-shadow:none;}
  .nc-btn[hidden]{display:none;}
  .nc-back-b{padding-left:14px;}
  .nc-btn .nw{display:none;}
  .nc-foot.fin .nc-back-b{margin-right:auto;}
  /* «Скопировать» → «Скопировано ✓»: короткий blur-кроссфейд подписей */
  .nc-copy .a,.nc-copy .b{transition:opacity .2s ease, transform .2s var(--nc-out), filter .2s ease;}
  .nc-copy .b{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0; transform:translateY(6px); filter:blur(2px);}
  .nc-copy.done .a{opacity:0; transform:translateY(-6px); filter:blur(2px);}
  .nc-copy.done .b{opacity:1; transform:none; filter:none;}

  .ncalc button:focus-visible{outline:2px solid var(--nc-bright); outline-offset:2px;}

  @media (hover:hover) and (pointer:fine){
    .nc-ib:hover{color:var(--nc-txt); border-color:rgba(121,168,255,.4); background:rgba(79,140,255,.08);}
    .nc-ps:not(:disabled):not(.cur):hover{color:var(--nc-txt);}
    .nc-prod:not([aria-pressed="true"]):hover{border-color:rgba(121,168,255,.35); background-color:rgba(79,140,255,.06);}
    .nc-opt:not([aria-pressed="true"]):hover,.nc-ask:hover{color:var(--nc-txt); border-color:rgba(121,168,255,.35);}
    .nc-num button:not(:disabled):hover{background:rgba(79,140,255,.16);}
    .nc-primary:not(:disabled):hover{transform:translateY(-2px); background-position:50% 50%; box-shadow:0 12px 36px rgba(79,140,255,.5), 0 0 0 1px rgba(121,168,255,.35);}
    .nc-ghost:not(:disabled):hover{transform:translateY(-2px); color:#fff; background-color:rgba(79,140,255,.12); border-color:rgba(121,168,255,.5); box-shadow:0 8px 28px rgba(79,140,255,.22);}
  }

  /* телефон: окно снизу, как sheet */
  @media (max-width:560px){
    .ncalc{place-items:end stretch; padding:0;}
    .nc-card{max-width:none; max-height:calc(100dvh - 24px); border-radius:24px 24px 0 0; border-bottom:0;
      transform:translateY(100%); transition:opacity .2s ease-out, transform .2s var(--nc-out);}
    .ncalc.is-open .nc-card{transition:opacity .2s ease-out, transform .3s var(--nc-drawer);}
    .nc-top{padding:18px 16px 12px;}
    .nc-top::before{inset:6px 6px 0;}
    .nc-foot{padding:12px 16px calc(14px + env(safe-area-inset-bottom)); gap:8px;}
    .nc-foot::before{inset:4px 6px calc(6px + env(safe-area-inset-bottom));}
    .nc-prog{margin-top:14px; gap:6px;}
    .nc-pl{font-size:9.5px; letter-spacing:.3px;}
    .nc-pl b{display:none;}
    .nc-pane{padding:calc(var(--nc-th) + 6px) 16px calc(var(--nc-fh) + 6px);}
    .nc-h{font-size:20px;}
    .nc-prod{flex-direction:column; align-items:flex-start; gap:10px; padding:12px;}
    .nc-prod .ic{width:36px; height:36px; border-radius:11px;}
    .nc-prod b{font-size:13px;}
    .nc-opt{padding:8px 11px;}
    .nc-opt .l{font-size:12.5px;}
    .nc-opts.g4{grid-template-columns:repeat(2,minmax(0,1fr)); row-gap:14px;}
    .nc-ask{font-size:13px; padding:10px 12px;}
    .nc-facts{grid-template-columns:repeat(2,minmax(0,1fr));}
    .nc-fact:first-child{grid-column:1 / -1;}
    .nc-btn{padding:11px 16px;}
    .nc-back-b{padding:11px 12px;}
    .nc-btn .w{display:none;}
    .nc-btn .nw{display:inline;}
    .nc-foot.fin .nc-copy{flex:1;}
  }
  @media (max-width:360px){ .nc-prods{grid-template-columns:minmax(0,1fr);} .nc-prod{flex-direction:row; align-items:center;} }

  /* меньше движения: только проявления */
  @media (prefers-reduced-motion:reduce){
    .nc-card,.ncalc.is-open .nc-card{transform:none !important;}
    .nc-top::before,.nc-foot::before{transform:none !important;}
    .nc-bar i{transition:none;}
    .nc-btn,.nc-opt,.nc-prod,.nc-ask,.nc-ib,.nc-num button{transform:none !important;}
    .nc-copy .a,.nc-copy .b,.nc-cb svg{transform:none !important;}
  }`;

  /* ---------------- утилиты ---------------- */
  const REDUCE = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  const EASE = 'cubic-bezier(0.23,1,0.32,1)';
  const P = PRICING;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nf = n => Math.round(n).toLocaleString('ru-RU');
  const usd = n => '$' + nf(n);
  const dec = n => (Math.round(n * 100) / 100).toLocaleString('ru-RU');
  const fx = n => '×' + n.toLocaleString('ru-RU', {minimumFractionDigits:1, maximumFractionDigits:2});
  // часы -> рабочие дни (по 6 продуктивных часов в день), с шагом 0,5
  const hd = h => { const d = Math.round(h / P.days.perDayMax * 2) / 2; return d < 0.5 ? '<0,5 дн' : '≈' + dec(d) + ' дн'; };
  const ceilTo = (n, s) => Math.ceil(n / s - 1e-9) * s;
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? b : c; };
  const daysTxt = (a, b) => `${a}–${b} ${plural(b, 'день', 'дня', 'дней')}`;
  // первая буква строчная, но аббревиатуры (CRM, ИИ, ГЕО) не трогаем
  const lcFirst = s => s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s;
  const plain = s => s.replace(/[  ]/g, ' ');

  // «от $X» — самый низкий минимум продукта (с учётом вариантов формата)
  function fromPrice(p){
    let m = p.min;
    p.qs.forEach(q => (q.opts || []).forEach(o => { if(o.base) m = Math.min(m, o.base.min); }));
    return m;
  }
  const findOpt = (q, k) => q.opts.find(o => o.k === k) || q.opts[0];

  /* ---------------- состояние ---------------- */
  const freshCommon = () => ({urg:'normal', support:'none', ext:P.ext.def});
  const S = {step:0, product:null, ans:{}, askOff:{}, common:freshCommon()};
  function initAns(pk){
    if(S.ans[pk]) return S.ans[pk];
    const a = {};
    P.products[pk].qs.forEach(q => { a[q.id] = q.type === 'many' ? (q.def || []).slice() : q.def; });
    return (S.ans[pk] = a);
  }
  const askOff = pk => (S.askOff[pk] = S.askOff[pk] || []);
  function isVisible(q, a){
    if(!q.when) return true;
    const v = a[q.when.q];
    if(q.when.is) return q.when.is.includes(v);
    if(q.when.gt != null) return +v > q.when.gt;
    return true;
  }

  // общие вопросы шага «Условия» (рекомендуемая поддержка зависит от продукта)
  function commonQs(pk){
    const p = P.products[pk], T = P.support.tiers;
    return [
      {id:'urg', type:'one', title:'Срочность', opts:Object.keys(P.urgency).map(k => {
        const u = P.urgency[k]; return {k, label:u.label, sub:u.sub, meta:fx(u.mult)};
      })},
      {id:'ext', type:'num', inline:true, title:'Внешние расходы, $', unit:'$', min:0, max:P.ext.max, step:P.ext.step, money:true,
        hint:`Разово, отдельной строкой. ${p.extHint || ''}`},
      {id:'support', type:'one', grid:true, title:'Поддержка после запуска', opts:[
        {k:'none', label:'Не нужна', sub:'без обслуживания', meta:'—'}
      ].concat(Object.keys(T).map(k => ({k, label:T[k].name, sub:T[k].short, title:T[k].desc, meta:usd(T[k].price) + '/мес', rec:k === p.support})))}
    ];
  }

  /* ---------------- расчёт ---------------- */
  function estimate(pk){
    const p = P.products[pk], a = initAns(pk), c = S.common;
    let base = {h:p.hours, min:p.min, label:p.name, copy:p.copy};
    const items = [], incl = [], why = [], ints = [];
    let w = 0, noApi = false, optMin = 0, minWhy = '';

    const take = (o, q) => {
      if(o.base){ base = o.base; return; }
      if(!o.none) incl.push(o.copy || o.row || (q.type === 'many' ? o.label : `${q.title}: ${o.label}`));
      if(o.h) items.push({t:o.row || o.label, h:o.h});
      if(o.w){ w += o.w; why.push(lcFirst(o.row || o.label)); }
      if(o.int) ints.push({n:o.int, name:o.intName || o.label});
      if(o.noApi) noApi = true;
      if(o.min && o.min > optMin){ optMin = o.min; minWhy = o.minWhy || o.label; }
    };
    p.qs.forEach(q => {
      if(!isVisible(q, a)) return;
      const v = a[q.id];
      if(q.type === 'one') take(findOpt(q, v), q);
      else if(q.type === 'many') q.opts.forEach(o => { if(v.includes(o.k)) take(o, q); });
      else {
        const extra = Math.max(0, v - q.free);
        incl.push(`${q.short}: ${v}`);
        if(extra && q.h) items.push({t:`${q.short}: ${v}`, note:`${q.free} в базе, +${dec(q.h)} ч за каждый сверх`, h:extra * q.h});
        let wn = 0; (q.wAt || []).forEach(([at, ww]) => { if(v >= at) wn = ww; });
        if(wn){ w += wn; why.push(`${lcFirst(q.short)}: ${v}`); }
        const ni = q.int ? q.int * Math.max(0, v - (q.intFree != null ? q.intFree : q.free)) : 0;
        if(ni) ints.push({n:ni, name:`${lcFirst(q.short)} +${ni}`});
      }
    });
    const U = P.urgency[c.urg] || P.urgency.normal;
    const ext = Math.max(0, +c.ext || 0);

    const hours = base.h + items.reduce((s, x) => s + x.h, 0);
    const lvl = w >= p.cx[1] ? 2 : w >= p.cx[0] ? 1 : 0;
    const N = ints.reduce((s, x) => s + x.n, 0);
    const kApi = noApi ? P.noApi : 1;
    const kInt = 1 + P.intStep * N;
    const floor = Math.max(base.min, optMin);
    const floorWhy = optMin > base.min ? minWhy : base.label.toLowerCase();
    const work = L => hours * P.rate * P.complexity[L].mult * U.mult * kApi * kInt * (1 + P.buffer) * (1 + P.margin);
    const priceAt = L => Math.max(floor, ceilTo(work(L), P.roundTo) + ext);
    const rec = priceAt(lvl);
    const lo = lvl > 0 ? priceAt(lvl - 1) : rec;
    const hi = lvl < 2 ? priceAt(lvl + 1) : ceilTo(rec * P.hardTop, P.roundTo);
    const rounded = ceilTo(work(lvl), P.roundTo);

    // срок: эффективные часы / 5–6 ч в день + 30% на согласования, сжатие за срочность
    const eff = hours * P.complexity[lvl].mult * kApi * (1 + P.days.approvals) * U.days;
    const dFrom = Math.max(1, Math.ceil(eff / P.days.perDayMax));
    const dTo = Math.max(dFrom + 1, Math.ceil(eff / P.days.perDayMin));

    const sup = c.support !== 'none' ? P.support.tiers[c.support] : null;
    return {p, pk, base, items, incl, why, ints, N, w, lvl, noApi, kApi, kInt, U, urgK:c.urg, ext, hours, floor, floorWhy,
      rounded, rec, lo, hi, dFrom, dTo, sup, cost:hours * P.rate, floorHit:rec === floor && rounded + ext < floor};
  }

  /* ---------------- разметка ---------------- */
  let root, card, view, top, foot, estEl, bBack, bNext, bCopy, bReset;
  let isOpen = false, built = false, lastFocus = null, closeT = 0, hAnim = null, swapT = 0, advT = 0;
  let shownEst = 0, lockSaved = null;

  function build(){
    if(built) return; built = true;
    const st = document.createElement('style'); st.id = 'nexus-calc-css'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'ncalc'; root.hidden = true;
    root.innerHTML = `
      <div class="nc-back" data-nc-close></div>
      <div class="nc-card" role="dialog" aria-modal="true" aria-label="Калькулятор стоимости проекта">
        <div class="nc-top">
          <div class="nc-head"><div class="nc-kicker">Nexus AI · калькулятор</div>
            <button type="button" class="nc-ib" data-nc-close aria-label="Закрыть">${I_X}</button></div>
          <nav class="nc-prog" aria-label="Шаги">${STEPS.map((s, i) =>
            `<button type="button" class="nc-ps" data-step="${i}"><span class="nc-bar"><i></i></span><span class="nc-pl"><b>0${i + 1}</b>${s}</span></button>`).join('')}</nav>
        </div>
        <div class="nc-view"></div>
        <div class="nc-foot">
          <div class="nc-est" aria-live="polite"></div>
          <button type="button" class="nc-btn nc-ghost nc-back-b" data-act="back" aria-label="Назад">${I_BACK}<span class="w">Назад</span></button>
          <button type="button" class="nc-btn nc-ghost nc-reset" data-act="reset" hidden><span class="w">Посчитать заново</span><span class="nw">Заново</span></button>
          <button type="button" class="nc-btn nc-primary nc-copy" data-act="copy" hidden><span class="a">Скопировать смету</span><span class="b" aria-hidden="true">Скопировано ✓</span></button>
          <button type="button" class="nc-btn nc-primary nc-next" data-act="next"><span class="w">Далее</span><span class="nw">Далее</span>${I_NEXT}</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    card = root.querySelector('.nc-card'); view = root.querySelector('.nc-view'); top = root.querySelector('.nc-top');
    foot = root.querySelector('.nc-foot'); estEl = root.querySelector('.nc-est');
    bBack = foot.querySelector('[data-act="back"]'); bNext = foot.querySelector('[data-act="next"]');
    bCopy = foot.querySelector('[data-act="copy"]'); bReset = foot.querySelector('[data-act="reset"]');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', e => { if(e.key === 'Enter' && e.target.matches('.nc-num input')){ e.preventDefault(); e.target.blur(); } });
    view.addEventListener('scroll', updScroll, {passive:true});
    // высота шапки и низа → отступы тела окна
    if(window.ResizeObserver){
      const ro = new ResizeObserver(() => { measureChrome(); updScroll(); });
      ro.observe(top); ro.observe(foot);
    }
  }

  function measureChrome(){
    card.style.setProperty('--nc-th', top.offsetHeight + 'px');
    card.style.setProperty('--nc-fh', foot.offsetHeight + 'px');
  }
  // плашки шапки/низа видны, только когда контент уходит под них
  function updScroll(){
    if(!view) return;
    const st = view.scrollTop, rest = view.scrollHeight - view.clientHeight - st;
    card.classList.toggle('top-on', st > 4);
    card.classList.toggle('bot-on', rest > 4);
  }

  function optHTML(q, o, on, scope){
    const many = q.type === 'many';
    const meta = o.meta || (o.h ? `+${dec(o.h)} ч · ${hd(o.h)}` : '');
    return `<button type="button" class="nc-opt" data-scope="${scope}" data-q="${q.id}" data-k="${o.k}" aria-pressed="${on}"${o.title ? ` title="${esc(o.title)}"` : ''}>
      ${many ? `<span class="nc-cb">${I_CHECK}</span>` : ''}
      <span class="t"><span class="l">${esc(o.label)}</span>${o.sub ? `<span class="s">${esc(o.sub)}</span>` : ''}${meta ? `<span class="m">${esc(meta)}</span>` : ''}</span>
      ${o.rec ? '<em class="nc-rec">рекомендуем</em>' : ''}</button>`;
  }
  function numMeta(q, v){
    if(q.money) return '';
    const extra = Math.max(0, v - q.free);
    return extra && q.h ? `+${dec(extra * q.h)} ч · ${hd(extra * q.h)}` : 'в базе';
  }
  function numHTML(q, v, scope, tid){
    return `<div class="nc-num" data-scope="${scope}" data-q="${q.id}">
      <button type="button" data-d="-1" aria-label="Меньше" ${v <= q.min ? 'disabled' : ''}>−</button>
      <input type="text" inputmode="numeric" value="${v}" aria-labelledby="${tid}"${q.money ? ' class="wide"' : ''}>
      <button type="button" data-d="1" aria-label="Больше" ${v >= q.max ? 'disabled' : ''}>+</button></div>`;
  }
  function qHTML(q, v, scope, i, hidden){
    const tid = `nc-q-${scope}-${q.id}`;
    const cls = `nc-q${i === 0 ? ' first' : ''}`;
    if(q.inline){
      return `<div class="${cls} nc-inl" data-qid="${q.id}"><div class="nc-il"><div class="nc-qt" id="${tid}">${esc(q.title)}</div>
        ${q.hint ? `<span class="nc-hint">${esc(q.hint)}</span>` : ''}</div>${numHTML(q, v, scope, tid)}</div>`;
    }
    let body;
    if(q.type === 'num'){
      body = `<div class="nc-nrow">${numHTML(q, v, scope, tid)}
        <span class="u">${esc(q.unit || '')}</span><span class="m">${esc(numMeta(q, v))}</span></div>`;
    } else {
      body = `<div class="nc-opts${q.grid ? ' g4' : ''}" role="group" aria-labelledby="${tid}">${q.opts.map(o =>
        optHTML(q, o, q.type === 'many' ? v.includes(o.k) : v === o.k, scope)).join('')}</div>`;
    }
    return `<div class="${cls}" data-qid="${q.id}"${hidden ? ' hidden' : ''}>
      <div class="nc-qh"><div class="nc-qt" id="${tid}">${esc(q.title)}</div>${q.type === 'many' ? '<span class="nc-qm">несколько</span>' : ''}</div>
      ${body}${q.hint ? `<span class="nc-hint">${esc(q.hint)}</span>` : ''}</div>`;
  }

  function askHTML(pk){
    const off = askOff(pk);
    let n = 0;
    return `<h2 class="nc-h" tabindex="-1">Спросите клиента</h2>
      <p class="nc-sub">Отправьте в Telegram — по ответам заполните расчёт</p>
      <div class="nc-asks" role="group" aria-label="Вопросы клиенту">${askList(pk).map((t, i) => {
        const on = !off.includes(i);
        return `<button type="button" class="nc-ask" data-ask="${i}" aria-pressed="${on}"><span class="nc-cb">${I_CHECK}</span>
          <span class="n">${on ? ++n + '.' : ''}</span><span class="tx">${esc(t)}</span></button>`;
      }).join('')}</div>
      <div class="nc-ask-acts"><span class="nc-hint nc-ask-cnt">${askCount(pk)}</span>
        <button type="button" class="nc-btn nc-ghost nc-copy" data-act="copyq"${n ? '' : ' disabled'}><span class="a">Скопировать вопросы</span><span class="b" aria-hidden="true">Скопировано ✓</span></button></div>`;
  }
  function askCount(pk){ const all = askList(pk).length; return `Выбрано ${all - askOff(pk).length} из ${all}`; }

  function paneHTML(step){
    if(step === ST.prod){
      return `<h2 class="nc-h" tabindex="-1">Что хочет клиент?</h2>
        <p class="nc-sub">Выберите продукт — дальше вопросы клиенту и расчёт</p>
        <div class="nc-prods" role="group" aria-label="Продукт">${ORDER.map(k => {
          const p = P.products[k];
          return `<button type="button" class="nc-prod" data-prod="${k}" aria-pressed="${S.product === k}">
            <span class="ic">${svg(ICONS[p.icon])}</span><span class="tx"><b>${esc(p.name)}</b><small>от ${usd(fromPrice(p))}</small></span></button>`;
        }).join('')}</div>`;
    }
    const pk = S.product, p = P.products[pk];
    if(step === ST.ask) return askHTML(pk);
    if(step === ST.task){
      const a = initAns(pk);
      let n = 0;
      return `<h2 class="nc-h" tabindex="-1">${esc(p.name)}</h2>
        <p class="nc-sub">Заполните по ответам клиента — цена и срок меняются сразу, смотрите внизу</p>
        ${p.qs.map(q => { const vis = isVisible(q, a); return qHTML(q, a[q.id], 'p', vis ? n++ : 1, !vis); }).join('')}`;
    }
    if(step === ST.cond){
      return `<h2 class="nc-h" tabindex="-1">Сроки и условия</h2>
        <p class="nc-sub">Срочность, внешние расходы и поддержка</p>
        ${commonQs(pk).map((q, i) => qHTML(q, S.common[q.id], 'c', i, false)).join('')}`;
    }
    return resultHTML(estimate(pk));
  }

  function resultHTML(E){
    const C = P.complexity[E.lvl];
    const rows = [];
    const row = (t, v, cls = '', note = '') => rows.push(`<div class="nc-row ${cls}"><span>${esc(t)}</span><span class="v">${esc(v)}</span>${note ? `<small>${esc(note)}</small>` : ''}</div>`);
    row(`База · ${E.base.label}`, `${dec(E.base.h)} ч · ${hd(E.base.h)}`, '', 'Дизайн и анимации включены');
    E.items.forEach(x => row(x.t, `+${dec(x.h)} ч · ${hd(x.h)}`, '', x.note || ''));
    row(`Всего работы · ${dec(E.hours)} ч (${hd(E.hours)}) × ${usd(P.rate)}`, usd(E.cost), 'sub');
    row(`Сложность: ${C.label} проект`, fx(C.mult), 'mul',
      (E.why.length ? 'Учтено: ' + E.why.join(', ') + '. ' : 'Без усложняющих опций. ') + `Баллов: ${E.w} (средний от ${E.p.cx[0]}, сложный от ${E.p.cx[1]})`);
    if(E.U.mult !== 1) row(`Срочность: ${E.U.label.toLowerCase()}`, fx(E.U.mult), 'mul');
    if(E.noApi) row('Нет API у системы клиента', fx(E.kApi), 'mul');
    if(E.N) row(`Интеграции: ${E.N} × 15%`, fx(E.kInt), 'mul', E.ints.map(x => x.name).join(', '));
    row('Резерв на риски', fx(1 + P.buffer), 'mul');
    row('Маржа', fx(1 + P.margin), 'mul');
    row(`Цена работы, вверх до ${usd(P.roundTo)}`, usd(E.rounded), 'sub');
    if(E.ext) row('Внешние расходы', '+' + usd(E.ext), '', 'Хостинг, API, лицензии — разово');
    if(E.floorHit) row(`Минимум: ${E.floorWhy}`, usd(E.floor), 'warn', 'Расчёт ниже минимума услуги — цена поднята до него');
    row('Рекомендуемая цена', usd(E.rec), 'tot');
    // откуда срок: дни работы × сложность (× без API) + согласования (× срочность)
    row('Срок', daysTxt(E.dFrom, E.dTo), 'sub',
      `${hd(E.hours).replace('≈', '≈ ')} работы × сложность ${fx(C.mult)}${E.noApi ? ' × без API ' + fx(E.kApi) : ''} + ${Math.round(P.days.approvals * 100)}% на согласования и правки`
      + (E.U.days !== 1 ? `, срочность сжимает срок ${fx(E.U.days)}` : '') + `; в день 5–6 рабочих часов`);

    const T = E.sup;
    return `<h2 class="nc-h" tabindex="-1">Смета · ${esc(E.p.name)}</h2>
      <p class="nc-sub">Ответы можно поменять — нажмите на любой шаг сверху</p>
      <div class="nc-hero">
        <div class="nc-lab">Рекомендуемая</div>
        <div class="nc-big" data-count="${E.rec}">${usd(E.rec)}</div>
        <div class="nc-facts">
          <div class="nc-fact"><div class="nc-lab">Вилка</div><b>${E.lo === E.hi ? usd(E.lo) : usd(E.lo) + ' — ' + usd(E.hi)}</b></div>
          <div class="nc-fact"><div class="nc-lab">Срок</div><b>${daysTxt(E.dFrom, E.dTo)}</b></div>
          <div class="nc-fact"><div class="nc-lab">Проект</div><b>${C.label}</b></div>
        </div>
      </div>
      <div class="nc-sec">Из чего складывается</div>
      <div class="nc-rows">${rows.join('')}</div>
      ${T ? `<div class="nc-sup"><span>Поддержка · ${esc(T.name)}</span><span class="v">${usd(T.price)} в месяц</span>
        <small>${esc(T.desc)}. Сверх пакета — ${usd(P.support.overHour)}/ч</small></div>` : ''}
      <p class="nc-fine">Ориентир. Точная цена — после разбора задачи.</p>`;
  }

  /* ---------------- тексты для клиента (Telegram) ---------------- */
  function quoteText(E){
    const L = [];
    L.push(`Смета — ${E.p.name}`, '');
    L.push('Что входит:');
    L.push(`• ${E.base.copy || E.base.label}`);
    E.incl.forEach(t => L.push(`• ${t}`));
    if(E.urgK !== 'normal') L.push(`• Срочность: ${E.U.label.toLowerCase()} (${E.U.sub})`);
    L.push('');
    L.push(`Стоимость: ${usd(E.rec)}` + (E.lo !== E.hi ? ` (вилка ${usd(E.lo)} – ${usd(E.hi)})` : ''));
    if(E.ext) L.push(`В том числе внешние расходы (хостинг, API, лицензии): ${usd(E.ext)}`);
    L.push(`Срок: ${E.dFrom}–${E.dTo} рабочих ${plural(E.dTo, 'день', 'дня', 'дней')}`);
    if(E.sup) L.push(`Поддержка после запуска: «${E.sup.name}» — ${usd(E.sup.price)} в месяц (${E.sup.desc}; сверх пакета ${usd(P.support.overHour)}/ч)`);
    L.push('', 'Ориентир. Точная цена — после разбора задачи.', 'Nexus AI · nexusnova.app');
    return plain(L.join('\n'));
  }
  function askText(pk){
    const off = askOff(pk);
    const list = askList(pk).filter((_, i) => !off.includes(i));
    return ['Здравствуйте! Чтобы точно посчитать стоимость и срок, ответьте, пожалуйста, на несколько вопросов:', '']
      .concat(list.map((t, i) => `${i + 1}. ${t}`), ['', 'Nexus AI · nexusnova.app']).join('\n');
  }

  /* ---------------- анимации ---------------- */
  // высота окна плавно подстраивается под новый контент (FLIP по высоте)
  function morph(mutate){
    const h0 = card.getBoundingClientRect().height;
    if(hAnim){ hAnim.cancel(); hAnim = null; }
    mutate();
    const h1 = card.getBoundingClientRect().height;
    if(REDUCE.matches || !card.animate || Math.abs(h1 - h0) < 2 || !isOpen) return;
    card.classList.add('nc-morph');
    const a = hAnim = card.animate([{height:h0 + 'px'}, {height:h1 + 'px'}], {duration:260, easing:EASE});
    const end = () => { if(hAnim === a) hAnim = null; card.classList.remove('nc-morph'); updScroll(); };
    a.onfinish = end; a.oncancel = end;
  }

  function fadeIn(el, dy){
    if(!el.animate) return;
    const kf = REDUCE.matches ? [{opacity:0}, {opacity:1}] : [{opacity:0, transform:`translateY(${dy}px)`}, {opacity:1, transform:'none'}];
    el.animate(kf, {duration:220, easing:EASE, fill:'backwards'});
  }

  // смена шага: старый контент уходит, новый приходит со сдвигом 10px (кроссфейд), высота — morph
  function swap(dir, animate){
    const html = paneHTML(S.step);
    clearTimeout(swapT);
    view.querySelectorAll('.nc-pane.out').forEach(n => n.remove());
    const old = view.querySelector('.nc-pane');
    const pane = document.createElement('div');
    pane.className = 'nc-pane'; pane.innerHTML = html;
    if(!animate || !old){
      if(old) old.remove();
      view.appendChild(pane); view.scrollTop = 0;
      afterRender(pane, false);
      return pane;
    }
    const st = view.scrollTop;
    morph(() => {
      old.classList.add('out'); old.style.top = -st + 'px'; old.setAttribute('aria-hidden', 'true'); old.inert = true;
      view.appendChild(pane); view.scrollTop = 0;
    });
    const r = REDUCE.matches, dx = 10 * dir;
    if(old.animate){
      old.animate(r ? [{opacity:1}, {opacity:0}] : [{opacity:1, transform:'none'}, {opacity:0, transform:`translateX(${-dx}px)`}],
        {duration:150, easing:EASE, fill:'forwards'});
      pane.animate(r ? [{opacity:0}, {opacity:1}] : [{opacity:0, transform:`translateX(${dx}px)`}, {opacity:1, transform:'none'}],
        {duration:240, delay:50, easing:EASE, fill:'backwards'});
    }
    // старую панель убираем по таймеру: в фоновой вкладке onfinish может не прийти
    swapT = setTimeout(() => { old.remove(); updScroll(); }, 220);
    afterRender(pane, true);
    return pane;
  }

  // счётчик: плавный count-up числа (ease-out), в фоне и при «меньше движения» — сразу итог
  function tween(el, from, to, dur, fmt){
    cancelAnimationFrame(el._raf); clearTimeout(el._tt);
    if(REDUCE.matches || document.hidden || from === to){ el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(t < 1 ? Math.round((from + (to - from) * e) / 10) * 10 : to);
      if(t < 1) el._raf = requestAnimationFrame(tick);
    };
    el._raf = requestAnimationFrame(tick);
    el._tt = setTimeout(() => { cancelAnimationFrame(el._raf); el.textContent = fmt(to); }, dur + 150);
  }

  /* ---------------- обновление UI ---------------- */
  function afterRender(pane, animated){
    if(S.step === ST.fin){
      const big = pane.querySelector('.nc-big');
      const to = +big.dataset.count;
      tween(big, animated ? Math.round(to * 0.6) : to, to, 700, usd);
    }
    updateChrome();
    updScroll();
  }

  function updateChrome(){
    const s = S.step;
    top.querySelectorAll('.nc-ps').forEach((b, i) => {
      b.classList.toggle('cur', i === s); b.classList.toggle('done', i < s);
      b.disabled = i > 0 && !S.product;
      if(i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    bBack.hidden = s === ST.prod;
    const fin = s === ST.fin;
    foot.classList.toggle('fin', fin);
    bNext.hidden = fin; bCopy.hidden = !fin; bReset.hidden = !fin;
    bNext.disabled = s === ST.prod && !S.product;
    const lab = s === ST.ask ? ['Клиент ответил → заполнить', 'Заполнить →'] : s === ST.cond ? ['Посчитать', 'Посчитать'] : ['Далее', 'Далее'];
    bNext.querySelector('.w').textContent = lab[0];
    bNext.querySelector('.nw').textContent = lab[1];
    bNext.querySelector('svg').style.display = s === ST.ask ? 'none' : '';
    estEl.hidden = fin;
    updateEst();
    measureChrome();
  }

  // живая оценка внизу окна
  function updateEst(){
    if(S.step === ST.fin) return;
    if(!S.product){ estEl.innerHTML = '<span class="e">Выберите продукт</span>'; shownEst = 0; return; }
    const E = estimate(S.product);
    let v = estEl.querySelector('.v');
    if(!v){ estEl.innerHTML = '<span class="v"></span><span class="s"></span>'; v = estEl.querySelector('.v'); }
    estEl.querySelector('.s').textContent = `${daysTxt(E.dFrom, E.dTo)} · ${P.complexity[E.lvl].label} проект`;
    tween(v, shownEst || E.rec, E.rec, 320, n => '≈ ' + usd(n));
    shownEst = E.rec;
  }

  function go(step){
    step = Math.max(0, Math.min(ST.fin, step));
    if(step > 0 && !S.product) return;
    if(step === S.step) return;
    const dir = step > S.step ? 1 : -1;
    S.step = step;
    const pane = swap(dir, true);
    const h = pane.querySelector('.nc-h');
    if(h) h.focus({preventScroll:true});
  }

  function pickProduct(k){
    S.product = k; initAns(k);
    view.querySelectorAll('.nc-prod').forEach(b => b.setAttribute('aria-pressed', b.dataset.prod === k ? 'true' : 'false'));
    updateChrome();
    // короткая пауза: видно, что карточка выбрана, потом — следующий шаг
    clearTimeout(advT);
    advT = setTimeout(() => { if(isOpen && S.step === ST.prod) go(ST.ask); }, REDUCE.matches ? 60 : 200);
  }

  function toggleAsk(btn){
    const pk = S.product, off = askOff(pk), i = +btn.dataset.ask, at = off.indexOf(i);
    if(at >= 0) off.splice(at, 1); else off.push(i);
    const pane = btn.closest('.nc-pane');
    let n = 0;
    pane.querySelectorAll('.nc-ask').forEach(b => {
      const on = !off.includes(+b.dataset.ask);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.querySelector('.n').textContent = on ? ++n + '.' : '';
    });
    pane.querySelector('.nc-ask-cnt').textContent = askCount(pk);
    pane.querySelector('[data-act="copyq"]').disabled = !n;
  }

  function getQ(scope, id){
    return scope === 'c' ? commonQs(S.product).find(q => q.id === id) : P.products[S.product].qs.find(q => q.id === id);
  }
  function store(scope){ return scope === 'c' ? S.common : S.ans[S.product]; }

  function setOpt(btn){
    const scope = btn.dataset.scope, q = getQ(scope, btn.dataset.q), st = store(scope), k = btn.dataset.k;
    if(!q) return;
    if(q.type === 'many'){
      const arr = st[q.id], i = arr.indexOf(k);
      if(i >= 0) arr.splice(i, 1); else arr.push(k);
      btn.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
    } else {
      st[q.id] = k;
      btn.parentNode.querySelectorAll('.nc-opt').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    }
    if(scope === 'p') syncVisibility();
    updateEst();
  }

  function setNum(box, val, fromTyping){
    const scope = box.dataset.scope, q = getQ(scope, box.dataset.q), st = store(scope);
    if(!q) return;
    let v = Math.round(+val);
    if(!isFinite(v)) v = q.min;
    v = Math.max(q.min, Math.min(q.max, v));
    st[q.id] = v;
    const inp = box.querySelector('input');
    if(!fromTyping) inp.value = v;
    box.querySelector('[data-d="-1"]').disabled = v <= q.min;
    box.querySelector('[data-d="1"]').disabled = v >= q.max;
    const m = box.parentNode.querySelector('.m'); if(m) m.textContent = numMeta(q, v);
    if(scope === 'p') syncVisibility();
    updateEst();
  }

  // вопросы, зависящие от других ответов, появляются/скрываются плавно
  function syncVisibility(){
    const pane = view.querySelector('.nc-pane:not(.out)');
    if(!pane || S.step !== ST.task) return;
    const p = P.products[S.product], a = S.ans[S.product], shown = [], changes = [];
    p.qs.forEach(q => {
      const el = pane.querySelector(`.nc-q[data-qid="${q.id}"]`);
      if(!el) return;
      const vis = isVisible(q, a);
      if(vis === el.hidden) changes.push([el, vis]);
    });
    if(!changes.length) return;
    morph(() => {
      changes.forEach(([el, vis]) => { el.hidden = !vis; if(vis) shown.push(el); });
      let first = true;
      pane.querySelectorAll('.nc-q').forEach(el => { if(el.hidden) return; el.classList.toggle('first', first); first = false; });
    });
    shown.forEach(el => fadeIn(el, 6));
    updScroll();
  }

  /* ---------------- события ---------------- */
  function onClick(e){
    const t = e.target;
    if(t.closest('[data-nc-close]')){ close(); return; }
    const prod = t.closest('.nc-prod'); if(prod){ pickProduct(prod.dataset.prod); return; }
    const ask = t.closest('.nc-ask'); if(ask){ toggleAsk(ask); return; }
    const opt = t.closest('.nc-opt'); if(opt){ setOpt(opt); return; }
    const d = t.closest('.nc-num button'); if(d){
      const box = d.closest('.nc-num'), q = getQ(box.dataset.scope, box.dataset.q);
      setNum(box, store(box.dataset.scope)[q.id] + (+d.dataset.d) * (q.step || 1));
      return;
    }
    const ps = t.closest('.nc-ps'); if(ps){ go(+ps.dataset.step); return; }
    const act = t.closest('[data-act]'); if(!act) return;
    const a = act.dataset.act;
    if(a === 'next') go(S.step + 1);
    else if(a === 'back') go(S.step - 1);
    else if(a === 'reset') reset();
    else if(a === 'copy') copyText(bCopy, quoteText(estimate(S.product)));
    else if(a === 'copyq') copyText(act, askText(S.product));
  }
  function onInput(e){
    const inp = e.target.closest('.nc-num input'); if(!inp) return;
    const clean = inp.value.replace(/\D+/g, '').slice(0, 6);
    if(clean !== inp.value) inp.value = clean;
    if(clean !== '') setNum(inp.closest('.nc-num'), clean, true);
  }
  function onChange(e){
    const inp = e.target.closest('.nc-num input'); if(!inp) return;
    setNum(inp.closest('.nc-num'), inp.value === '' ? 0 : inp.value, false);
  }

  function reset(){
    S.product = null; S.ans = {}; S.askOff = {}; S.common = freshCommon();
    shownEst = 0;
    S.step = ST.prod;
    const pane = swap(-1, true);
    const h = pane.querySelector('.nc-h'); if(h) h.focus({preventScroll:true});
  }

  // копирование: Clipboard API, запасной путь — execCommand; кнопка показывает «Скопировано ✓»
  async function copyText(btn, txt){
    let ok = false;
    try { if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(txt); ok = true; } } catch(_){}
    if(!ok){
      const ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      card.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch(_){}
      ta.remove(); btn.focus({preventScroll:true});
    }
    if(!ok) return;
    const a = btn.querySelector('.a'), b = btn.querySelector('.b');
    btn.classList.add('done'); a.setAttribute('aria-hidden', 'true'); b.removeAttribute('aria-hidden');
    clearTimeout(btn._ct);
    btn._ct = setTimeout(() => { btn.classList.remove('done'); a.removeAttribute('aria-hidden'); b.setAttribute('aria-hidden', 'true'); }, 1800);
  }

  // фокус не уходит из окна; Esc закрывает
  function focusables(){
    return [...card.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.closest('.nc-pane.out') && !el.closest('[hidden]') && el.getClientRects().length);
  }
  function onKey(e){
    if(!isOpen) return;
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
    if(e.key === 'Tab'){
      const f = focusables(); if(!f.length) return;
      const i = f.indexOf(document.activeElement);
      if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
      else if(!e.shiftKey && (i === f.length - 1 || i < 0)){ e.preventDefault(); f[0].focus(); }
    }
  }

  // страница под окном не прокручивается; компенсируем ширину полосы прокрутки
  function lock(){
    if(lockSaved) return;
    const b = document.body, sbw = window.innerWidth - document.documentElement.clientWidth;
    lockSaved = {o:b.style.overflow, pr:b.style.paddingRight};
    if(sbw > 0) b.style.paddingRight = (parseFloat(getComputedStyle(b).paddingRight) || 0) + sbw + 'px';
    b.style.overflow = 'hidden';
  }
  function unlock(){
    if(!lockSaved) return;
    const b = document.body;
    b.style.overflow = lockSaved.o; b.style.paddingRight = lockSaved.pr;
    lockSaved = null;
  }

  function open(){
    build();
    if(isOpen) return;
    isOpen = true;
    clearTimeout(closeT);
    lastFocus = document.activeElement;
    lock();
    const wasHidden = root.hidden;
    root.hidden = false;
    measureChrome();
    if(wasHidden) swap(0, false); else updateChrome();
    void root.offsetWidth;
    root.classList.add('is-open');
    document.addEventListener('keydown', onKey, true);
    const target = view.querySelector('.nc-prod[aria-pressed="true"]') || view.querySelector('.nc-h');
    if(target) target.focus({preventScroll:true});
  }

  function close(){
    if(!isOpen) return;
    isOpen = false;
    clearTimeout(advT);
    root.classList.remove('is-open');
    document.removeEventListener('keydown', onKey, true);
    closeT = setTimeout(() => { root.hidden = true; unlock(); }, 200);
    if(lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({preventScroll:true});
  }

  window.NexusCalc = {open, close};
})();
