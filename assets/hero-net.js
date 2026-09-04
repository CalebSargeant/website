/* hero-net.js: the network living behind the hero copy.
 *
 * A small graph of drifting nodes with packets hopping between them. Quiet on
 * purpose, low alpha and slow motion, nothing that pulls the eye off the
 * headline. Contract (docs/design-system.md section 4): canvas #hero-net sized
 * to its parent with DPR scaling, nodes in --sig, packets in --sig-2, edges
 * near 10% alpha, at most 34 nodes, stops on visibilitychange, and under
 * prefers-reduced-motion paints one static frame and never starts the loop.
 *
 * Nothing here tracks the pointer. See .claude/decisions/ - the graph drifts on
 * its own timing and is not a thing you can push around.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  // Tuning. Distances in CSS pixels, speeds per second unless the name says ms.
  var NODE_MIN = 28, NODE_MAX = 34, AREA_PER_NODE = 22000;
  var HUB_SHARE = 0.14, EDGES_PER_NODE = 1.8, DEG_MAX = 4, DEG_MAX_HUB = 6;
  var LEASH = 26, SPEED_MIN = 2, SPEED_MAX = 5;
  var PACKET_MIN_MS = 700, PACKET_MAX_MS = 1400, DEATH_CHANCE = 0.08;
  var PULSE_MS = 600, PULSE_R = 16, EDGE_ALPHA = 0.10;
  var TRAIL_TAU_MS = 130;   // packet trail decay, see settled()
  var DT_CAP_MS = 50;       // a backgrounded tab must not teleport anything

  try {
    var canvas = document.getElementById('hero-net');
    if (!canvas || !canvas.getContext) return;
    var parent = canvas.parentElement;
    if (!parent) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var root = document.documentElement;
    var W = 0, H = 0;
    var nodes = [], edgeA = [], edgeB = [], adj = [], packets = [];
    var built = false, running = false, raf = 0, last = 0;
    var visible = !document.hidden, onScreen = true;
    var col = { sig: 'rgb(56,225,255)', sig2: 'rgb(76,111,255)' };
    var motionQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = !!(motionQ && motionQ.matches);

    // Tokens are authored as hex in site.css. Anything else (a future rgb()
    // form, or CSS not applied yet) falls back rather than drawing nothing.
    function readRGB(name, fallback) {
      var raw = '';
      try { raw = getComputedStyle(root).getPropertyValue(name).trim(); } catch (e) { /* ignore */ }
      if (raw.charAt(0) !== '#') return fallback;
      var hex = raw.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = hex.length === 6 ? parseInt(hex, 16) : NaN;
      if (isNaN(n)) return fallback;
      return 'rgb(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ')';
    }

    // Resolved once per theme, never per frame: alpha variation in the loop goes
    // through ctx.globalAlpha so no string is ever built while animating.
    function readTheme() {
      col.sig = readRGB('--sig', 'rgb(56,225,255)');
      col.sig2 = readRGB('--sig-2', 'rgb(76,111,255)');
    }

    function fit() {
      var w = parent.clientWidth || parent.offsetWidth;
      var h = parent.clientHeight || parent.offsetHeight;
      if (w < 2 || h < 2) return false;                    // hero not laid out yet
      var dpr = Math.min(window.devicePixelRatio || 1, 2); // 3x phones gain nothing here
      var ow = W, oh = H;
      W = w; H = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Rescale rather than regenerate: on mobile the URL bar collapsing fires a
      // resize, and rebuilding the graph there would visibly reshuffle it.
      if (built && ow > 0 && oh > 0) {
        for (var i = 0, sx = W / ow, sy = H / oh; i < nodes.length; i++) {
          var n = nodes[i];
          n.x *= sx; n.hx *= sx; n.y *= sy; n.hy *= sy;
        }
      }
      return true;
    }

    // Mitchell's best-candidate sampling: poisson-ish spacing without a grid.
    // Clumping is the one thing that makes this read as noise, not a network.
    function scatter(count) {
      var pad = 26, pts = [];
      for (var i = 0; i < count; i++) {
        var bx = 0, by = 0, best = -1, tries = i === 0 ? 1 : 12;
        for (var t = 0; t < tries; t++) {
          var cx = pad + Math.random() * (W - pad * 2), cy = pad + Math.random() * (H - pad * 2);
          var near = Infinity;
          for (var j = 0; j < pts.length; j += 2) {
            var dx = cx - pts[j], dy = cy - pts[j + 1], d = dx * dx + dy * dy;
            if (d < near) near = d;
          }
          if (near > best) { best = near; bx = cx; by = cy; }
        }
        pts.push(bx, by);
      }
      return pts;
    }

    function canLink(a, b) {
      var na = nodes[a], nb = nodes[b];
      if (na.deg >= (na.hub ? DEG_MAX_HUB : DEG_MAX)) return false;
      if (nb.deg >= (nb.hub ? DEG_MAX_HUB : DEG_MAX)) return false;
      for (var i = 0, list = adj[a]; i < list.length; i++) if (list[i] === b) return false;
      return true;
    }

    function link(a, b) {
      edgeA.push(a); edgeB.push(b);
      adj[a].push(b); adj[b].push(a);
      nodes[a].deg++; nodes[b].deg++;
    }

    function build() {
      var count = Math.min(NODE_MAX, Math.max(NODE_MIN, Math.round((W * H) / AREA_PER_NODE)));
      var pts = scatter(count), i, k;

      nodes.length = 0;
      for (i = 0; i < count; i++) {
        var ang = Math.random() * TAU, sp = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
        nodes.push({
          x: pts[i * 2], y: pts[i * 2 + 1],
          hx: pts[i * 2], hy: pts[i * 2 + 1],   // home slot, the leash anchor
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          r: 1.7, hub: false, deg: 0, pulse: 0
        });
      }

      // Hubs are picked at random, not by degree, so the bright nodes spread
      // across the canvas instead of gathering in the densest corner.
      for (var h = 0, hubs = Math.max(3, Math.round(count * HUB_SHARE)); h < hubs; h++) {
        var idx = (Math.random() * count) | 0;
        for (var g = 0; g < count && nodes[idx].hub; g++) idx = (idx + 1) % count;
        nodes[idx].hub = true; nodes[idx].r = 3;
      }

      edgeA.length = 0; edgeB.length = 0; adj.length = 0;
      for (i = 0; i < count; i++) adj.push([]);

      // Every candidate pair, shortest first. count <= 34 means ~560 pairs once
      // at init, so a spatial index would be more code for no gain.
      var pairs = [];
      for (i = 0; i < count; i++) {
        for (k = i + 1; k < count; k++) {
          var ddx = nodes[i].x - nodes[k].x, ddy = nodes[i].y - nodes[k].y;
          pairs.push({ a: i, b: k, d: Math.sqrt(ddx * ddx + ddy * ddy) });
        }
      }
      pairs.sort(function (p, q) { return p.d - q.d; });

      // Pass 1 gives every node its nearest link, so nothing is orphaned and a
      // packet can always leave wherever it spawns. Pass 2 fills up to the
      // sparsity target with the shortest edges still allowed.
      var threshold = Math.sqrt((W * H) / count) * 1.7;
      var target = Math.round(count * EDGES_PER_NODE);
      for (i = 0; i < pairs.length; i++) {
        if (nodes[pairs[i].a].deg === 0 || nodes[pairs[i].b].deg === 0) link(pairs[i].a, pairs[i].b);
      }
      for (i = 0; i < pairs.length && edgeA.length < target; i++) {
        if (pairs[i].d > threshold) break;
        if (canLink(pairs[i].a, pairs[i].b)) link(pairs[i].a, pairs[i].b);
      }

      // Fixed packet pool, reused forever: nothing allocates once running.
      packets.length = 0;
      for (i = 0, k = Math.min(16, Math.max(10, Math.round(count * 0.45))); i < k; i++) {
        var pk = { from: 0, to: 0, t: 0, rate: 0 };
        respawn(pk);
        pk.t = Math.random();   // stagger, so they do not march in step
        packets.push(pk);
      }
      built = true;
    }

    function hopMs() { return PACKET_MIN_MS + Math.random() * (PACKET_MAX_MS - PACKET_MIN_MS); }

    function respawn(pk) {
      var from = (Math.random() * nodes.length) | 0;
      // Walk forward to the next connected node, so a leaf can never leave a
      // packet stalled and re-rolling the same dead index every frame.
      for (var i = 0; i < nodes.length && !adj[from].length; i++) from = (from + 1) % nodes.length;
      if (!adj[from].length) { pk.rate = 0; return; }
      pk.from = from;
      pk.to = adj[from][(Math.random() * adj[from].length) | 0];
      pk.t = 0;
      pk.rate = 1 / hopMs();
    }

    function hop(pk) {
      var here = pk.to, list = adj[here];
      if (!list.length) { respawn(pk); return; }
      var next = list[(Math.random() * list.length) | 0];
      // Prefer not to bounce straight back. On a leaf there is no choice, so
      // give up after a few tries rather than loop.
      for (var t = 0; t < 3 && next === pk.from && list.length > 1; t++) {
        next = list[(Math.random() * list.length) | 0];
      }
      pk.from = here; pk.to = next; pk.rate = 1 / hopMs();
    }

    function step(dtMs) {
      var dt = dtMs / 1000, i;
      for (i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx * dt; n.y += n.vy * dt;

        // Bounce off the canvas edge. Rare, because the leash below usually
        // turns a node round first, but it guarantees nothing escapes.
        if (n.x < 4) { n.x = 4; n.vx = -n.vx; } else if (n.x > W - 4) { n.x = W - 4; n.vx = -n.vx; }
        if (n.y < 4) { n.y = 4; n.vy = -n.vy; } else if (n.y > H - 4) { n.y = H - 4; n.vy = -n.vy; }

        // Leash: a soft pull back to the poisson slot once a node strays. Without
        // it the drift compounds and the graph slowly collapses into a clump.
        var dx = n.x - n.hx, dy = n.y - n.hy, d = Math.sqrt(dx * dx + dy * dy);
        if (d > LEASH) {
          var over = (d - LEASH) / LEASH;
          n.vx -= (dx / d) * over * 7 * dt; n.vy -= (dy / d) * over * 7 * dt;
        }

        // Speed ceiling. The leash can only ever add energy, so without this a
        // node that keeps overshooting its slot accelerates indefinitely.
        var sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy), cap = SPEED_MAX * 1.6;
        if (sp > cap) { n.vx *= cap / sp; n.vy *= cap / sp; }

        if (n.pulse > 0) n.pulse -= dtMs;
      }

      for (i = 0; i < packets.length; i++) {
        var pk = packets[i];
        if (!pk.rate) { respawn(pk); continue; }
        pk.t += dtMs * pk.rate;
        while (pk.t >= 1) {
          pk.t -= 1;
          nodes[pk.to].pulse = PULSE_MS;                          // arrival ring
          if (Math.random() < DEATH_CHANCE) { respawn(pk); break; }
          hop(pk);
        }
      }
    }

    // While running the canvas is never hard-cleared: each frame fades it toward
    // transparent, which is what gives packets a trail for free. The cost is that
    // anything redrawn in the same spot composites onto its own residue and
    // creeps toward opaque. So near-static content (edges, nodes) is drawn at the
    // per-frame alpha whose steady state under that fade is the alpha we wanted:
    // solving a = s + a(1-f)(1-s) for s gives the line below. f is derived from
    // dt, so the result is frame-rate independent, and settled(t, 1) === t lets
    // the reduced-motion frame share the same drawing code.
    function settled(target, fade) {
      return (target * fade) / (1 - target * (1 - fade));
    }

    function drawEdges(fade) {
      ctx.strokeStyle = col.sig;
      ctx.lineWidth = 1;
      for (var i = 0; i < edgeA.length; i++) {
        var a = nodes[edgeA[i]], b = nodes[edgeB[i]];
        ctx.globalAlpha = settled(EDGE_ALPHA, fade);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    function drawNodes(fade, animated) {
      ctx.fillStyle = col.sig;
      ctx.strokeStyle = col.sig;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var lit = animated && n.pulse > 0 ? (n.pulse / PULSE_MS) * 0.25 : 0;
        if (n.hub) {                            // soft halo, hubs only
          ctx.globalAlpha = settled(0.09, fade);
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3.2, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = settled(Math.min(1, (n.hub ? 0.8 : 0.48) + lit), fade);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();

        if (!animated || n.pulse <= 0) continue;
        var p = 1 - n.pulse / PULSE_MS, inv = 1 - p;
        var ease = 1 - inv * inv * inv;         // ease-out cubic: quick, then settles
        // The ring expands, so it is not static content and wants its true alpha
        // rather than the settled() compensation the topology gets.
        ctx.globalAlpha = inv * inv * 0.45;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 2 + ease * PULSE_R, 0, TAU); ctx.stroke();
      }
    }

    function drawPackets() {
      ctx.fillStyle = col.sig2;
      for (var i = 0; i < packets.length; i++) {
        var pk = packets[i];
        if (!pk.rate) continue;
        var a = nodes[pk.from], b = nodes[pk.to];
        var x = a.x + (b.x - a.x) * pk.t, y = a.y + (b.y - a.y) * pk.t;
        ctx.globalAlpha = 0.16;                 // bloom
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.92;                 // core
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }

    function paint(fade) {
      // destination-out rather than a solid fill, so the canvas stays transparent
      // over whatever the hero background happens to be.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      drawEdges(fade);
      drawNodes(fade, true);
      drawPackets();
      ctx.globalAlpha = 1;
    }

    // One frame, no packets, no residue: what a reduced-motion visitor sees.
    function paintStatic() {
      ctx.clearRect(0, 0, W, H);
      drawEdges(1);
      drawNodes(1, false);
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!running) return;
      try {
        var dtMs = now - last;
        if (!(dtMs > 0)) dtMs = 16;
        if (dtMs > DT_CAP_MS) dtMs = DT_CAP_MS;
        last = now;
        step(dtMs);
        paint(1 - Math.exp(-dtMs / TRAIL_TAU_MS));
        raf = window.requestAnimationFrame(frame);
      } catch (err) {
        running = false;   // a drawing failure must never take the page with it
      }
    }

    function start() {
      if (running || reduced || !built || !visible || !onScreen) return;
      running = true;
      ctx.clearRect(0, 0, W, H);   // drop stale residue from before the pause
      last = (window.performance && performance.now) ? performance.now() : Date.now();
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    }

    function boot() {
      if (!fit()) return false;
      if (!built) build();
      readTheme();
      if (reduced) paintStatic(); else start();
      return true;
    }

    var resizeTimer = 0;
    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!built) { boot(); return; }   // first layout may have been late
        if (!fit()) return;
        if (reduced) paintStatic();
        else if (running) ctx.clearRect(0, 0, W, H);
      }, 160);
    }
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      if (visible) start(); else stop();
    });

    if (window.IntersectionObserver) {
      new window.IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start(); else stop();
      }, { threshold: 0 }).observe(canvas);
    }

    // Theme arrives two ways because site.js swaps the attribute inside a View
    // Transition, where the event and the mutation do not reliably pair up.
    document.addEventListener('themechange', readTheme);
    if (window.MutationObserver) {
      new window.MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    if (motionQ) {
      var onMotion = function () {
        reduced = motionQ.matches;
        if (reduced) { stop(); if (built) paintStatic(); } else start();
      };
      if (motionQ.addEventListener) motionQ.addEventListener('change', onMotion);
      else if (motionQ.addListener) motionQ.addListener(onMotion);
    }

    // Fonts and layout can land after this script does. If the hero has no size
    // yet, the next frame or the resize handler picks it up.
    if (!boot()) window.requestAnimationFrame(function () { boot(); });
  } catch (err) {
    /* The hero is decorative. Any failure here is silent by design. */
  }
})();
