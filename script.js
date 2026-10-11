(function () {
  'use strict';

  // КОД_НА_ДЪРЖАВАТА:КОД_НА_ВАЛУТАТА. България е два пъти – евро и лев (за справка).
  var RAW =
    'AF:AFN AL:ALL DZ:DZD AO:AOA AI:XCD AG:XCD AR:ARS AM:AMD AU:AUD AT:EUR AZ:AZN BS:BSD ' +
    'BH:BHD BD:BDT BB:BBD BY:BYN BE:EUR BZ:BZD BJ:XOF BM:BMD BT:BTN BO:BOB BA:BAM BW:BWP ' +
    'BR:BRL VG:USD BN:BND BG:EUR BG:BGN BF:XOF KH:KHR CM:XAF CA:CAD CV:CVE KY:KYD TD:XAF ' +
    'CL:CLP CN:CNY CO:COP CG:XAF CD:CDF CR:CRC CI:XOF HR:EUR CY:EUR CZ:CZK DK:DKK DM:XCD ' +
    'DO:DOP EC:USD EG:EGP SV:USD EE:EUR SZ:SZL FJ:FJD FI:EUR FR:EUR GA:XAF GM:GMD GE:GEL ' +
    'DE:EUR GH:GHS GR:EUR GD:XCD GT:GTQ GW:XOF GY:GYD HN:HNL HK:HKD HU:HUF IS:ISK IN:INR ' +
    'ID:IDR IQ:IQD IE:EUR IL:ILS IT:EUR JM:JMD JP:JPY JO:JOD KZ:KZT KE:KES XK:EUR KW:KWD ' +
    'KG:KGS LA:LAK LV:EUR LB:LBP LR:LRD LY:LYD LT:EUR LU:EUR MO:MOP MG:MGA MW:MWK MY:MYR ' +
    'MV:MVR ML:XOF MT:EUR MR:MRU MU:MUR MX:MXN FM:USD MD:MDL MN:MNT ME:EUR MS:XCD MA:MAD ' +
    'MZ:MZN MM:MMK NA:NAD NR:AUD NP:NPR NL:EUR NZ:NZD NI:NIO NE:XOF NG:NGN MK:MKD NO:NOK ' +
    'OM:OMR PK:PKR PW:USD PA:PAB PG:PGK PY:PYG PE:PEN PH:PHP PL:PLN PT:EUR QA:QAR RO:RON ' +
    'RU:RUB RW:RWF ST:STN SA:SAR SN:XOF RS:RSD SC:SCR SL:SLE SG:SGD SK:EUR SI:EUR SB:SBD ' +
    'ZA:ZAR KR:KRW ES:EUR LK:LKR KN:XCD LC:XCD VC:XCD SR:SRD SE:SEK CH:CHF TW:TWD TJ:TJS ' +
    'TZ:TZS TH:THB TO:TOP TT:TTD TN:TND TR:TRY TM:TMT TC:USD AE:AED UG:UGX UA:UAH GB:GBP ' +
    'US:USD UY:UYU UZ:UZS VU:VUV VE:VES VN:VND YE:YER ZM:ZMW ZW:ZWG';

  // Начални курсове за 1 EUR, докато не дойдат живи. BGN е фиксиран.
  var FALLBACK = { EUR: 1, BGN: 1.95583, USD: 1.17, GBP: 0.87, CHF: 0.94, RON: 5.08, TRY: 48, PLN: 4.25, CZK: 24.3, JPY: 172 };

  var $ = function (id) { return document.getElementById(id); };

  function store(key, val) { try { if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  function names(type, lang) {
    try { return new Intl.DisplayNames([lang], { type: type }); } catch (e) { return null; }
  }
  var dnRegBg = names('region', 'bg'), dnRegEn = names('region', 'en'), dnCur = names('currency', 'bg');
  function nameOf(dn, code) { try { return (dn && dn.of(code)) || code; } catch (e) { return code; } }

  function fold(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

  var countries = RAW.split(/\s+/).filter(Boolean).map(function (tok) {
    var p = tok.split(':'), region = p[0], currency = p[1];
    var name = nameOf(dnRegBg, region), curName = nameOf(dnCur, currency);
    return {
      id: region + currency, region: region, currency: currency, name: name, curName: curName,
      key: fold([name, nameOf(dnRegEn, region), currency, curName].join(' '))
    };
  }).sort(function (a, b) { return a.name.localeCompare(b.name, 'bg'); });

  var byId = {};
  countries.forEach(function (c) { byId[c.id] = c; });
  var currencyCodes = Array.from(new Set(countries.map(function (c) { return c.currency; }))).sort();

  // ---- състояние ----
  var rates = Object.assign({}, FALLBACK);
  try {
    var saved = JSON.parse(load('valuten-rates') || '{}');
    Object.keys(saved).forEach(function (k) { if (saved[k] > 0) rates[k] = saved[k]; });
  } catch (e) {}
  var updatedAt = Number(load('valuten-updated')) || null;
  var fromId = byId[load('valuten-from')] ? load('valuten-from') : 'BGEUR';
  var toId = byId[load('valuten-to')] ? load('valuten-to') : 'USUSD';

  function saveRates() { store('valuten-rates', JSON.stringify(rates)); }

  // ---- показване ----
  function flagImg(c) {
    var img = document.createElement('img');
    img.className = 'flag';
    img.alt = '';
    img.width = 28; img.height = 21;
    img.loading = 'lazy';
    img.src = 'https://flagcdn.com/w40/' + c.region.toLowerCase() + '.png';
    img.onerror = function () { img.style.visibility = 'hidden'; };
    return img;
  }
  function textBlock(c) {
    var t = document.createElement('span'); t.className = 't';
    var n = document.createElement('span'); n.className = 'n'; n.textContent = c.name;
    var s = document.createElement('span'); s.className = 'c'; s.textContent = c.currency + ' · ' + c.curName;
    t.appendChild(n); t.appendChild(s);
    return t;
  }
  function fillPick(btn, c, label) {
    btn.innerHTML = '';
    btn.appendChild(flagImg(c));
    btn.appendChild(textBlock(c));
    btn.setAttribute('aria-label', label + ': ' + c.name + ', ' + c.currency);
  }
  function money(v, code) {
    try { return new Intl.NumberFormat('bg-BG', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(v); }
    catch (e) { return v.toFixed(2) + ' ' + code; }
  }

  function calc() {
    var a = parseFloat($('amt').value);
    var f = byId[fromId], t = byId[toId];
    fillPick($('fromBtn'), f, 'От');
    fillPick($('toBtn'), t, 'Към');
    $('rate').textContent = '';
    if (isNaN(a) || a < 0) { $('res').textContent = 'Въведи сума'; return; }
    var rf = rates[f.currency], rt = rates[t.currency];
    if (!(rf > 0) || !(rt > 0)) {
      $('res').textContent = 'Курсът не е наличен';
      $('rate').textContent = 'Обнови курсовете или го въведи ръчно от „Курсове“.';
      return;
    }
    var r = rt / rf;
    $('res').textContent = money(a * r, t.currency);
    $('rate').textContent = '1 ' + f.currency + ' = ' + r.toLocaleString('bg-BG', { maximumFractionDigits: 4 }) + ' ' + t.currency;
  }

  function showMeta(msg) {
    var m = msg || (updatedAt
      ? 'Курсове от: ' + new Date(updatedAt).toLocaleString('bg-BG', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Приблизителни начални курсове – чакам връзка с интернет.');
    $('meta').textContent = m;
  }

    // ---- обновяване от API ----
  var MAX_AGE = 60 * 60 * 1000;    // за 24 часа: 24 * 60 * 60 * 1000
  var RETRY_AFTER = 5 * 60 * 1000;
  var lastTry = 0;

  function refresh(force) {
    var now = Date.now();
    if (!force) {
      if (updatedAt && now - updatedAt < MAX_AGE) { showMeta(); return Promise.resolve(); }
      if (now - lastTry < RETRY_AFTER) { showMeta(); return Promise.resolve(); }
    }
    lastTry = now;
    showMeta('Обновявам курсовете…');
    return fetch('https://open.er-api.com/v6/latest/EUR')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (d.result !== 'success' || !d.rates) throw new Error('bad response');
        Object.keys(d.rates).forEach(function (k) { if (d.rates[k] > 0) rates[k] = d.rates[k]; });
        updatedAt = Date.now();
        store('valuten-updated', String(updatedAt));
        saveRates();
        calc(); showMeta(); renderRates();
      })
      .catch(function () {
        showMeta(updatedAt
          ? 'Няма връзка. Ползват се последните запазени курсове.'
          : 'Няма връзка. Ползват се начални курсове.');
      });
  }

  // ---- избор на държава ----
  var side = null;
  function renderPicker() {
    var q = fold($('q').value), list = $('list'), shown = 0;
    list.innerHTML = '';
    var cur = side === 'from' ? fromId : toId;
    countries.forEach(function (c) {
      if (q && c.key.indexOf(q) === -1) return;
      shown++;
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'item';
      if (c.id === cur) b.setAttribute('aria-current', 'true');
      b.appendChild(flagImg(c)); b.appendChild(textBlock(c));
      b.addEventListener('click', function () {
        if (side === 'from') { fromId = c.id; store('valuten-from', c.id); }
        else { toId = c.id; store('valuten-to', c.id); }
        $('picker').close(); calc();
      });
      li.appendChild(b); list.appendChild(li);
    });
    $('empty').hidden = shown > 0;
  }
  function openPicker(s) {
    side = s; $('q').value = ''; renderPicker();
    $('picker').showModal(); $('q').focus();
  }

  // ---- редакция на курсове ----
  function renderRates() {
    if (!$('ratesDlg').open) return;
    var q = fold($('rq').value), list = $('rlist');
    list.innerHTML = '';
    currencyCodes.forEach(function (code) {
      if (q && fold(code + ' ' + nameOf(dnCur, code)).indexOf(q) === -1) return;
      var li = document.createElement('li'); li.className = 'rrow';
      var sp = document.createElement('span'); sp.textContent = code; sp.title = nameOf(dnCur, code);
      var inp = document.createElement('input');
      inp.type = 'number'; inp.step = 'any'; inp.inputMode = 'decimal';
      inp.setAttribute('aria-label', 'Курс ' + code);
      inp.value = rates[code] > 0 ? rates[code] : '';
      if (code === 'EUR') inp.disabled = true;
      inp.addEventListener('input', function () {
        var v = parseFloat(inp.value);
        if (v > 0) { rates[code] = v; saveRates(); calc(); }
      });
      li.appendChild(sp); li.appendChild(inp); list.appendChild(li);
    });
  }

  // ---- събития ----
  $('amt').addEventListener('input', calc);
  $('fromBtn').addEventListener('click', function () { openPicker('from'); });
  $('toBtn').addEventListener('click', function () { openPicker('to'); });
  $('swap').addEventListener('click', function () { var f = fromId; fromId = toId; toId = f; store('valuten-from', fromId); store('valuten-to', toId); calc(); });
  $('q').addEventListener('input', renderPicker);
  $('rq').addEventListener('input', renderRates);
  $('ratesBtn').addEventListener('click', function () { $('rq').value = ''; $('ratesDlg').showModal(); renderRates(); });
  $('refresh').addEventListener('click', function () { refresh(true); });
  $('reset').addEventListener('click', function () {
    rates = Object.assign({}, FALLBACK); updatedAt = null;
    store('valuten-rates', null); store('valuten-updated', null);
    calc(); showMeta(); renderRates();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
    b.addEventListener('click', function () { b.closest('dialog').close(); });
  });
  ['picker', 'ratesDlg'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) $(id).close(); });
  });

  calc(); showMeta(); refresh(false);
})();
