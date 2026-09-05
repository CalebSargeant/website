/* site.js: shared page behaviour for calebsargeant.com
 *
 * One file, one IIFE, no build step. Loaded with `defer` from base.html on
 * every page, so every module here is optional: each one looks for its own
 * markup and returns quietly when it is not on the page. If this file never
 * loads, or throws, the site is still readable and navigable, which is the
 * whole point of the `.js` class in base.html gating `.reveal`.
 *
 * Class names, ids and data-attributes below are the ones in
 * docs/design-system.md. They are the interface to site.css and templates/;
 * renaming one here breaks the other two.
 */
(function () {
  'use strict';

  /* ── tiny helpers ──────────────────────────────────────────────────── */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return (root || document).querySelectorAll(sel); }

  // NodeList/HTMLCollection are not arrays in the browsers we still care about.
  function each(list, fn) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) fn(list[i], i);
  }

  function closest(el, sel) {
    if (!el) return null;
    if (el.closest) return el.closest(sel);
    while (el && el.nodeType === 1) {
      if (el.matches ? el.matches(sel) : el.msMatchesSelector(sel)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  function on(target, type, fn, passive) {
    target.addEventListener(type, fn, passive ? { passive: true } : false);
  }

  function swallow(promise) {
    if (promise && promise['catch']) promise['catch'](function () { /* expected */ });
  }

  // A module that throws must not take the rest of the page down with it.
  function safe(name, fn) {
    try { fn(); } catch (err) {
      if (window.console && console.warn) console.warn('site.js: ' + name + ' failed', err);
    }
  }

  /* ── environment, read once and reused ─────────────────────────────── */

  var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
  function media(q) { return mq ? mq(q).matches : false; }

  var REDUCE = media('(prefers-reduced-motion: reduce)');
  var FINE_POINTER = media('(hover: hover) and (pointer: fine)');
  var HAS_IO = 'IntersectionObserver' in window;
  var root = document.documentElement;

  /* ── one scroll loop for the whole page ────────────────────────────── */
  /* Every scroll-driven module registers here instead of adding its own
   * listener, so there is exactly one rAF per frame and every element
   * reference is resolved once at startup rather than per event. */

  var scrollFns = [];
  var scrollQueued = false;

  function onScroll(fn) { scrollFns.push(fn); }

  function scrollTick() {
    scrollQueued = false;
    var y = window.pageYOffset || root.scrollTop || 0;
    for (var i = 0; i < scrollFns.length; i++) scrollFns[i](y);
  }

  function requestScrollTick() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(scrollTick);
  }

  /* ── shared "is it on screen yet" observer ─────────────────────────── */
  /* One IntersectionObserver with the callback parked on the element beats
   * one observer per element when the CV page has 60+ animated things. */

  var SHOW_KEY = '__csOnShow';
  var showParked = [];
  var showDelivered = false;
  var showNetArmed = false;
  var showObserver = HAS_IO ? new IntersectionObserver(function (entries, obs) {
    showDelivered = true;
    each(entries, function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      obs.unobserve(el);
      var fn = el[SHOW_KEY];
      el[SHOW_KEY] = null;
      if (fn) fn(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }) : null;

  // The same 1600ms last resort initReveal uses, for the shared observer. It
  // matters more here: initSkills writes an inline width:0% that beats the CSS
  // fallback (.in .skill-fill { width: var(--w) }), so an observer that never
  // reports at all (prerender, a collapsed parent, a throttled webview)
  // would leave every meter permanently empty. Only fires when nothing has
  // been delivered, so normal scroll-triggered filling is untouched.
  function runParked() {
    if (showDelivered || !showObserver) return;
    each(showParked.splice(0, showParked.length), function (el) {
      var fn = el[SHOW_KEY];
      el[SHOW_KEY] = null;
      showObserver.unobserve(el);
      if (fn) fn(el);
    });
  }

  function whenVisible(el, fn) {
    // With motion reduced there is nothing to stagger, so fire immediately and
    // let the element arrive in its finished state.
    if (!el || REDUCE || !showObserver) { if (el) fn(el); return; }
    el[SHOW_KEY] = fn;
    showParked.push(el);
    showObserver.observe(el);
    if (!showNetArmed) { showNetArmed = true; window.setTimeout(runParked, 1600); }
  }

  /* ── announcements for AT (copy confirmations, palette actions) ────── */

  var liveRegion = null;
  function announce(text) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = text;
  }

  // Swap a control's label for a moment, then put back exactly what was there
  // (innerHTML, so an icon inside the button survives the round trip).
  function flashLabel(el, text, ms) {
    var slot = el.querySelector('[data-copy-label]') || el.querySelector('[data-cmdk-label]') || el;
    if (slot.getAttribute('data-restoring') === 'true') return;
    var original = slot.innerHTML;
    slot.setAttribute('data-restoring', 'true');
    slot.textContent = text;
    el.setAttribute('data-copied', 'true');
    window.setTimeout(function () {
      slot.innerHTML = original;
      slot.removeAttribute('data-restoring');
      el.removeAttribute('data-copied');
    }, ms || 1400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)['catch'](function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  // execCommand is deprecated but it is the only path on http:// origins and
  // older Safari, and a CV site gets opened in some strange browsers.
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    document.body.removeChild(ta);
  }

  /* ── 1. nav: solid on scroll, and a mobile menu ────────────────────── */

  var siteNav = null;

  function initNav() {
    siteNav = $('.site-nav');
    if (!siteNav) return;

    onScroll(function (y) {
      var solid = y > 24;
      if (solid !== siteNav.classList.contains('solid')) siteNav.classList.toggle('solid', solid);
    });

    var inner = $('.nav-inner', siteNav);
    var links = $('.nav-links', siteNav);
    if (!inner || !links) return;

    if (!links.id) links.id = 'nav-links';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', links.id);
    toggle.innerHTML = '<span class="nav-toggle-bar"></span>' +
                       '<span class="nav-toggle-bar"></span>' +
                       '<span class="nav-toggle-bar"></span>';
    inner.appendChild(toggle);
    // The nav only gets its collapsed layout once the button exists, so the
    // no-JS render keeps the full link row.
    siteNav.classList.add('nav-enhanced');

    function setMenu(open) {
      siteNav.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    }
    function isOpen() { return siteNav.classList.contains('menu-open'); }

    on(toggle, 'click', function (e) { e.preventDefault(); setMenu(!isOpen()); });
    on(links, 'click', function (e) { if (closest(e.target, 'a')) setMenu(false); });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setMenu(false); toggle.focus(); }
    });
    on(document, 'click', function (e) {
      if (isOpen() && !siteNav.contains(e.target)) setMenu(false);
    });
    on(document, 'touchstart', function (e) {
      if (isOpen() && !siteNav.contains(e.target)) setMenu(false);
    }, true);
    on(window, 'resize', function () {
      if (window.innerWidth > 820 && isOpen()) setMenu(false);
    }, true);
  }

  /* ── 2. scroll rail + back to top ──────────────────────────────────── */

  function initScrollFurniture() {
    var rail = document.createElement('div');
    rail.className = 'scroll-progress';
    rail.setAttribute('aria-hidden', 'true');
    document.body.appendChild(rail);

    var toTop = document.createElement('button');
    toTop.type = 'button';
    toTop.className = 'to-top';
    toTop.setAttribute('aria-label', 'Back to top');
    toTop.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(toTop);

    on(toTop, 'click', function () {
      try {
        window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
      var skip = $('.site-nav a, .brand');
      if (skip) skip.focus();
    });

    // The button would sit on top of the footer's own links, so it stands down
    // as soon as the footer is on screen.
    var footerVisible = false;
    var foot = $('.site-foot');
    if (foot && HAS_IO) {
      new IntersectionObserver(function (entries) {
        footerVisible = entries[0].isIntersecting;
        paint(window.pageYOffset || 0);
      }, { threshold: 0 }).observe(foot);
    }

    var shown = null;
    function paint(y) {
      var max = root.scrollHeight - window.innerHeight;
      rail.style.width = (max > 0 ? clamp(y / max, 0, 1) * 100 : 0).toFixed(2) + '%';

      var want = y > 600 && !footerVisible;
      if (want === shown) return;
      shown = want;
      toTop.classList.toggle('is-visible', want);
      // Belt and braces: the class is the styling hook, the inline pair makes
      // the button behave even if the CSS never learned about `.is-visible`.
      toTop.style.opacity = want ? '1' : '0';
      toTop.style.pointerEvents = want ? 'auto' : 'none';
      // Out of the tab order while it is invisible, or a keyboard user lands on
      // a button they cannot see.
      toTop.tabIndex = want ? 0 : -1;
    }
    onScroll(paint);
  }

  /* ── 3. reveal on scroll ───────────────────────────────────────────── */

  function initReveal() {
    var reveals = $$('.reveal');
    if (!reveals.length) return;

    // --d is the stagger index within a group of siblings. Capped at 8 so a
    // long list does not end with a two-second wait for its last row.
    var parents = [];
    each(reveals, function (el) {
      if (parents.indexOf(el.parentNode) === -1) parents.push(el.parentNode);
    });
    each(parents, function (parent) {
      var i = 0;
      each(parent.children, function (child) {
        if (child.classList.contains('reveal')) {
          child.style.setProperty('--d', String(Math.min(i, 8)));
          i++;
        }
      });
    });

    function show(el) { el.classList.add('in'); }

    if (REDUCE || !HAS_IO) {
      each(reveals, show);
      return;
    }

    var delivered = false;
    var observer = new IntersectionObserver(function (entries, obs) {
      delivered = true;
      each(entries, function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        show(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    var vh = window.innerHeight;
    each(reveals, function (el) {
      // Above the fold on load: no observer round trip, just show it next frame
      // so the transition still runs rather than snapping in.
      if (el.getBoundingClientRect().top < vh * 0.92) {
        window.requestAnimationFrame(function () { show(el); });
      } else {
        observer.observe(el);
      }
    });

    // Last resort at 1600ms: content must never be left permanently invisible.
    // Force-revealing every .reveal on the page would also mean nothing below
    // the fold ever animates, so this only forces what the reader can already
    // see, and falls back to the whole page when the observer has reported
    // nothing at all (a dead or throttled IntersectionObserver).
    window.setTimeout(function () {
      each(reveals, function (el) {
        if (!delivered || el.getBoundingClientRect().top < window.innerHeight) show(el);
      });
    }, 1600);
  }

  /* ── 4. typewriter ─────────────────────────────────────────────────── */

  function initTypewriter() {
    var els = $$('[data-typewriter]');
    if (!els.length) return;

    if (REDUCE) {
      each(els, function (el) { el.textContent = el.getAttribute('data-typewriter'); });
      // No traffic to report, but the port is still up.
      each($$('.term-link'), function (el) { el.classList.add('is-linked'); });
      return;
    }

    // Lines inside one terminal type in sequence; anything outside one types on
    // its own. A terminal where four lines race each other looks like a bug.
    var groups = [];
    var singles = [];
    each(els, function (el) {
      var body = closest(el, '.term-body');
      if (!body) { singles.push(el); return; }
      var group = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].root === body) group = groups[i];
      if (!group) { group = { root: body, items: [] }; groups.push(group); }
      group.items.push(el);
    });

    each(groups, function (group) {
      var term = closest(group.root, '.term');
      var link = term ? term.querySelector('.term-link') : null;
      whenVisible(group.root, function () {
        typeChain(group.items, 0, function () {
          // Traffic done: the port stays up, so the lamp goes steady rather than
          // dark. Inline --lit is cleared so the .is-linked rule can win.
          var led = term ? term.querySelector('.term-led') : null;
          if (led) led.style.removeProperty('--lit');
          if (link) link.classList.add('is-linked');
        });
      });
    });
    each(singles, function (el) {
      whenVisible(el, function () { typeChain([el], 0); });
    });
  }

  function typeChain(items, index, done) {
    if (index >= items.length) { if (done) done(); return; }
    typeInto(items[index], function () { typeChain(items, index + 1, done); });
  }

  // The activity lamp in this line's terminal chrome, if it has one.
  function ledFor(el) {
    var term = closest(el, '.term');
    return term ? term.querySelector('.term-led') : null;
  }

  // One pulse per character. Set lit, then drop it on the next frame and let the
  // CSS transition decay it, so sustained typing holds the lamp near-on with
  // small dips instead of strobing it.
  function pulse(led) {
    if (!led) return;
    led.style.setProperty('--lit', '1');
    window.requestAnimationFrame(function () {
      led.style.setProperty('--lit', '0');
    });
  }

  function typeInto(el, done) {
    var text = el.getAttribute('data-typewriter') || '';
    var led = ledFor(el);
    var i = 0;
    // Cleared here, not at boot: until this line's turn comes the server-rendered
    // text stays on the page, so a group whose observer never fires loses nothing.
    el.textContent = '';
    el.classList.add('is-typing');
    (function step() {
      i++;
      el.textContent = text.slice(0, i);
      pulse(led);
      if (i >= text.length) {
        el.classList.remove('is-typing');
        el.classList.add('typed');
        if (done) window.setTimeout(done, 240);
        return;
      }
      window.setTimeout(step, charDelay(text.charAt(i)));
    })();
  }

  // ~28ms a character, jittered, with a beat after punctuation. Perfectly even
  // typing reads as a marquee, not as someone at a keyboard.
  function charDelay(ch) {
    var base = 22 + Math.random() * 14;
    if (ch === ' ') return base + 18;
    if (ch === '.' || ch === ',' || ch === ':' || ch === '/') return base + 110;
    return base;
  }

  /* ── 5. count-up ───────────────────────────────────────────────────── */

  function initCounters() {
    each($$('[data-count-to]'), function (el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      if (isNaN(target)) return;
      var suffix = el.getAttribute('data-suffix') || '';
      var decimals = (String(el.getAttribute('data-count-to')).split('.')[1] || '').length;

      function write(value) { el.textContent = value.toFixed(decimals) + suffix; }

      if (REDUCE) { write(target); return; }

      // The server-rendered number stays put until the animation actually
      // starts. Zeroing it here would leave a "0" behind on any page whose
      // observer never fires (prerender, a collapsed parent, bfcache).
      whenVisible(el, function () {
        var start = 0;
        window.requestAnimationFrame(function frame(now) {
          if (!start) start = now;
          var t = clamp((now - start) / 1100, 0, 1);
          var eased = 1 - Math.pow(1 - t, 3);
          write(target * eased);
          if (t < 1) window.requestAnimationFrame(frame);
          else write(target);
        });
      });
    });
  }

  /* ── 6. skill meters ───────────────────────────────────────────────── */

  function initSkills() {
    each($$('.skill'), function (skill) {
      var fill = $('.skill-fill', skill);
      if (!fill) return;
      var level = parseFloat(fill.getAttribute('data-level') || skill.getAttribute('data-level'));
      if (isNaN(level)) return;
      var width = clamp(level / 5, 0, 1) * 100 + '%';
      fill.style.width = '0%';
      whenVisible(skill, function () { fill.style.width = width; });
    });
  }

  /* ── 7. timeline spine ─────────────────────────────────────────────── */

  function initSpine() {
    var timeline = $('.timeline');
    var path = document.getElementById('spine-path');
    if (!timeline || !path || !path.getTotalLength) return;

    var length = path.getTotalLength();
    if (!length) return;
    path.style.strokeDasharray = length;

    if (REDUCE) { path.style.strokeDashoffset = '0'; return; }
    path.style.strokeDashoffset = length;

    onScroll(function () {
      var rect = timeline.getBoundingClientRect();
      // Drawn as far as the middle of the viewport: the line arrives just
      // ahead of the card the reader is actually looking at.
      var progress = clamp((window.innerHeight * 0.5 - rect.top) / (rect.height || 1), 0, 1);
      path.style.strokeDashoffset = String(length * (1 - progress));
    });
  }

  /* ── 8. theme ──────────────────────────────────────────────────────── */
  /* base.html sets the initial theme in an inline head script to avoid a
   * flash. This only reads that state and flips it. */

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function paintThemeControls(theme) {
    var next = theme === 'dark' ? 'light' : 'dark';
    var label = 'Switch to ' + next + ' theme';
    each($$('[data-theme-toggle]'), function (btn) {
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      btn.setAttribute('data-theme-state', theme);   // icon swap hook for the CSS
      btn.setAttribute('title', label);
      // Only name the button when it has no visible text of its own: an
      // aria-label that disagrees with a visible label breaks voice control.
      if (!(btn.textContent || '').replace(/\s/g, '')) btn.setAttribute('aria-label', label);
      var slot = btn.querySelector('[data-theme-label]');
      if (slot) slot.textContent = next === 'light' ? 'Light' : 'Dark';
    });
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { window.localStorage.setItem('cs-theme', theme); } catch (e) { /* private mode */ }
    paintThemeControls(theme);
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition && !REDUCE) {
      var vt = document.startViewTransition(function () { applyTheme(next); });
      // A skipped transition (a second click, a page that is not being
      // rendered) rejects these. The theme still swapped; nobody needs to see
      // an unhandled rejection about it.
      swallow(vt && vt.ready);
      swallow(vt && vt.finished);
    } else {
      applyTheme(next);
    }
  }

  function initTheme() {
    paintThemeControls(currentTheme());
    each($$('[data-theme-toggle]'), function (btn) {
      on(btn, 'click', function (e) { e.preventDefault(); toggleTheme(); });
    });
  }

  /* ── 9. command palette ────────────────────────────────────────────── */

  function initCmdk() {
    var cmdk = $('.cmdk');
    if (!cmdk) return;

    var panel = $('.cmdk-panel', cmdk) || cmdk;
    var input = $('.cmdk-input', cmdk);
    var empty = $('.cmdk-empty', cmdk);

    // Items are whatever base.html shipped: links, and action buttons.
    var items = [];
    each($$('.cmdk-item, [data-cmdk-action]', cmdk), function (el) {
      if (items.indexOf(el) === -1) items.push(el);
    });
    if (!items.length) return;

    each(items, function (el, i) {
      if (!el.id) el.id = 'cmdk-item-' + i;
      if (!el.getAttribute('role')) el.setAttribute('role', 'option');
      // Cached now: the label of a copy item changes for a moment when used,
      // and the search index should not change with it.
      el.__csText = ((el.getAttribute('data-cmdk-keywords') || '') + ' ' +
                     (el.textContent || '')).toLowerCase().replace(/\s+/g, ' ');
    });

    var list = $('.cmdk-list', cmdk);
    if (list && !list.getAttribute('role')) list.setAttribute('role', 'listbox');
    if (input) {
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');
      if (list && !input.getAttribute('aria-controls')) {
        if (!list.id) list.id = 'cmdk-list';
        input.setAttribute('aria-controls', list.id);
      }
    }
    if (!cmdk.getAttribute('role')) cmdk.setAttribute('role', 'dialog');
    cmdk.setAttribute('aria-modal', 'true');
    cmdk.setAttribute('hidden', '');   // never open on load, whatever the markup said

    var opener = null;
    var visible = items.slice(0);
    var active = -1;

    function isOpen() { return !cmdk.hasAttribute('hidden'); }

    function setActive(index) {
      each(items, function (el) {
        el.classList.remove('is-active');
        el.setAttribute('aria-selected', 'false');
      });
      if (!visible.length) {
        active = -1;
        if (input) input.removeAttribute('aria-activedescendant');
        return;
      }
      active = (index + visible.length) % visible.length;
      var el = visible[active];
      el.classList.add('is-active');
      el.setAttribute('aria-selected', 'true');
      if (input) input.setAttribute('aria-activedescendant', el.id);
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }

    // Substring first, then subsequence, so "kub" and "k8" both find Kubernetes
    // without anyone maintaining a keyword list.
    function matches(hay, needle) {
      if (!needle) return true;
      if (hay.indexOf(needle) !== -1) return true;
      var i = 0, j = 0;
      while (i < hay.length && j < needle.length) {
        if (hay.charAt(i) === needle.charAt(j)) j++;
        i++;
      }
      return j === needle.length;
    }

    function filter(query) {
      var needle = (query || '').toLowerCase().trim();
      visible = [];
      each(items, function (el) {
        var hit = matches(el.__csText, needle);
        if (hit) visible.push(el);
        if (hit) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
      });
      if (empty) {
        if (visible.length) empty.setAttribute('hidden', '');
        else empty.removeAttribute('hidden');
      }
      setActive(0);
    }

    function open(from) {
      if (isOpen()) return;
      // Whatever had focus is where Escape puts it back. A keyboard shortcut
      // fired at the document is not a focus target, so fall through to it.
      var back = (from && from.nodeType === 1 && from.focus) ? from : document.activeElement;
      opener = (back && back.focus && back !== document.body) ? back : null;
      cmdk.removeAttribute('hidden');
      // Class and attribute both: the attribute is the no-JS contract, the
      // class is what CSS can transition on.
      window.requestAnimationFrame(function () { cmdk.classList.add('is-open'); });
      if (input) { input.value = ''; }
      filter('');
      if (input) { input.focus(); input.select(); }
      root.classList.add('cmdk-open');
    }

    function close(restore) {
      if (!isOpen()) return;
      cmdk.classList.remove('is-open');
      cmdk.setAttribute('hidden', '');
      root.classList.remove('cmdk-open');
      if (restore !== false && opener && opener.focus) opener.focus();
      opener = null;
    }

    function activate(el) {
      var action = el.getAttribute('data-cmdk-action');
      if (action === 'copy-email') {
        var value = el.getAttribute('data-value') || '';
        copyText(value);
        announce('Copied ' + value);
        flashLabel(el, 'Copied', 1400);
        return;                       // stays open: copying is not navigation
      }
      if (action === 'toggle-theme') { close(); toggleTheme(); return; }
      if (action === 'print') {
        close();
        // One frame so the palette is gone before the print snapshot is taken.
        window.requestAnimationFrame(function () { window.print(); });
        return;
      }
      var href = el.getAttribute('href');
      if (href) {
        close(false);
        if (el.getAttribute('target') === '_blank') window.open(href, '_blank', 'noopener');
        else window.location.href = href;
        return;
      }
      close();
    }

    each(items, function (el) {
      on(el, 'click', function (e) {
        e.preventDefault();
        activate(el);
      });
      on(el, 'mousemove', function () {
        var i = visible.indexOf(el);
        if (i !== -1 && i !== active) setActive(i);
      }, true);
    });

    if (input) on(input, 'input', function () { filter(input.value); });

    // Clicking the scrim (the dialog element itself, not the panel) closes.
    on(cmdk, 'mousedown', function (e) { if (e.target === cmdk) close(); });

    // Bound to the document, not the panel: focus can legitimately be outside
    // the panel for a moment (an empty list, an autofill popover) and the
    // palette still has to answer Escape.
    on(document, 'keydown', function (e) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen()) close(); else open(e.target);
        return;
      }
      if (!isOpen()) {
        // "/" is the muscle-memory search key, but only when it is not being
        // typed into something.
        if (e.key === '/' && !isTyping(e.target)) { e.preventDefault(); open(e.target); }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); return; }
      if (e.key === 'Home') { e.preventDefault(); setActive(0); return; }
      if (e.key === 'End') { e.preventDefault(); setActive(visible.length - 1); return; }
      if (e.key === 'Enter' && active > -1 && visible[active]) {
        e.preventDefault();
        activate(visible[active]);
        return;
      }
      if (e.key === 'Tab') trapTab(e, panel);
    });

    each($$('[data-cmdk-open]'), function (btn) {
      on(btn, 'click', function (e) { e.preventDefault(); open(btn); });
    });
  }

  function isTyping(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function trapTab(e, container) {
    var focusable = $$('a[href], button:not([disabled]), input:not([disabled]), ' +
                       'select, textarea, [tabindex]:not([tabindex="-1"])', container);
    var open = [];
    each(focusable, function (el) {
      if (!el.hasAttribute('hidden') && el.offsetParent !== null) open.push(el);
    });
    if (!open.length) return;
    var first = open[0];
    var last = open[open.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ── 10. magnetic buttons ──────────────────────────────────────────── */

  /* Direct feedback on the control under the pointer, which is the opposite of
     the ambient spotlight this file used to carry: it only ever moves the thing
     you are already reaching for, and only within 40px of it. */
  function initMagnetic() {
    if (!FINE_POINTER || REDUCE) return;

    var els = [];
    each($$('[data-magnetic]'), function (el) { els.push({ el: el, rect: null }); });
    if (!els.length) return;

    function measure() {
      for (var i = 0; i < els.length; i++) els[i].rect = els[i].el.getBoundingClientRect();
    }
    measure();
    onScroll(measure);
    on(window, 'resize', measure, true);
    // Fonts landing late move buttons out from under their cached rect.
    if (document.fonts && document.fonts.ready) swallow(document.fonts.ready.then(measure));

    var queued = false, mx = 0, my = 0;
    on(document, 'mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    }, true);

    function apply() {
      queued = false;
      for (var i = 0; i < els.length; i++) {
        var item = els[i], r = item.rect;
        if (!r || !r.width) continue;
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var near = mx > r.left - 40 && mx < r.right + 40 && my > r.top - 40 && my < r.bottom + 40;
        var dx = 0, dy = 0;
        if (near) {
          dx = clamp((mx - cx) / (r.width / 2 + 40), -1, 1) * 6;
          dy = clamp((my - cy) / (r.height / 2 + 40), -1, 1) * 6;
        }
        // `translate` rather than `transform`, so the CSS hover lift on the same
        // element keeps working instead of being overwritten.
        item.el.style.translate = dx.toFixed(2) + 'px ' + dy.toFixed(2) + 'px';
      }
    }
  }

  /* ── 11. filters (skill matrix, CV focus) ──────────────────────────── */

  function initFilters() {
    var buttons = $$('[data-filter]');
    if (!buttons.length) return;

    each(buttons, function (btn) {
      on(btn, 'click', function (e) {
        e.preventDefault();
        var host = closest(btn, '[data-filter-root]');
        if (!host) return;
        // The attribute names the element to flag; empty means the root itself.
        var selector = host.getAttribute('data-filter-root');
        var target = host;
        if (selector) {
          try { target = $(selector) || document.getElementById(selector) || host; }
          catch (err) { target = document.getElementById(selector) || host; }
        }
        var value = btn.getAttribute('data-filter');

        if (value === 'all' || target.getAttribute('data-active-filter') === value) {
          target.removeAttribute('data-active-filter');
          target.removeAttribute('data-cv-focus');
          value = 'all';
        } else {
          target.setAttribute('data-active-filter', value);
          // The CV document filters on its own attribute name; set both so the
          // one toolbar drives either markup.
          if (target.classList.contains('cv-doc')) target.setAttribute('data-cv-focus', value);
        }

        each($$('[data-filter]', host), function (other) {
          other.setAttribute('aria-pressed', other.getAttribute('data-filter') === value ? 'true' : 'false');
        });
      });

      if (!btn.hasAttribute('aria-pressed')) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-filter') === 'all' ? 'true' : 'false');
      }
    });
  }

  /* ── 12/13. year stamp and copy buttons ────────────────────────────── */

  function initYear() {
    var year = String(new Date().getFullYear());
    each($$('[data-year]'), function (el) { el.textContent = year; });
  }

  function initCopy() {
    each($$('[data-copy]'), function (btn) {
      on(btn, 'click', function (e) {
        e.preventDefault();
        var value = btn.getAttribute('data-copy') || '';
        copyText(value);
        flashLabel(btn, 'Copied', 1400);
        announce('Copied ' + value);
      });
    });
  }

  /* ── 14. language: switcher memory, and a suggestion banner ────────── */
  /* Every locale is a complete static copy (English at /, Dutch at /nl/) and
   * the Worker never redirects on Accept-Language, so this is the only place
   * the reader's browser language is looked at at all. It offers; it never
   * moves anyone. The switcher links are real links and work without any of
   * this, and the banner is injected, so with JS off there is nothing to see.
   */

  var LANG_CHOICE = 'cs-lang';
  var LANG_DISMISSED = 'cs-lang-dismissed';

  /* The banner speaks the language it is offering, not the one on the page, so
   * its copy cannot come from t() in the template. The switcher link is asked
   * for it first (data-suggest / data-dismiss-label); this is the fallback so
   * a locale added to build.py still gets a sentence. One line each, and the
   * native name alone if a language turns up that is not listed here. */
  var LANG_COPY = {
    en: { offer: 'This page is also available in English.', close: 'Dismiss' },
    nl: { offer: 'Deze pagina is ook in het Nederlands beschikbaar.', close: 'Sluiten' },
    de: { offer: 'Diese Seite ist auch auf Deutsch verfügbar.', close: 'Schließen' },
    fr: { offer: 'Cette page est aussi disponible en français.', close: 'Fermer' },
    es: { offer: 'Esta página también está disponible en español.', close: 'Cerrar' },
    pt: { offer: 'Esta página também está disponível em português.', close: 'Fechar' },
    it: { offer: 'Questa pagina è disponibile anche in italiano.', close: 'Chiudi' },
    af: { offer: 'Hierdie bladsy is ook in Afrikaans beskikbaar.', close: 'Maak toe' }
  };

  // "nl-BE" and "nl" are the same offer as far as this site is concerned.
  function langPrimary(tag) {
    return String(tag || '').toLowerCase().split('-')[0].replace(/\s/g, '');
  }

  function langWrite(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function langRead(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  /* Read the available locales out of the switcher the template rendered,
   * rather than keeping a list here: adding a locale to LOCALES in build.py
   * must not need a JS change. */
  function langOptions() {
    var out = [];
    each($$('.lang-switch a[href]'), function (a) {
      var tag = a.getAttribute('hreflang') || a.getAttribute('lang') ||
                a.getAttribute('data-lang') || '';
      var code = langPrimary(tag);
      if (!code) return;
      out.push({
        code: code,
        tag: tag,
        href: a.getAttribute('href'),
        native: (a.getAttribute('data-native') || a.textContent || '').trim() || code.toUpperCase(),
        offer: a.getAttribute('data-suggest') || '',
        close: a.getAttribute('data-dismiss-label') || '',
        el: a
      });
    });
    return out;
  }

  function initLangSwitch() {
    var options = langOptions();
    if (!options.length) return;
    var here = langPrimary(root.getAttribute('lang'));

    each(options, function (opt) {
      // The narrow-viewport collapse in the CSS reads data-short. Filling it in
      // here means that rule does not depend on the template remembering it.
      if (!opt.el.getAttribute('data-short')) {
        opt.el.setAttribute('data-short', opt.code.toUpperCase());
      }
      if (opt.code === here && !opt.el.hasAttribute('aria-current')) {
        opt.el.setAttribute('aria-current', 'true');
      }
      // No preventDefault: the link navigates itself, this only remembers that
      // the reader has now chosen, so the banner stops asking.
      on(opt.el, 'click', function () { langWrite(LANG_CHOICE, opt.code); });
    });
  }

  function initLangBanner() {
    var nav = siteNav || $('.site-nav');
    if (!nav || !nav.parentNode) return;

    // No navigator.languages is a crawler, a locked-down webview or something
    // old: nothing that should be shown an offer it cannot have asked for.
    if (!navigator.languages || !navigator.languages.length) return;
    // Dismissed once, or already chose a language: do not ask again.
    if (langRead(LANG_DISMISSED) || langRead(LANG_CHOICE)) return;

    var options = langOptions();
    if (options.length < 2) return;
    var here = langPrimary(root.getAttribute('lang'));

    var byCode = {};
    each(options, function (opt) { if (!byCode[opt.code]) byCode[opt.code] = opt; });

    // First preference this site can actually serve wins. Walking the list in
    // order is what makes "already on the language they wanted most" a no-op
    // rather than an offer of their second choice.
    var want = null;
    for (var i = 0; i < navigator.languages.length; i++) {
      var code = langPrimary(navigator.languages[i]);
      if (byCode[code]) { want = byCode[code]; break; }
    }
    if (!want || want.code === here || !want.href) return;

    var copy = LANG_COPY[want.code] || {};
    var offerText = want.offer || copy.offer || want.native;
    var closeText = want.close || copy.close || 'Close';

    var banner = document.createElement('div');
    banner.className = 'lang-banner';
    banner.setAttribute('role', 'region');
    // The whole bar is in the offered language, so say so: a screen reader
    // reading Dutch with an English voice is worse than no offer at all.
    banner.setAttribute('lang', want.tag || want.code);
    banner.setAttribute('aria-label', want.native);

    var inner = document.createElement('div');
    inner.className = 'lang-banner-inner wrap';

    var text = document.createElement('p');
    text.className = 'lang-banner-text';
    text.textContent = offerText;

    var go = document.createElement('a');
    go.className = 'lang-banner-go';
    go.setAttribute('href', want.href);
    if (want.tag) go.setAttribute('hreflang', want.tag);
    go.textContent = want.native;

    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'lang-banner-x';
    dismiss.setAttribute('aria-label', closeText);
    dismiss.setAttribute('title', closeText);
    dismiss.innerHTML = '<span aria-hidden="true">×</span>';

    inner.appendChild(text);
    inner.appendChild(go);
    inner.appendChild(dismiss);
    banner.appendChild(inner);
    nav.parentNode.insertBefore(banner, nav.nextSibling);

    on(go, 'click', function () { langWrite(LANG_CHOICE, want.code); });

    on(dismiss, 'click', function () {
      langWrite(LANG_DISMISSED, '1');
      banner.classList.remove('is-in');
      // Focus is about to be inside a removed element, so hand it to the
      // permanent way of doing the same thing.
      var back = $('.lang-switch a[aria-current]') || $('.lang-switch a') || $('.brand');
      if (back && back.focus) back.focus();
      function remove() { if (banner.parentNode) banner.parentNode.removeChild(banner); }
      if (REDUCE) remove(); else window.setTimeout(remove, 340);
    });

    // Two frames: the collapsed state has to be painted before the class that
    // opens it lands, or there is no transition to see. It arrives late by
    // definition (this file is deferred); sliding is what keeps that from
    // reading as a layout glitch.
    if (REDUCE) {
      banner.classList.add('is-in');
    } else {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { banner.classList.add('is-in'); });
      });
    }
  }

  /* ── boot ──────────────────────────────────────────────────────────── */

  function boot() {
    safe('nav', initNav);
    safe('scroll furniture', initScrollFurniture);
    safe('reveal', initReveal);
    safe('typewriter', initTypewriter);
    safe('counters', initCounters);
    safe('skills', initSkills);
    safe('spine', initSpine);
    safe('theme', initTheme);
    safe('cmdk', initCmdk);
    safe('magnetic', initMagnetic);
    safe('filters', initFilters);
    safe('year', initYear);
    safe('copy', initCopy);
    safe('language switch', initLangSwitch);
    safe('language banner', initLangBanner);

    on(window, 'scroll', requestScrollTick, true);
    on(window, 'resize', requestScrollTick, true);
    scrollTick();
  }

  // `defer` means the DOM is already parsed, but this file should survive being
  // dropped in a <head> by a future me.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
