/* Casa Colletti booking widget
   Reads booking/preise.json (prices) and booking/availability.json (booked nights from Hospitable)
   and renders calendar, price calculator and enquiry form into <div id="cc-booking" data-lang="en|de"> */
(function () {
  'use strict';

  var T = {
    en: {
      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
      guests: 'Guests', guest1: 'guest', guestN: 'guests',
      pickIn: 'Choose your arrival date', pickOut: 'Now choose your departure date',
      nights: 'nights', night: 'night', cleaning: 'Final cleaning', total: 'Total',
      minStay: function (n) { return 'Minimum stay is ' + n + ' nights.'; },
      notFree: 'Some nights in this period are already booked. Please choose other dates.',
      taxNote: 'Tourist tax of the Comune di Camaiore is paid separately on site.',
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
      guests: 'Gäste', guest1: 'Gast', guestN: 'Gäste',
      pickIn: 'Wählt euren Anreisetag', pickOut: 'Jetzt den Abreisetag wählen',
      nights: 'Nächte', night: 'Nacht', cleaning: 'Endreinigung', total: 'Gesamt',
      minStay: function (n) { return 'Der Mindestaufenthalt beträgt ' + n + ' Nächte.'; },
      notFree: 'In diesem Zeitraum sind schon Nächte belegt. Bitte wählt andere Daten.',
      taxNote: 'Die Kurtaxe der Gemeinde Camaiore wird separat vor Ort bezahlt.',
      noObligation: 'Das ist eine Anfrage, noch keine verbindliche Buchung. Wir bestätigen die Verfügbarkeit und schicken euch innerhalb eines Tages die Zahlungsdaten.',
      name: 'Name', email: 'E-Mail', phone: 'Telefon (optional)', message: 'Nachricht (optional)',
      send: 'Buchungsanfrage senden', sending: 'Wird gesendet…', reset: 'Daten löschen',
      privacy: 'Eure Angaben nutzen wir nur, um eure Anfrage zu beantworten.',
      thanks: 'Danke! Eure Anfrage ist bei uns angekommen. Wir melden uns meist innerhalb eines Tages.',
      error: 'Da ist etwas schiefgegangen. Schreibt uns bitte direkt:',
      updated: 'Verfügbarkeit aktualisiert',
      arrival: 'Anreise', departure: 'Abreise', legendBooked: 'belegt', legendFree: 'frei',
      prev: 'Vorheriger Monat', next: 'Nächster Monat',
      loading: 'Verfügbarkeit wird geladen…', loadError: 'Die Verfügbarkeit konnte nicht geladen werden. Schickt uns eure Daten gern per E-Mail.',
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
  function quote(checkIn, checkOut, guests, cfg) {
    var n = nightsBetween(checkIn, checkOut), lines = {}, sum = 0;
    for (var i = 0; i < n; i++) {
      var p = priceForNight(addDays(checkIn, i), guests, cfg);
      sum += p; lines[p] = (lines[p] || 0) + 1;
    }
    var cleaning = cfg.reinigung || 0;
    return {
      nights: n,
      lines: Object.keys(lines).map(Number).sort(function (a, b) { return a - b; })
        .map(function (p) { return { price: p, count: lines[p] }; }),
      accommodation: sum, cleaning: cleaning, total: sum + cleaning
    };
  }
  function rangeFree(checkIn, checkOut, booked) {
    for (var d = checkIn; d < checkOut; d = addDays(d, 1)) if (booked[d]) return false;
    return true;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { priceForNight: priceForNight, quote: quote, rangeFree: rangeFree, addDays: addDays };
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
    var fmtDate = function (s) { return parse(s).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

    var state = { cfg: null, booked: {}, checkIn: null, checkOut: null, guests: 2, view: null, today: iso(new Date()) };
    root.innerHTML = '<p class="ccb-msg">' + t.loading + '</p>';

    var bust = '?v=' + Date.now();
    Promise.all([
      fetch(base + 'preise.json' + bust).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      fetch(base + 'availability.json' + bust).then(function (r) { return r.ok ? r.json() : { booked: [] }; }).catch(function () { return { booked: [] }; })
    ]).then(function (res) {
      state.cfg = res[0];
      (res[1].booked || []).forEach(function (d) { state.booked[d] = true; });
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
      guestSel.addEventListener('change', function () { state.guests = +guestSel.value; renderSummary(); });
      gl.appendChild(guestSel);
      top.appendChild(gl);
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
      var min = state.cfg.mindestaufenthalt || 1;
      hint.textContent = '';
      if (!state.checkIn || state.checkOut || ds <= state.checkIn) {
        if (state.booked[ds]) return;
        state.checkIn = ds; state.checkOut = null;
      } else {
        if (!rangeFree(state.checkIn, ds, state.booked)) { hint.textContent = t.notFree; state.checkIn = state.booked[ds] ? null : ds; state.checkOut = null; }
        else if (nightsBetween(state.checkIn, ds) < min) { hint.textContent = t.minStay(min); }
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
      var q = quote(state.checkIn, state.checkOut, state.guests, state.cfg);
      var rows = q.lines.map(function (l) {
        return '<tr><td>' + l.count + ' ' + (l.count === 1 ? t.night : t.nights) + ' × ' + fmt.format(l.price) + '</td><td>' + fmt.format(l.price * l.count) + '</td></tr>';
      }).join('');
      summary.innerHTML =
        '<p class="ccb-dates"><span>' + t.arrival + '<strong>' + fmtDate(state.checkIn) + '</strong></span>' +
        '<span>' + t.departure + '<strong>' + fmtDate(state.checkOut) + '</strong></span>' +
        '<span>' + t.guests + '<strong>' + state.guests + '</strong></span></p>' +
        '<table class="ccb-table">' + rows +
        (q.cleaning ? '<tr><td>' + t.cleaning + '</td><td>' + fmt.format(q.cleaning) + '</td></tr>' : '') +
        '<tr class="ccb-total"><td>' + t.total + '</td><td>' + fmt.format(q.total) + '</td></tr></table>' +
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
      var q = quote(state.checkIn, state.checkOut, state.guests, state.cfg);
      var text =
        t.arrival + ': ' + state.checkIn + '\n' + t.departure + ': ' + state.checkOut + '\n' +
        t.nights + ': ' + q.nights + '\n' + t.guests + ': ' + state.guests + '\n' +
        q.lines.map(function (l) { return l.count + ' x ' + l.price + ' EUR'; }).join('\n') + '\n' +
        t.cleaning + ': ' + q.cleaning + ' EUR\n' + t.total + ': ' + q.total + ' EUR\n\n' +
        t.name + ': ' + f.name.value + '\n' + t.email + ': ' + f.email.value + '\n' +
        (f.phone.value ? 'Tel: ' + f.phone.value + '\n' : '') +
        (f.message.value ? '\n' + f.message.value + '\n' : '') + '\n(' + lang.toUpperCase() + ', casa-colletti.com)';
      var key = state.cfg.web3forms_schluessel;
      var subject = t.subject + ' ' + state.checkIn + ' / ' + q.nights + ' ' + t.nights;

      if (!key) { // fallback: open the guest's mail program
        window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
        return;
      }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = t.sending;
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: key, subject: subject, from_name: 'Casa Colletti Website',
          name: f.name.value, email: f.email.value, replyto: f.email.value, message: text
        })
      }).then(function (r) { return r.json(); }).then(function (j) {
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
