(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     0. Sticky header: a hairline appears once the page scrolls
     ========================================================== */
  (function stickyHeader() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var stuck = false;
    function update() {
      var next = window.scrollY > 4;
      if (next !== stuck) {
        stuck = next;
        bar.classList.toggle('is-stuck', stuck);
      }
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  /* ==========================================================
     1. Looping typed headline
     "WE'RE BUILDING" stays put; the second line types, holds,
     deletes and types the next phrase. Phrases live in the
     data-phrases attribute in index.html so copy can change
     without touching this file.
     ========================================================== */
  (function typing() {
    var el = document.getElementById('typed');
    if (!el || reduceMotion) return;

    var phrases;
    try { phrases = JSON.parse(el.getAttribute('data-phrases')); } catch (e) { return; }
    if (!phrases || phrases.length < 2) return;

    var index = 0;
    var text = phrases[0];

    function hold() { setTimeout(erase, 2400); }

    function erase() {
      if (text.length) {
        text = text.slice(0, -1);
        el.textContent = text;
        setTimeout(erase, 42);
      } else {
        index = (index + 1) % phrases.length;
        setTimeout(type, 380);
      }
    }

    function type() {
      var target = phrases[index];
      if (text.length < target.length) {
        text = target.slice(0, text.length + 1);
        el.textContent = text;
        setTimeout(type, 70 + Math.random() * 45);
      } else {
        hold();
      }
    }

    hold();
  })();

  /* ==========================================================
     2. Countdown to launch
     The target date itself is never rendered, only the time left.
     ========================================================== */
  (function countdown() {
    var el = document.getElementById('countdown');
    if (!el) return;

    var TARGET = new Date('2026-10-26T00:00:00+01:00').getTime();

    var elDays = document.getElementById('cdDays');
    var elHours = document.getElementById('cdHours');
    var elMins = document.getElementById('cdMins');
    var elSecs = document.getElementById('cdSecs');
    var elLabel = el.querySelector('.cd-label-top');
    var elSr = document.getElementById('cdSrText');

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    var lastAnnouncedDays = null;
    var timer = null;

    function tick() {
      var diff = TARGET - Date.now();

      if (diff <= 0) {
        elDays.textContent = elHours.textContent = elMins.textContent = elSecs.textContent = '00';
        elLabel.textContent = 'Launching now';
        if (elSr) elSr.textContent = 'Graphcent is launching now.';
        if (timer) clearInterval(timer);
        return;
      }

      var total = Math.floor(diff / 1000);
      var days = Math.floor(total / 86400);

      elDays.textContent = pad(days);
      elHours.textContent = pad(Math.floor((total % 86400) / 3600));
      elMins.textContent = pad(Math.floor((total % 3600) / 60));
      elSecs.textContent = pad(total % 60);

      // announce only when the day count changes, never every second
      if (elSr && days !== lastAnnouncedDays) {
        lastAnnouncedDays = days;
        elSr.textContent = days + (days === 1 ? ' day' : ' days') + ' until launch.';
      }
    }

    tick();
    timer = setInterval(tick, 1000);
  })();

  /* ==========================================================
     3. The mark: a real physics playground
     Each of the 10 original facets is a rigid body with its true
     triangle shape. Grab one and it hangs from your pointer on an
     elastic tether; let go and it keeps its momentum, tumbles,
     collides with the others and collapses down to the bottom of
     the hero. Pulling a facet out drops every facet that was
     resting on it, and a fast-moving facet knocks loose whatever
     it hits, so the mark comes apart the way a stack of blocks
     would. "Reset arrangement" flies every piece home.
     Engine: matter.js, already a dependency of the main
     Graphcent site, vendored locally.
     ========================================================== */
  var hero = document.querySelector('.hero');
  var stage = document.getElementById('stage');
  var pieceEls = Array.prototype.slice.call(document.querySelectorAll('.piece'));
  var resetBtn = document.getElementById('resetBtn');
  var hint = document.getElementById('rigHint');

  if (!hero || !stage || !pieceEls.length || !window.Matter) return;

  var M = window.Matter;
  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Constraint = M.Constraint, Events = M.Events, Sleeping = M.Sleeping;

  var VB_W = 496.73;

  // True facet geometry (viewBox units), cleaned of duplicate and
  // collinear points from the original logo SVG, plus each facet's
  // area centroid and which facets it rests on.
  var TRIS = [
    [[173.23, 299.56], [87.76, 445.17], [85.82, 445.17], [0, 298.95]],
    [[0, 298.94], [86.43, 151.68], [172.86, 298.94]],
    [[87.76, 445.17], [173.23, 299.56], [258.68, 445.17]],
    [[300.99, 298.94], [355.95, 205.3], [410.91, 298.94]],
    [[349.02, 0], [262.2, 147.95], [175.42, 0.07]],
    [[87.95, 149.09], [175.42, 0.07], [261.53, 149.09]],
    [[86.43, 151.68], [87.95, 149.09], [261.53, 149.09], [172.86, 298.94]],
    [[238.05, 298.94], [409.68, 298.94], [323.87, 445.17]],
    [[323.87, 445.17], [410.91, 298.94], [496.73, 445.17]],
    [[261.53, 149.09], [349.02, 0], [436.52, 149.09]]
  ];
  var CENTROIDS = [
    [86.67, 348.43], [86.43, 249.85], [173.22, 396.63], [355.95, 267.73], [262.21, 49.34],
    [174.97, 99.42], [173.13, 199.05], [323.87, 347.68], [410.5, 396.43], [349.02, 99.39]
  ];
  // RESTS_ON[j] = facets directly beneath j. If any of them leaves, j falls.
  // (Facet 9 is cantilevered off facet 4, so it rests on it sideways.)
  var RESTS_ON = [[2], [0], [], [7], [5, 9], [6], [1], [8], [], [4]];

  var engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = reduceMotion ? 0 : 1;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;
  engine.constraintIterations = 3;

  var bodies = [];     // one rigid body per facet
  var home = [];       // assembled centroid of each facet, hero-local px
  var isLoose = [];    // has the facet been knocked out of the mark?
  var walls = [];
  var layoutKey = '';
  var drag = null;     // { i, constraint, pointerId, el }
  var tweens = null;   // reset animation in progress
  var lastDrawn = [];

  var MAX_SPEED = 26;      // px per step, so nothing tunnels or gets flung
  var MAX_HELD_SPEED = 18; // the facet in your hand moves a little heavier still
  var MAX_SPIN = 0.24;     // rad per step
  var KNOCK_SPEED = 3;     // impact speed that knocks a resting facet loose

  function measure() {
    var hr = hero.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    return {
      w: hr.width, h: hr.height,
      s: sr.width / VB_W,
      ox: sr.left - hr.left, oy: sr.top - hr.top,
      left: hr.left, top: hr.top
    };
  }

  function keyOf(m) {
    return [m.w, m.h, m.s, m.ox, m.oy].map(function (v) { return Math.round(v * 10); }).join('|');
  }

  function build() {
    var m = measure();
    layoutKey = keyOf(m);

    if (drag) endDrag();
    tweens = null;
    Composite.clear(engine.world, false);
    bodies = []; home = []; isLoose = []; lastDrawn = [];

    // walls: thick, so nothing can tunnel out; the floor is the hero's bottom edge
    var T = 400;
    var wallOpts = { isStatic: true, friction: 0.6, restitution: 0.1 };
    walls = [
      Bodies.rectangle(m.w / 2, m.h + T / 2, m.w + T * 2, T, wallOpts),       // floor
      Bodies.rectangle(m.w / 2, -T / 2, m.w + T * 2, T, wallOpts),            // ceiling
      Bodies.rectangle(-T / 2, m.h / 2, T, m.h + T * 2, wallOpts),            // left
      Bodies.rectangle(m.w + T / 2, m.h / 2, T, m.h + T * 2, wallOpts)        // right
    ];
    Composite.add(engine.world, walls);

    for (var i = 0; i < TRIS.length; i++) {
      var verts = TRIS[i].map(function (p) {
        return { x: m.ox + p[0] * m.s, y: m.oy + p[1] * m.s };
      });
      var c = { x: m.ox + CENTROIDS[i][0] * m.s, y: m.oy + CENTROIDS[i][1] * m.s };

      var b = Bodies.fromVertices(c.x, c.y, [verts], {
        friction: 0.28,
        frictionStatic: 0.3,
        frictionAir: reduceMotion ? 0.25 : 0.018,
        restitution: 0.12,
        density: 0.0016,
        slop: 0.03,
        sleepThreshold: 50
      });
      b.plugin.facet = i;
      // created dynamic then pinned, so matter keeps its real mass for later
      Body.setStatic(b, true);
      Body.setPosition(b, c);
      Body.setAngle(b, 0);

      bodies.push(b);
      home.push(c);
      isLoose.push(false);
      lastDrawn.push(null);

      pieceEls[i].style.transformOrigin = (CENTROIDS[i][0] * m.s) + 'px ' + (CENTROIDS[i][1] * m.s) + 'px';
    }
    Composite.add(engine.world, bodies);
    draw(true);
    // a rebuild puts every piece back in the mark, so the hint resets too
    hideTiltHint();
    if (hint) hint.style.opacity = '1';
  }

  // knock facet i out of the mark; anything resting on it follows
  function loosen(i, delay) {
    if (isLoose[i]) return;
    isLoose[i] = true;
    var b = bodies[i];
    Body.setStatic(b, false);
    Sleeping.set(b, false);
    // a hair of spin so the fall never looks mechanical
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.02);

    if (reduceMotion) return;
    for (var j = 0; j < RESTS_ON.length; j++) {
      if (!isLoose[j] && RESTS_ON[j].indexOf(i) !== -1) {
        (function (k, d) {
          setTimeout(function () { if (!tweens) loosen(k, 0); }, d);
        })(j, (delay || 0) + 70 + Math.random() * 110);
      }
    }
  }

  // a fast facet knocks loose whatever resting facet it hits
  Events.on(engine, 'collisionStart', function (ev) {
    if (reduceMotion || tweens) return;
    ev.pairs.forEach(function (pair) {
      var a = pair.bodyA, b = pair.bodyB;
      if (a.plugin.facet === undefined || b.plugin.facet === undefined) return;
      if (a.isStatic && !b.isStatic && b.speed > KNOCK_SPEED) loosen(a.plugin.facet, 0);
      else if (b.isStatic && !a.isStatic && a.speed > KNOCK_SPEED) loosen(b.plugin.facet, 0);
    });
  });

  function draw(force) {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      var dx = b.position.x - home[i].x;
      var dy = b.position.y - home[i].y;
      var a = b.angle;
      var prev = lastDrawn[i];
      if (!force && prev && Math.abs(prev[0] - dx) < 0.05 && Math.abs(prev[1] - dy) < 0.05 && Math.abs(prev[2] - a) < 0.0005) continue;
      lastDrawn[i] = [dx, dy, a];
      pieceEls[i].style.transform =
        'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) rotate(' + a.toFixed(4) + 'rad)';
    }
  }

  function anyMoving() {
    if (drag || tweens) return true;
    for (var i = 0; i < bodies.length; i++) {
      if (!bodies[i].isStatic && !bodies[i].isSleeping) return true;
    }
    return false;
  }

  function limit(b, held) {
    if (b.isStatic) return;
    var cap = held ? MAX_HELD_SPEED : MAX_SPEED;
    if (b.speed > cap) {
      var k = cap / b.speed;
      Body.setVelocity(b, { x: b.velocity.x * k, y: b.velocity.y * k });
    }
    if (Math.abs(b.angularVelocity) > MAX_SPIN) {
      Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * MAX_SPIN);
    }
  }

  // ---- reset: every facet flies home along a smooth curve ----
  function normAngle(a) {
    var t = a % (Math.PI * 2);
    if (t > Math.PI) t -= Math.PI * 2;
    if (t < -Math.PI) t += Math.PI * 2;
    return t;
  }

  function reset() {
    if (drag) endDrag();
    var now = performance.now();
    tweens = bodies.map(function (b, i) {
      Body.setStatic(b, true);
      return {
        from: { x: b.position.x, y: b.position.y, a: normAngle(b.angle) },
        start: now + (reduceMotion ? 0 : i * 35),
        dur: reduceMotion ? 1 : 850
      };
    });
    for (var i = 0; i < isLoose.length; i++) isLoose[i] = false;
    hideTiltHint();
    if (hint) hint.style.opacity = '1';
  }

  function stepTweens(now) {
    var done = true;
    for (var i = 0; i < bodies.length; i++) {
      var t = tweens[i];
      var p = Math.min(1, Math.max(0, (now - t.start) / t.dur));
      if (p < 1) done = false;
      var e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      Body.setPosition(bodies[i], {
        x: t.from.x + (home[i].x - t.from.x) * e,
        y: t.from.y + (home[i].y - t.from.y) * e
      });
      Body.setAngle(bodies[i], t.from.a * (1 - e));
    }
    if (done) {
      for (var j = 0; j < bodies.length; j++) {
        Body.setPosition(bodies[j], home[j]);
        Body.setAngle(bodies[j], 0);
        Body.setVelocity(bodies[j], { x: 0, y: 0 });
        Body.setAngularVelocity(bodies[j], 0);
      }
      tweens = null;
    }
  }

  // ---- pointer: grab a facet and it hangs from an elastic tether ----
  function local(e) {
    var hr = hero.getBoundingClientRect();
    return {
      x: Math.max(4, Math.min(hr.width - 4, e.clientX - hr.left)),
      y: Math.max(4, Math.min(hr.height - 4, e.clientY - hr.top))
    };
  }

  function onDown(e) {
    if (drag || tweens) return;
    var el = e.currentTarget;
    var pieceEl = el.closest('.piece');
    var i = pieceEls.indexOf(pieceEl);
    if (i < 0) return;

    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) {}

    loosen(i, 0);
    var b = bodies[i];
    var p = local(e);
    var c = Constraint.create({
      pointA: p,
      bodyB: b,
      pointB: { x: p.x - b.position.x, y: p.y - b.position.y },
      length: 0,
      stiffness: 0.16,
      damping: 0.08
    });
    Composite.add(engine.world, c);
    drag = { i: i, constraint: c, pointerId: e.pointerId, el: el };
    pieceEl.classList.add('dragging');
    if (hint && !tiltHintOn) hint.style.opacity = '0';
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.constraint.pointA = local(e);
    Sleeping.set(bodies[drag.i], false);
  }

  function endDrag() {
    if (!drag) return;
    Composite.remove(engine.world, drag.constraint);
    try { drag.el.releasePointerCapture(drag.pointerId); } catch (err) {}
    pieceEls[drag.i].classList.remove('dragging');
    drag = null;
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag();
    activateTilt();
  }

  pieceEls.forEach(function (el) {
    var poly = el.querySelector('polygon');
    if (poly) poly.addEventListener('pointerdown', onDown);
  });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });

  // Phones: a touch that starts on a facet belongs to the facet, not the
  // page. CSS touch-action alone is not honoured on SVG shapes by every
  // mobile browser (notably iOS Safari), which let the page scroll and
  // cancel the drag. So we stop the scroll here, in JS, but only when the
  // finger lands on a facet; swiping anywhere else still scrolls normally.
  hero.addEventListener('touchstart', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('.piece')) e.preventDefault();
  }, { passive: false });
  // while a facet is held, nothing should scroll or zoom the page
  window.addEventListener('touchmove', function (e) {
    if (drag) e.preventDefault();
  }, { passive: false });
  if (resetBtn) resetBtn.addEventListener('click', reset);

  // ---- tilt: on phones, tipping the device left or right steers loose facets ----
  // Switches on by itself the first time a facet is dropped (no button).
  // From then on the orientation sensor tells us which way is "down"
  // relative to the screen; its left/right part becomes sideways gravity,
  // so loose facets slide, roll and pile up on the low side. Facets still in
  // the mark are pinned, so tilt only moves loose ones. Works in portrait
  // and landscape, held upright or flat.
  var TILT_GAIN_X = 2.6;   // about 25 degrees of roll gives full sideways pull
  var TILT_DEAD_X = 0.07;  // ignore the first ~4 degrees so a hand at rest doesn't drift
  var tiltSensor = false;  // the sensor has reported at least once
  var tiltActive = false;  // switched on by the first drop
  var tiltSX = null;       // latest left/right value from the sensor
  var gX = 0;              // smoothed sideways gravity actually applied
  var lastWakeX = 0;
  var permissionAsked = false;
  var hasDropped = false;
  var needsPermission = typeof window.DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

  function screenAngle() {
    var a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle
          : (typeof window.orientation === 'number' ? window.orientation : 0);
    return ((a % 360) + 360) % 360;
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    var b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    // world "down" in the device's own axes (x right, y up, portrait)
    var dx = Math.sin(g) * Math.cos(b);
    var dy = -Math.sin(b);
    // ...then its left/right part in the screen's axes, whichever way it's turned
    var a = screenAngle();
    tiltSX = a === 90 ? -dy : a === 270 ? dy : a === 180 ? -dx : dx;
    if (!tiltSensor) {
      tiltSensor = true;
      if (tiltActive && hasDropped && !tiltDenied && !tiltHintOn && anyLoose()) showTiltHint();
    }
  }

  // The hint line becomes a tilt tip once the logo has been pulled apart,
  // and stays up while there are loose pieces to move. It only appears
  // where tilt can work: touch devices with an orientation sensor, and
  // not after an iPhone visitor declines motion access.
  var coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var maybeTilt = !reduceMotion && coarsePointer && typeof window.DeviceOrientationEvent !== 'undefined';
  var tiltDenied = false;   // declined, or no sensor ever reported
  var tiltHintOn = false;
  var tiltCheck = null;

  function anyLoose() {
    for (var i = 0; i < isLoose.length; i++) if (isLoose[i]) return true;
    return false;
  }

  function showTiltHint() {
    if (!hint) return;
    hint.classList.add('is-tilt');
    hint.style.opacity = '1';
    tiltHintOn = true;
  }

  function hideTiltHint() {
    clearTimeout(tiltCheck);
    if (!hint || !tiltHintOn) return;
    hint.classList.remove('is-tilt');
    hint.style.opacity = '0';
    tiltHintOn = false;
  }

  // no reading a couple of seconds after it should have started: no sensor
  function confirmSensorSoon() {
    clearTimeout(tiltCheck);
    tiltCheck = setTimeout(function () {
      if (!tiltSensor) { tiltDenied = true; hideTiltHint(); }
    }, 2500);
  }

  function activateTilt() {
    hasDropped = true;
    if (reduceMotion) return;
    tiltActive = true;
    if (!maybeTilt || tiltDenied || tiltHintOn) return;
    // Android etc.: the sensor reports from page load, so only promise tilt
    // once it has (if it reports later, onOrientation shows the tip then).
    // iPhone: show it now, alongside Apple's prompt asked on this same touch;
    // it is withdrawn if the visitor declines.
    if (needsPermission || tiltSensor) showTiltHint();
  }

  function stepTilt() {
    if (!tiltActive || tiltSX === null) return;
    var sx = tiltSX;
    sx = Math.abs(sx) < TILT_DEAD_X ? 0 : sx - (sx > 0 ? TILT_DEAD_X : -TILT_DEAD_X);
    var tx = Math.max(-1.5, Math.min(1.5, sx * TILT_GAIN_X));
    gX += (tx - gX) * 0.15;
    engine.gravity.x = gX;
    // resting facets fall asleep; wake the loose ones whenever "down" shifts
    if (Math.abs(gX - lastWakeX) > 0.04) {
      lastWakeX = gX;
      for (var w = 0; w < bodies.length; w++) {
        if (!bodies[w].isStatic) Sleeping.set(bodies[w], false);
      }
    }
  }

  if (!reduceMotion && typeof window.DeviceOrientationEvent !== 'undefined') {
    if (needsPermission) {
      // iOS only lets a page read tilt after the visitor allows it, and the
      // request has to come from a touch. We ask the moment the first facet
      // is dropped, so tilt arrives exactly when it becomes useful.
      window.addEventListener('touchend', function () {
        if (permissionAsked || !(hasDropped || drag)) return;
        permissionAsked = true;
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', onOrientation);
            confirmSensorSoon();
          } else {
            tiltDenied = true;
            hideTiltHint();
          }
        }).catch(function () { tiltDenied = true; hideTiltHint(); });
      }, { passive: true });
    } else {
      window.addEventListener('deviceorientation', onOrientation);
    }
  }

  // ---- responsive: rebuild the world whenever the layout changes ----
  function relayout() {
    var k = keyOf(measure());
    if (k !== layoutKey) build();
  }
  var resizeTimer = null;
  function scheduleRelayout() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, 120);
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(scheduleRelayout);
    ro.observe(hero);
    ro.observe(stage);
  }
  window.addEventListener('resize', scheduleRelayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);

  // ---- main loop: fixed-step physics, one DOM write per moved facet ----
  var STEP = 1000 / 60;
  var last = performance.now();
  var acc = 0;
  var idleFrames = 0;

  function frame(now) {
    var dt = Math.min(now - last, 100);
    last = now;

    stepTilt();

    if (tweens) {
      stepTweens(now);
      draw(!tweens); // exact final frame once every piece is home
    } else if (anyMoving()) {
      acc += dt;
      while (acc >= STEP) {
        Engine.update(engine, STEP);
        for (var i = 0; i < bodies.length; i++) limit(bodies[i], drag && drag.i === i);
        acc -= STEP;
      }
      draw(false);
      idleFrames = 0;
    } else {
      acc = 0;
      // while everything rests, cheaply watch for layout shifts (e.g. fonts)
      if (++idleFrames % 45 === 0) relayout();
    }
    requestAnimationFrame(frame);
  }

  build();
  requestAnimationFrame(frame);
})();
