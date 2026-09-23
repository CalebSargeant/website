/* webmcp.js: tools an agent in the browser can call on calebsargeant.com.
 *
 * WebMCP (https://webmachinelearning.github.io/webmcp/) lets a page hand an
 * agent running in the browser a few typed tools, so it can answer from the
 * site instead of scraping the DOM. These four only read what the site already
 * publishes for assistants, so they can say nothing the pages do not:
 *
 *   read_page    one page as markdown: its twin at <page>/index.md
 *   search_site  the sections of /llms-full.txt that match, each with its URL
 *   get_contact  email, phone, booking link and profiles, from data-contact
 *   open_page    take this tab to a page on the site
 *
 * Loaded with `defer` from base.html on every page (the print sheets carry no
 * JS at all). Unless the browser has the API it adds nothing: no markup, no
 * styles, no listeners, no requests. With it missing, blocked or JS off the
 * site is exactly what it was. It never defines the API itself.
 *
 * Where the API lives has moved. The spec has document.modelContext; Chrome's
 * early preview, and scanners such as isitagentready.com, use
 * navigator.modelContext; the first drafts took every tool at once through
 * provideContext(). The tools go to each of those the browser has, and one
 * AbortController takes them all back.
 *
 * It reads two things from the page (docs/design-system.md): the
 * `.nav-links a.navlink` links, which are the pages it offers, and its own
 * script tag's data-contact, which base.html renders from data/profile.yml
 * because a script cannot read data/.
 */
(function () {
  'use strict';

  var contexts = [];
  try {
    [document.modelContext, navigator.modelContext].forEach(function (ctx) {
      if (ctx && contexts.indexOf(ctx) < 0 &&
          (typeof ctx.registerTool === 'function' || typeof ctx.provideContext === 'function')) {
        contexts.push(ctx);
      }
    });
  } catch (e) { /* a getter that throws is as good as no API */ }
  if (!contexts.length) return;

  var script = document.currentScript;   // only set while this file first runs
  var ORIGIN = location.origin;
  // The canonical origin, so the URL an agent cites (https://calebsargeant.com/cv/)
  // also works on www or on a preview host.
  var canonical = document.querySelector('link[rel="canonical"]');
  var CANONICAL = canonical ? new URL(canonical.href).origin : ORIGIN;
  var HOSTS = [location.host, new URL(CANONICAL).host, 'www.' + new URL(CANONICAL).host];
  // Per reply. The longest twin, /nl/experience/, is under half of this.
  var MAX_CHARS = 100000;

  /* ── helpers ───────────────────────────────────────────────────────── */

  // Results in the shape MCP clients expect: text for the model, plus the
  // same facts as structured data where there are any.
  function reply(text, data) {
    var out = { content: [{ type: 'text', text: text }] };
    if (data) out.structuredContent = data;
    return out;
  }

  // A failure the agent can act on, rather than a thrown error it cannot read.
  function refuse(text) {
    return { content: [{ type: 'text', text: text }], isError: true };
  }

  function get(path, signal) {
    return fetch(path, { credentials: 'same-origin', signal: signal }).then(function (res) {
      if (!res.ok) throw new Error(path + ' answered ' + res.status);
      return res.text();
    });
  }

  // The pages as this page's nav lists them, so the list follows PAGES and
  // the language being read.
  var PAGES = [];
  var navLinks = document.querySelectorAll('.nav-links a.navlink[href^="/"]');
  for (var i = 0; i < navLinks.length; i++) {
    PAGES.push(navLinks[i].getAttribute('href') + ' (' + navLinks[i].textContent.trim() + ')');
  }
  var PAGE_LIST = PAGES.join(', ');

  // "cv", "/cv", "/nl/cv/index.md" or "https://calebsargeant.com/cv/" -> "/cv/",
  // or null for anything that is not a path on this site.
  function pagePath(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && raw.charAt(0) !== '/') raw = '/' + raw;
    var url;
    try { url = new URL(raw, ORIGIN); } catch (e) { return null; }
    if (HOSTS.indexOf(url.host) < 0 || !/^https?:$/.test(url.protocol)) return null;
    var path = url.pathname.replace(/index\.(?:html|md)$/, '');
    return path.charAt(path.length - 1) === '/' ? path : path + '/';
  }

  /* ── search_site ───────────────────────────────────────────────────── */

  // /llms-full.txt split at its ## and ### headings. Each section carries the
  // URL on the nearest `Page:` line at or above it: templates/md/llms-full.txt
  // writes one under every ## and one for every role, so a role's highlights
  // and duties (#### and below) stay inside the role and cite its anchor.
  function split(text) {
    var out = [], trail = [], top = null, cur = null, fenced = false;
    text.split('\n').forEach(function (line) {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      var heading = fenced ? null : /^(#{2,3}) (.+)$/.exec(line);
      if (heading) {
        var depth = heading[1].length - 2;
        trail = trail.slice(0, depth);
        trail.push(heading[2].trim());
        cur = { title: trail.join(' > '), url: depth && top ? top.url : CANONICAL + '/', lines: [] };
        if (!depth) top = cur;
        out.push(cur);
        return;
      }
      if (!cur) return;
      var page = /^(?:- )?Page: (\S+)\s*$/.exec(line);
      if (page) { cur.url = page[1]; return; }
      cur.lines.push(line);
    });
    return out;
  }

  var sections = null;   // one fetch per page view, and again only after a failure
  function loadSections() {
    if (!sections) {
      sections = get('/llms-full.txt').then(split, function (err) { sections = null; throw err; });
    }
    return sections;
  }

  var STOP = ' a an and are as at be by can do does for from has have he his how in is it me my ' +
             'of on or so the this to was what when where which who why will with you ';

  function terms(query) {
    // Built here rather than as a literal: \p{} in a literal is a syntax error in
    // the older browsers that never get this far anyway.
    var gap = new RegExp('[^\\p{L}\\p{N}+#]+', 'u');
    return String(query || '').toLowerCase().split(gap).filter(function (t, n, all) {
      return t.length > 1 && STOP.indexOf(' ' + t + ' ') < 0 && all.indexOf(t) === n;
    });
  }

  function count(hay, needle) { return hay.split(needle).length - 1; }

  function excerpt(lines, words) {
    var best = '', most = 0;
    lines.forEach(function (line) {
      var low = line.toLowerCase(), n = 0;
      words.forEach(function (w) { if (low.indexOf(w) >= 0) n += 1; });
      if (n > most || (!best && line.trim())) { if (n > most) most = n; best = line; }
    });
    best = best.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^[\s#>*-]+/, '').replace(/\s+/g, ' ').trim();
    return best.length > 280 ? best.slice(0, 279).replace(/\s+\S*$/, '') + '\u2026' : best;
  }

  // Sections matching more of the words come first. Within that, a word in the
  // heading outweighs any number in the body, and body repeats are capped, so a
  // long role with a long duty list does not outrank the section named for it.
  function search(all, words, limit) {
    return all.map(function (s) {
      var head = s.title.toLowerCase(), body = s.lines.join('\n').toLowerCase(), hits = 0, score = 0;
      words.forEach(function (w) {
        var n = (head.indexOf(w) >= 0 ? 8 : 0) + Math.min(count(body, w), 4);
        if (n) { hits += 1; score += n; }
      });
      return { s: s, hits: hits, score: score };
    }).filter(function (r) { return r.hits; })
      .sort(function (a, b) { return b.hits - a.hits || b.score - a.score; })
      .slice(0, limit)
      .map(function (r) { return { section: r.s.title, url: r.s.url, excerpt: excerpt(r.s.lines, words) }; });
  }

  /* ── the tools ─────────────────────────────────────────────────────── */

  var TOOLS = [
    {
      name: 'read_page',
      title: 'Read a page',
      description: 'Read one page of this site as markdown: the copy published at the page URL plus ' +
        'index.md, generated from the same data as the page, so it says exactly what the page says. ' +
        'Pages: ' + PAGE_LIST + '. Pass the path or the full URL.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The page, as a path or URL, for example /experience/.' }
        },
        required: ['path']
      },
      annotations: { readOnlyHint: true },
      execute: function (input, options) {
        var path = pagePath(input.path);
        if (!path) return refuse('That is not a page on this site. Pages: ' + PAGE_LIST + '.');
        return get(path + 'index.md', options.signal).then(function (text) {
          if (text.length > MAX_CHARS) {
            text = text.slice(0, MAX_CHARS) + '\n\n[Clipped. The rest is at ' + CANONICAL + path + ']';
          }
          return reply(text, { url: CANONICAL + path, markdown: CANONICAL + path + 'index.md' });
        }, function () {
          return refuse('There is no markdown copy at ' + path + 'index.md. Pages with one: ' + PAGE_LIST + '.');
        });
      }
    },
    {
      name: 'search_site',
      title: 'Search the CV',
      description: 'Search Caleb Sargeant\'s whole CV (/llms-full.txt: profile, every role with its ' +
        'highlights, stack and duties, education, courses, skills and contact) and return the ' +
        'best-matching sections, each with an excerpt and the page URL to cite. English. A few precise ' +
        'words (a technology, an employer, a certification) work better than a sentence.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to look for, in a few words, for example "kubernetes azure".' },
          limit: { type: 'integer', minimum: 1, maximum: 10, description: 'How many sections to return, 1 to 10. Default 5.' }
        },
        required: ['query']
      },
      annotations: { readOnlyHint: true },
      execute: function (input) {
        var words = terms(input.query);
        if (!words.length) return refuse('Give a few words to search for, such as a technology or an employer.');
        var limit = Math.min(10, Math.max(1, Math.floor(Number(input.limit)) || 5));
        return loadSections().then(function (all) {
          var results = search(all, words, limit);
          if (!results.length) {
            return reply('Nothing in /llms-full.txt matches "' + input.query + '". Try other words, or read a page with read_page.',
                         { query: input.query, results: [] });
          }
          var text = results.map(function (r, n) {
            return (n + 1) + '. ' + r.section + ' (' + r.url + ')\n   ' + r.excerpt;
          }).join('\n');
          return reply('Sections of ' + CANONICAL + '/llms-full.txt matching "' + input.query + '":\n\n' + text,
                       { query: input.query, results: results });
        });
      }
    },
    {
      name: 'open_page',
      title: 'Open a page',
      description: 'Take this browser tab to a page on this site, for when the reader wants to see it ' +
        'rather than have it summarised. The tab leaves the current page. Pages: ' + PAGE_LIST + '.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The page, as a path or URL, for example /contact/.' }
        },
        required: ['path']
      },
      execute: function (input) {
        var path = pagePath(input.path);
        if (!path) return refuse('That is not a page on this site. Pages: ' + PAGE_LIST + '.');
        return fetch(path, { method: 'HEAD', credentials: 'same-origin' }).then(function (res) {
          if (!res.ok) return refuse('There is no page at ' + path + '. Pages: ' + PAGE_LIST + '.');
          // On the next task, so this reply is on its way before the page unloads.
          setTimeout(function () { location.assign(path); }, 0);
          return reply('Opening ' + ORIGIN + path + ' in this tab.', { url: CANONICAL + path });
        });
      }
    }
  ];

  var contact = null;
  try { contact = JSON.parse(script && script.getAttribute('data-contact')); } catch (e) { /* no tool, then */ }
  if (contact && contact.email) {
    TOOLS.splice(2, 0, {
      name: 'get_contact',
      title: 'Contact details',
      description: 'How to reach Caleb Sargeant: email, phone, a link to book a call, LinkedIn, GitHub ' +
        'and Credly, where he is based, whether he is open to conversations, and the contact page.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () {
        var labels = [['email', 'Email'], ['phone', 'Phone'], ['booking', 'Book a call'],
                      ['availability', 'Availability'], ['location', 'Based in'], ['linkedin', 'LinkedIn'],
                      ['github', 'GitHub'], ['credly', 'Credly'], ['contact_page', 'Contact page']];
        var text = [contact.name + ', ' + contact.headline].concat(labels.filter(function (l) {
          return contact[l[0]];
        }).map(function (l) { return l[1] + ': ' + contact[l[0]]; })).join('\n');
        return reply(text, contact);
      }
    });
  }

  // Every execute gets an input object and an options object whatever the
  // caller passed, and an exception comes back as a readable failure.
  TOOLS.forEach(function (tool) {
    var run = tool.execute;
    tool.execute = function (input, options) {
      return Promise.resolve().then(function () {
        return run(input || {}, options || {});
      })['catch'](function (err) {
        return refuse('That did not work: ' + ((err && err.message) || err) + '.');
      });
    };
  });

  /* ── registration ──────────────────────────────────────────────────── */

  var controller = null;

  function register() {
    controller = new AbortController();
    var signal = controller.signal;
    contexts.forEach(function (ctx) {
      if (typeof ctx.registerTool !== 'function') {
        // The early shape: the whole list at once, taken back with clearContext().
        try {
          ctx.provideContext({ tools: TOOLS });
          signal.addEventListener('abort', function () {
            try { if (typeof ctx.clearContext === 'function') ctx.clearContext(); } catch (e) { /* gone */ }
          });
        } catch (e) { /* refused: the page is unchanged either way */ }
        return;
      }
      TOOLS.forEach(function (tool) {
        try {
          var handle = ctx.registerTool(tool, { signal: signal });
          // The spec returns a promise, rejected for a duplicate name or a
          // frame that may not register tools; neither is worth a console error.
          if (handle && typeof handle.then === 'function') handle.then(null, function () {});
          signal.addEventListener('abort', function () {
            // The signal is the spec's way back. Earlier shapes returned a
            // handle, or unregistered by name.
            try {
              if (handle && typeof handle.unregister === 'function') handle.unregister();
              else if (typeof ctx.unregisterTool === 'function') ctx.unregisterTool(tool.name);
            } catch (e) { /* already gone */ }
          });
        } catch (e) { /* an implementation that throws rather than rejects */ }
      });
    });
  }

  register();

  // Put away with the page, and offered again if it comes back from the
  // back/forward cache, so an agent never calls into a page nobody can see.
  window.addEventListener('pagehide', function () { if (controller) controller.abort(); });
  window.addEventListener('pageshow', function (event) { if (event.persisted) register(); });
})();
