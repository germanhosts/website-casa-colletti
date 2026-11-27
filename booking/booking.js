/* Casa Colletti booking widget
   Reads booking/preise.json (prices) and booking/availability.json (booked nights from Hospitable)
   and renders calendar, price calculator and enquiry form into <div id="cc-booking" data-lang="en|de"> */
(function () {
  'use strict';

  var T = {
    en: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
      guests: 'Guests', guest1: 'guest', guestN: 'guests', kids: function (a) { return 'of which children under ' + a; },
      pickIn: 'Choose your arrival date', pickOut: 'Now choose your departure date',
      nights: 'nights', night: 'night', cleaning: 'Final cleaning', total: 'Total', pp: 'per person per night',
      minStay: function (n) { return 'Minimum stay is ' + n + ' nights.'; },
      notFree: 'Some nights in this period are already booked. Please choose other dates.',
      taxNote: 'No hidden costs. Your price includes bed linen and towels, shower gel, shampoo and soap, final cleaning, tourist tax, heating, electricity and water, Wi-Fi, a basket of firewood for the fireplace and kitchen basics.', tax: 'Tourist tax', pet: 'With pet', petFee: 'Pet fee', extra: 'Additional guests', discount: function (p) { return 'Long-stay discount ' + p + '%'; },
      noObligation: 'This is a request, not a binding booking. We confirm availability and send payment details within a day.',
      name: 'Name', email: 'Email', phone: 'Phone (optional)', message: 'Message (optional)',
      send: 'Send booking request', sending: 'Sending…', reset: 'Clear dates',
      privacy: 'Your details are only used to answer your request.',
      thanks: 'Thank you! Your request has been sent. We usually reply within a day.',
      error: 'Something went wrong. Please write to us directly:',
      updated: 'Availability updated',
      arrival: 'Arrival', departure: 'Departure', legendBooked: 'booked', legendFree: 'available',
      prev: 'Previous month', next: 'Next month',
      loading: 'Loading availability…', loadError: 'Availability could not be loaded. Please send us your dates by email.',
      subject: 'Booking request Casa Colletti'
    },
    de: {
      months: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
      days: ['Mo','Di','Mi','Do','Fr','Sa','So'],
      guests: 'Gäste', guest1: 'Gast', guestN: 'Gäste', kids: function (a) { return 'davon Kinder unter ' + a; },
      pickIn: 'Wähle deinen Anreisetag', pickOut: 'Jetzt den Abreisetag wählen',
      nights: 'Nächte', night: 'Nacht', cleaning: 'Endreinigung', total: 'Gesamt', pp: 'pro Person und Nacht',
      minStay: function (n) { return 'Der Mindestaufenthalt beträgt ' + n + ' Nächte.'; },
      notFree: 'In diesem Zeitraum sind schon Nächte belegt. Bitte wähle andere Daten.',
      taxNote: 'Keine versteckten Kosten. Im Preis enthalten: Bettwäsche und Handtücher, Duschgel, Shampoo und Seife, Endreinigung, Kurtaxe, Heizung, Strom und Wasser, WLAN, ein Korb Feuerholz für den Kamin und eine Grundausstattung für die Küche.', tax: 'Kurtaxe', pet: 'Mit Haustier', petFee: 'Haustiergebühr', extra: 'Weitere Gäste', discount: function (p) { return 'Rabatt für längeren Aufenthalt ' + p + ' %'; },
      noObligation: 'Das ist eine Anfrage, noch keine verbindliche Buchung. Wir bestätigen die Verfügbarkeit und schicken dir innerhalb eines Tages die Zahlungsdaten.',
      name: 'Name', email: 'E-Mail', phone: 'Telefon (optional)', message: 'Nachricht (optional)',
      send: 'Buchungsanfrage senden', sending: 'Wird gesendet…', reset: 'Daten löschen',
      privacy: 'Deine Angaben nutzen wir nur, um deine Anfrage zu beantworten.',
      thanks: 'Danke! Deine Anfrage ist bei uns angekommen. Wir melden uns meist innerhalb eines Tages.',
      error: 'Da ist etwas schiefgegangen. Schreib uns bitte direkt:',
      updated: 'Verfügbarkeit aktualisiert',
      arrival: 'Anreise', departure: 'Abreise', legendBooked: 'belegt', legendFree: 'frei',
      prev: 'Vorheriger Monat', next: 'Nächster Monat',
      loading: 'Verfügbarkeit wird geladen…', loadError: 'Die Verfügbarkeit konnte nicht geladen werden. Schick uns deine Daten gern per E-Mail.',
      subject: 'Buchungsanfrage Casa Colletti'
    }
  };

  var EMAIL = 'colletti.casoli@gmail.com';

  /* ---------- date helpers (all dates as 'YYYY-MM-DD' strings, local, no time zones) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function nightsBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  /* ---------- pricing (pure, exported for tests) ---------- */
  function inSeason(dateStr, s) {
    var md = dateStr.slice(5);
    return s.von <= s.bis ? (md >= s.von && md <= s.bis) : (md >= s.von || md <= s.bis);
  }
  function priceForNight(dateStr, guests, cfg) {
    var seasons = cfg.saisons || [];
    for (var i = 0; i < seasons.length; i++) {
      var s = seasons[i];
      if (!inSeason(dateStr, s)) continue;
      if (s.preis_nach_personen) {
        var keys = Object.keys(s.preis_nach_personen).map(Number).sort(function (a, b) { return a - b; });
        var k = keys[keys.length - 1];
        for (var j = 0; j < keys.length; j++) { if (guests <= keys[j]) { k = keys[j]; break; } }
        return s.preis_nach_personen[String(k)];
      }
      if (s.preis_pro_nacht != null) return s.preis_pro_nacht;
    }
    return cfg.standardpreis_pro_nacht;
  }
  function quote(checkIn, checkOut, guests, cfg, kids, pet) {
    var n = nightsBetween(checkIn, checkOut), lines = {}, sum = 0;
    for (var i = 0; i < n; i++) {
      var p = priceForNight(addDays(checkIn, i), guests, cfg);
      sum += p; lines[p] = (lines[p] || 0) + 1;
    }
    var extraPersons = Math.max(0, guests - (cfg.inklusive_personen || guests));
    var extra = extraPersons * (cfg.extra_person_pro_nacht || 0) * n;
    var discPct = 0;
    (cfg.rabatte || []).forEach(function (r) { if (n >= r.ab_naechten && r.prozent > discPct) discPct = r.prozent; });
    var discount = Math.round((sum + extra) * discPct) / 100;
    var cleaning = cfg.reinigung || 0;
    var petFee = pet ? (cfg.haustier_gebuehr || 0) : 0;
    var taxNights = cfg.kurtaxe_max_naechte ? Math.min(n, cfg.kurtaxe_max_naechte) : n;
    var taxRate = cfg.kurtaxe_pro_person_nacht || 0;
    var taxPersons = Math.max(0, guests - (kids || 0));
    var tax = Math.round(taxRate * taxPersons * taxNights * 100) / 100;
    return {
      nights: n,
      lines: Object.keys(lines).map(Number).sort(function (a, b) { return a - b; })
        .map(function (p) { return { price: p, count: lines[p] }; }),
      accommodation: sum, cleaning: cleaning, extra: extra, petFee: petFee, discount: discount, discPct: discPct, extraPersons: extraPersons, extraRate: cfg.extra_person_pro_nacht || 0, tax: tax, taxRate: taxRate, taxNights: taxNights, taxPersons: taxPersons,
      total: sum + extra - discount + cleaning + petFee + tax
    };
  }
  function minStay(checkIn, cfg) {
    var md = checkIn.slice(5), min = cfg.mindestaufenthalt || 1;
    (cfg.mindestaufenthalt_zeitraeume || []).forEach(function (z) { if (inSeason(checkIn, z)) min = z.naechte; });
    return min;
  }
  function rangeFree(checkIn, checkOut, booked) {
    for (var d = checkIn; d < checkOut; d = addDays(d, 1)) if (booked[d]) return false;
    return true;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { priceForNight: priceForNight, quote: quote, minStay: minStay, rangeFree: rangeFree, addDays: addDays };
    return;
  }

  /* ---------- widget ---------- */
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function init(root) {
    var lang = root.getAttribute('data-lang') === 'de' ? 'de' : 'en';
    var t = T[lang];
    var base = root.getAttribute('data-base') || 'booking/';
    var fmt = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    var fmt2 = new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    var fmtDate = function (s) { return parse(s).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

    var state = { cfg: null, booked: {}, checkIn: null, checkOut: null, guests: 2, kids: 0, pet: false, view: null, today: iso(new Date()) };
    root.innerHTML = '<p class="ccb-msg">' + t.loading + '</p>';

    var bust = '?v=' + Date.now();
    Promise.all([
      fetch(base + 'preise.json' + bust).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      fetch(base + 'availability.json' + bust).then(function (r) { return r.ok ? r.json() : { booked: [] }; }).catch(function () { return { booked: [] }; })
    ]).then(function (res) {
      state.cfg = res[0];
      (res[1].booked || []).forEach(function (d) { state.booked[d] = true; });
      (state.cfg.gesperrt || []).forEach(function (g) { // own blocked periods, 'bis' = last blocked night
        if (g.von && g.bis) for (var d = g.von; d <= g.bis; d = addDays(d, 1)) state.booked[d] = true;
      });
      state.updated = res[1].updated;
      var now = new Date(); state.view = new Date(now.getFullYear(), now.getMonth(), 1);
      build();
    }).catch(function () {
      root.innerHTML = '<p class="ccb-msg">' + t.loadError + ' <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></p>';
    });

    var cal, summary, form, guestSel, hint;

    function build() {
      root.innerHTML = '';
      var wrap = el('div', { 'class': 'ccb' });

      var top = el('div', { 'class': 'ccb-top' });
      var gl = el('label', { 'class': 'ccb-guests' }, '<span>' + t.guests + '</span>');
      guestSel = el('select', { 'aria-label': t.guests });
      for (var g = 1; g <= (state.cfg.max_gaeste || 8); g++) {
        var o = el('option', { value: g }, g + ' ' + (g === 1 ? t.guest1 : t.guestN));
        if (g === state.guests) o.selected = true;
        guestSel.appendChild(o);
      }
      gl.appendChild(guestSel);
      top.appendChild(gl);
      var kidAge = state.cfg.kurtaxe_frei_unter_alter;
      var kidSel = null;
      if (kidAge) {
        var kl = el('label', { 'class': 'ccb-guests' }, '<span>' + t.kids(kidAge) + '</span>');
        kidSel = el('select', { 'aria-label': t.kids(kidAge) });
        kl.appendChild(kidSel);
        top.appendChild(kl);
      }
      function fillKids() {
        if (!kidSel) return;
        if (state.kids > state.guests) state.kids = state.guests;
        kidSel.innerHTML = '';
        for (var k = 0; k <= state.guests; k++) { var ko = el('option', { value: k }, String(k)); if (k === state.kids) ko.selected = true; kidSel.appendChild(ko); }
      }
      fillKids();
      if (kidSel) kidSel.addEventListener('change', function () { state.kids = +kidSel.value; renderSummary(); });
      guestSel.addEventListener('change', function () { state.guests = +guestSel.value; fillKids(); renderSummary(); });
      if (state.cfg.haustier_gebuehr) {
        var pl = el('label', { 'class': 'ccb-guests ccb-pet' }, '<input type="checkbox"><span>' + t.pet + '</span>');
        pl.querySelector('input').addEventListener('change', function (e) { state.pet = e.target.checked; renderSummary(); });
        top.appendChild(pl);
      }
      hint = el('p', { 'class': 'ccb-hint', 'aria-live': 'polite' });
      top.appendChild(hint);
      wrap.appendChild(top);

      cal = el('div', { 'class': 'ccb-cal' });
      wrap.appendChild(cal);

      var legend = el('div', { 'class': 'ccb-legend' },
        '<span><i class="ccb-dot free"></i>' + t.legendFree + '</span><span><i class="ccb-dot booked"></i>' + t.legendBooked + '</span>' +
        (state.updated ? '<span class="ccb-upd">' + t.updated + ': ' + esc(fmtDate(state.updated.slice(0, 10))) + '</span>' : ''));
      wrap.appendChild(legend);

      summary = el('div', { 'class': 'ccb-summary', 'aria-live': 'polite' });
      wrap.appendChild(summary);

      form = el('form', { 'class': 'ccb-form', novalidate: '' });
      form.innerHTML =
        '<div class="ccb-row"><label>' + t.name + '<input name="name" required autocomplete="name"></label>' +
        '<label>' + t.email + '<input name="email" type="email" required autocomplete="email"></label></div>' +
        '<label>' + t.phone + '<input name="phone" type="tel" autocomplete="tel"></label>' +
        '<label>' + t.message + '<textarea name="message" rows="3"></textarea></label>' +
        '<input type="checkbox" name="botcheck" class="ccb-hp" tabindex="-1" autocomplete="off">' +
        '<p class="ccb-small">' + t.noObligation + '</p>' +
        '<button type="submit" class="btn primary">' + t.send + '</button>' +
        '<p class="ccb-small">' + t.privacy + '</p>';
      form.addEventListener('submit', submit);
      wrap.appendChild(form);

      root.appendChild(wrap);
      renderCal(); renderSummary();
    }

    function monthGrid(year, month) {
      var box = el('div', { 'class': 'ccb-month' });
      box.appendChild(el('div', { 'class': 'ccb-mtitle' }, t.months[month] + ' ' + year));
      var grid = el('div', { 'class': 'ccb-grid' });
      t.days.forEach(function (d) { grid.appendChild(el('span', { 'class': 'ccb-dow' }, d)); });
      var first = new Date(year, month, 1), offset = (first.getDay() + 6) % 7;
      for (var i = 0; i < offset; i++) grid.appendChild(el('span', { 'class': 'ccb-empty' }));
      var days = new Date(year, month + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var ds = year + '-' + pad(month + 1) + '-' + pad(d);
        var b = el('button', { type: 'button', 'data-d': ds }, String(d));
        var cls = ['ccb-day'];
        var past = ds < state.today;
        var booked = !!state.booked[ds];
        // a booked night can still be a departure day if the previous night is free
        var canCheckout = state.checkIn && !state.checkOut && ds > state.checkIn;
        if (past) cls.push('past');
        else if (booked) cls.push('booked');
        if (state.checkIn === ds) cls.push('start');
        if (state.checkOut === ds) cls.push('end');
        if (state.checkIn && state.checkOut && ds > state.checkIn && ds < state.checkOut) cls.push('inrange');
        b.className = cls.join(' ');
        if (past || (booked && !canCheckout)) b.disabled = true;
        b.addEventListener('click', onDay);
        grid.appendChild(b);
      }
      box.appendChild(grid);
      return box;
    }

    function renderCal() {
      cal.innerHTML = '';
      var nav = el('div', { 'class': 'ccb-nav' });
      var now = new Date(); var minView = new Date(now.getFullYear(), now.getMonth(), 1);
      var prev = el('button', { type: 'button', 'class': 'ccb-arrow', 'aria-label': t.prev }, '&#8249;');
      var next = el('button', { type: 'button', 'class': 'ccb-arrow', 'aria-label': t.next }, '&#8250;');
      prev.disabled = state.view <= minView;
      prev.addEventListener('click', function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCal(); });
      next.addEventListener('click', function () { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCal(); });
      nav.appendChild(prev); nav.appendChild(next);
      cal.appendChild(nav);
      var months = el('div', { 'class': 'ccb-months' });
      var v = state.view;
      months.appendChild(monthGrid(v.getFullYear(), v.getMonth()));
      var v2 = new Date(v.getFullYear(), v.getMonth() + 1, 1);
      months.appendChild(monthGrid(v2.getFullYear(), v2.getMonth()));
      cal.appendChild(months);
    }

    function onDay(e) {
      var ds = e.currentTarget.getAttribute('data-d');
      hint.textContent = '';
      if (!state.checkIn || state.checkOut || ds <= state.checkIn) {
        if (state.booked[ds]) return;
        state.checkIn = ds; state.checkOut = null;
      } else {
        if (!rangeFree(state.checkIn, ds, state.booked)) { hint.textContent = t.notFree; state.checkIn = state.booked[ds] ? null : ds; state.checkOut = null; }
        else if (nightsBetween(state.checkIn, ds) < minStay(state.checkIn, state.cfg)) { hint.textContent = t.minStay(minStay(state.checkIn, state.cfg)); }
        else state.checkOut = ds;
      }
      renderCal(); renderSummary();
    }

    function renderSummary() {
      if (!state.checkIn) { summary.innerHTML = '<p class="ccb-prompt">' + t.pickIn + '</p>'; form.style.display = 'none'; return; }
      if (!state.checkOut) {
        summary.innerHTML = '<p class="ccb-prompt">' + t.arrival + ': <strong>' + fmtDate(state.checkIn) + '</strong><br>' + t.pickOut + '</p>';
        form.style.display = 'none'; return;
      }
      var q = quote(state.checkIn, state.checkOut, state.guests, state.cfg, state.kids, state.pet);
      var rows = q.lines.map(function (l) {
        return '<tr><td>' + l.count + ' ' + (l.count === 1 ? t.night : t.nights) + ' × ' + fmt.format(l.price) + '</td><td>' + fmt.format(l.price * l.count) + '</td></tr>';
      }).join('');
      summary.innerHTML =
        '<p class="ccb-dates"><span>' + t.arrival + '<strong>' + fmtDate(state.checkIn) + '</strong></span>' +
        '<span>' + t.departure + '<strong>' + fmtDate(state.checkOut) + '</strong></span>' +
        '<span>' + t.guests + '<strong>' + state.guests + (state.kids ? ' (' + t.kids(state.cfg.kurtaxe_frei_unter_alter) + ': ' + state.kids + ')' : '') + '</strong></span></p>' +
        '<table class="ccb-table">' + rows +
        (q.extra ? '<tr><td>' + t.extra + ' (' + q.extraPersons + ' × ' + fmt.format(q.extraRate) + ' × ' + q.nights + ')</td><td>' + fmt.format(q.extra) + '</td></tr>' : '') +
        (q.discount ? '<tr class="ccb-disc"><td>' + t.discount(q.discPct) + '</td><td>&minus;' + fmt2.format(q.discount) + '</td></tr>' : '') +
        (q.petFee ? '<tr><td>' + t.petFee + '</td><td>' + fmt.format(q.petFee) + '</td></tr>' : '') +
        (q.cleaning ? '<tr><td>' + t.cleaning + '</td><td>' + fmt.format(q.cleaning) + '</td></tr>' : '') +
        (q.tax ? '<tr><td>' + t.tax + ' (' + fmt2.format(q.taxRate) + ' × ' + q.taxPersons + ' × ' + q.taxNights + ')</td><td>' + fmt2.format(q.tax) + '</td></tr>' : '') +
        '<tr class="ccb-total"><td>' + t.total + '</td><td>' + (q.total % 1 ? fmt2 : fmt).format(q.total) + '</td></tr>' +
        '<tr class="ccb-pp"><td colspan="2" style="border-bottom:0;padding-top:2px;text-align:right;font-size:.85rem;color:var(--soft,#6b6358)">≈ ' + fmt.format(Math.round(q.total / state.guests / q.nights)) + ' ' + t.pp + '</td></tr></table>' +
        '<p class="ccb-small">' + t.taxNote + '</p>' +
        '<button type="button" class="ccb-reset">' + t.reset + '</button>';
      summary.querySelector('.ccb-reset').addEventListener('click', function () { state.checkIn = state.checkOut = null; hint.textContent = ''; renderCal(); renderSummary(); });
      form.style.display = '';
    }

    function submit(e) {
      e.preventDefault();
      var f = form.elements;
      if (!f.name.value.trim() || !f.email.checkValidity() || !f.email.value) { form.reportValidity && form.reportValidity(); return; }
      if (f.botcheck.checked) return;
      var q = quote(state.checkIn, state.checkOut, state.guests, state.cfg, state.kids, state.pet);
      var text =
        t.arrival + ': ' + state.checkIn + '\n' + t.departure + ': ' + state.checkOut + '\n' +
        t.nights + ': ' + q.nights + '\n' + t.guests + ': ' + state.guests + (state.kids ? ' (' + t.kids(state.cfg.kurtaxe_frei_unter_alter) + ': ' + state.kids + ')' : '') + '\n' +
        q.lines.map(function (l) { return l.count + ' x ' + l.price + ' EUR'; }).join('\n') + '\n' +
        (q.extra ? t.extra + ': ' + q.extra + ' EUR\n' : '') + (q.discount ? t.discount(q.discPct) + ': -' + q.discount.toFixed(2) + ' EUR\n' : '') + (q.petFee ? t.petFee + ': ' + q.petFee + ' EUR\n' : '') + t.cleaning + ': ' + q.cleaning + ' EUR\n' + (q.tax ? t.tax + ': ' + q.tax.toFixed(2) + ' EUR (' + q.taxRate + ' x ' + q.taxPersons + ' x ' + q.taxNights + ')\n' : '') + t.total + ': ' + q.total + ' EUR\n\n' +
        t.name + ': ' + f.name.value + '\n' + t.email + ': ' + f.email.value + '\n' +
        (f.phone.value ? 'Tel: ' + f.phone.value + '\n' : '') +
        (f.message.value ? '\n' + f.message.value + '\n' : '') + '\n(' + lang.toUpperCase() + ', casa-colletti.com)';
      var gurl = state.cfg.formular_url;
      var key = state.cfg.web3forms_schluessel;
      var subject = t.subject + ' ' + state.checkIn + ' / ' + q.nights + ' ' + t.nights;

      if (!gurl && !key) { // fallback: open the guest's mail program
        window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
        return;
      }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = t.sending;
      var req = gurl
        ? fetch(gurl, { // Google Apps Script; text/plain avoids a CORS preflight
            method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ subject: subject, name: f.name.value, email: f.email.value, message: text, botcheck: false })
          })
        : fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: key, subject: subject, from_name: 'Casa Colletti Website',
              name: f.name.value, email: f.email.value, replyto: f.email.value, message: text
            })
          });
      req.then(function (r) { return r.json(); }).then(function (j) {
        if (!j.success) throw 0;
        form.innerHTML = '<p class="ccb-thanks">' + t.thanks + '</p>';
      }).catch(function () {
        btn.disabled = false; btn.textContent = t.send;
        var p = el('p', { 'class': 'ccb-small ccb-err' }, t.error + ' <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>');
        form.appendChild(p);
      });
    }
  }

  function start() { var r = document.getElementById('cc-booking'); if (r) init(r); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
