# Phones: smoother rendering and touch gestures.
#  - lighter render resolution on touch screens (main viewer, 3D walkthroughs), faster quality fallback
#  - scroll handlers that never force a page layout (progress bars use transforms, text only written when it changes)
#  - the signal panel (EEG, MEG, BOLD, Doppler, spectrum, angiography) swipes aside to a small edge tab and back
#  - the findings card swipes away, the Brain states sheet drags down to close, two fingers resize the scan slide
#  - one scrollable row of scan buttons instead of two stacked rows, no backdrop blur over moving WebGL

# ---------- render resolution ----------
src = rep(src, "const BASE_SCALE = Math.min(window.devicePixelRatio || 1, 2);\nlet renderScale = BASE_SCALE, motionScale = BASE_SCALE,",
"""// Touch screens draw a little under full retina when still and well under it while moving or animating,
// so turning the brain and the live EEG / MEG / fMRI views stay smooth on a phone GPU.
const TOUCH = matchMedia('(pointer: coarse)').matches;
const BASE_SCALE = Math.min(window.devicePixelRatio || 1, TOUCH ? 1.75 : 2);
let renderScale = BASE_SCALE, motionScale = TOUCH ? Math.min(BASE_SCALE, 1.15) : BASE_SCALE,""")
src = rep(src, "if (avg > 0.055 && motionScale > 0.75 && now - lastScaleChange > 1200){ motionScale = Math.max(0.75, motionScale*0.85);",
"if (avg > (TOUCH ? 0.045 : 0.055) && motionScale > (TOUCH ? 0.6 : 0.75) && now - lastScaleChange > (TOUCH ? 500 : 1200)){ motionScale = Math.max(TOUCH ? 0.6 : 0.75, motionScale*0.85);")
# scan thumbnails read pixels back from the GPU: on phones, space them out and never build one mid-drag
src = rep(src, "function renderThumb(job){\n  const sub = job.sub, st = STATES[job.state];",
"""var thumbLast = 0;
function renderThumb(job){
  if (TOUCH && (drag || performance.now() - thumbLast < 90)){ thumbQueue.unshift(job); return; }
  thumbLast = performance.now();
  const sub = job.sub, st = STATES[job.state];""")
# 3D walkthroughs: phones start without ambient occlusion and at a lower pixel ratio
src = rep(src, "pr:Math.min(window.devicePixelRatio || 1, 1.5), times:[]", "pr:Math.min(window.devicePixelRatio || 1, TOUCH ? 1.35 : 1.5), times:[]")
src = rep(src, "  R.fixedTier = /[?&#]q=(low|mid|high)/.test(location.href);\n",
"  R.fixedTier = /[?&#]q=(low|mid|high)/.test(location.href);\n  if (TOUCH && !R.fixedTier) R.tier = Math.min(R.tier, 1);\n")

# ---------- scrolling without layout thrash ----------
src = rep(src, "  $('#immProg').style.width = (R.p*100).toFixed(1) + '%';", "  $('#immProg').style.setProperty('--p', R.p.toFixed(4));")
src = rep(src, "  $('#immStage').textContent = stage;", "  { const el = $('#immStage'); if (el.textContent !== stage) el.textContent = stage; }")
src = rep(src, "  $('#pinStep').textContent = `Step ${pad2(i + 1)} / ${pad2(SC.steps.length)}`; $('#pinTag').textContent = CHAPTERS[SC.id].steps[i].tag;",
"""  { const a = `Step ${pad2(i + 1)} / ${pad2(SC.steps.length)}`, b = CHAPTERS[SC.id].steps[i].tag, ea = $('#pinStep'), eb = $('#pinTag');
    if (ea.textContent !== a) ea.textContent = a; if (eb.textContent !== b) eb.textContent = b; }""")
src = rep(src, "  $('#pinProg').style.width = (clamp((anchor - first.top)/tot, 0, 1)*100).toFixed(1) + '%';",
"  $('#pinProg').style.setProperty('--p', clamp((anchor - first.top)/tot, 0, 1).toFixed(4));")

# ---------- signal panel: phone sizing + swipe aside ----------
src = rep(src, """  const big = sub.code === 40;
  chartCv.style.width = big ? '420px' : '340px'; chartCv.style.height = big ? '300px' : '150px';
  chartCv.width = big ? 840 : 680; chartCv.height = big ? 600 : 300;
  drawChartStatic();""", """  const big = sub.code === 40;
  if (innerWidth <= 820){   // phones: full width, height kept in proportion and capped so the brain stays in view
    const cw = Math.max(200, Math.min(innerWidth - 54, 560)), ch = Math.round(Math.max(96, Math.min(cw*(big ? 0.62 : 0.4), innerHeight*(big ? 0.3 : 0.19))));
    chartCv.style.width = '100%'; chartCv.style.height = ch + 'px'; chartCv.width = Math.round(cw*2); chartCv.height = ch*2;
  } else {
    chartCv.style.width = big ? '420px' : '340px'; chartCv.style.height = big ? '300px' : '150px';
    chartCv.width = big ? 840 : 680; chartCv.height = big ? 600 : 300;
  }
  chartShown();
  drawChartStatic();""")
src = rep(src, "  if (chart.hidden) return;\n", "  if (chart.hidden || chartTucked) return;\n")

JS = r"""
/* =====================================================================
   Touch gestures: swipe the signal panel aside, swipe the findings card away,
   drag the Brain states sheet down, pinch the scan slide.
   ===================================================================== */
var chartTucked = false, chartHinted = false;
function chartShown(){
  if (!chart.querySelector('.chart-tab')){
    const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'chart-tab'; tab.setAttribute('aria-label', 'Show the signal panel');
    tab.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><i aria-hidden="true"></i>';
    tab.addEventListener('click', e=>{ e.stopPropagation(); chartTuck(0); });
    const grip = document.createElement('div'); grip.className = 'chart-grip'; grip.setAttribute('aria-hidden', 'true'); grip.innerHTML = '<i></i><b></b><i></i>';
    chart.append(tab, grip);
  }
  // the first time the panel appears on a touch screen, nudge it once so the swipe is discoverable
  if (TOUCH && !chartHinted && !chartTucked && !reduceMotion){ chartHinted = true; chart.classList.add('nudge'); setTimeout(()=>chart.classList.remove('nudge'), 1700); }
}
function chartTuck(dir){
  chartTucked = !!dir;
  chart.classList.remove('nudge');
  chart.classList.toggle('tuck-l', dir < 0); chart.classList.toggle('tuck-r', dir > 0); chart.classList.toggle('tucked', !!dir);
  const tab = chart.querySelector('.chart-tab'); if (tab) tab.tabIndex = dir ? 0 : -1;
  if (!dir) drawChartStatic();
  dirty = true;
}
// Horizontal swipe on an element: follows the finger, then either commits (fling or past 30% of the width) or springs back.
function hSwipe(el, opt){
  let s = null;
  const reset = ()=>{ el.classList.remove('swiping'); el.style.transform = ''; el.style.opacity = ''; };
  el.addEventListener('pointerdown', e=>{
    if (e.button > 0 || (opt.ignore && e.target.closest(opt.ignore)) || (opt.when && !opt.when())) return;
    s = {id:e.pointerId, x:e.clientX, y:e.clientY, on:false, dx:0, v:0, lt:performance.now(), lx:e.clientX};
  });
  el.addEventListener('pointermove', e=>{
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.on){
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)){ s = null; return; }
      s.on = true; try { el.setPointerCapture(e.pointerId); } catch(err){} el.classList.add('swiping');
    }
    const t = performance.now(); if (t > s.lt){ s.v = (e.clientX - s.lx)/(t - s.lt); s.lt = t; s.lx = e.clientX; }
    s.dx = dx;
    el.style.transform = `translateX(${dx.toFixed(1)}px)`;
    el.style.opacity = (1 - Math.min(0.5, Math.abs(dx)/(el.offsetWidth*1.6))).toFixed(3);
    e.preventDefault();
  });
  const end = e=>{
    if (!s || e.pointerId !== s.id) return;
    const st = s; s = null; if (!st.on) return;
    const w = el.offsetWidth, fling = Math.abs(st.v) > 0.45 && Math.sign(st.v) === Math.sign(st.dx);
    if (e.type !== 'pointercancel' && (Math.abs(st.dx) > w*0.3 || fling)) opt.commit(Math.sign(st.dx), reset);
    else reset();
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  // a swipe should not also count as a click on whatever was under the finger
  el.addEventListener('click', e=>{ if (el.classList.contains('swiping')) e.stopPropagation(); }, true);
}
hSwipe(chart, {ignore:'button,select,input,a', when:()=>!chartTucked, commit:(dir, reset)=>{ reset(); chartTuck(dir); }});
hSwipe(fcard, {ignore:'button,select,input,a', commit:(dir, reset)=>{
  fcard.classList.remove('swiping'); fcard.style.transform = `translateX(${dir*(fcard.offsetWidth + 40)}px)`; fcard.style.opacity = '0';
  setTimeout(()=>{ fcard.hidden = true; reset(); }, 220);
}});

// Brain states sheet (phones): drag its header down to close it
(function(){
  const head = panel.querySelector('.p-head'); if (!head) return;
  const grab = document.createElement('div'); grab.className = 'p-grab'; grab.setAttribute('aria-hidden', 'true'); panel.prepend(grab);
  let s = null;
  const start = e=>{ if (innerWidth > 820 || !S.panel || e.button > 0 || e.target.closest('button')) return;
    s = {id:e.pointerId, y:e.clientY, dy:0, v:0, lt:performance.now(), ly:e.clientY, on:false}; };
  const move = e=>{ if (!s || e.pointerId !== s.id) return;
    const dy = e.clientY - s.y;
    if (!s.on){ if (Math.abs(dy) < 6) return; s.on = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err){} panel.classList.add('swiping'); }
    const t = performance.now(); if (t > s.lt){ s.v = (e.clientY - s.ly)/(t - s.lt); s.lt = t; s.ly = e.clientY; }
    s.dy = Math.max(0, dy); panel.style.transform = `translateY(${s.dy.toFixed(1)}px)`; e.preventDefault(); };
  const end = e=>{ if (!s || e.pointerId !== s.id) return; const st = s; s = null; if (!st.on) return;
    panel.classList.remove('swiping'); panel.style.transform = '';
    if (e.type !== 'pointercancel' && (st.dy > panel.offsetHeight*0.22 || st.v > 0.5)) openPanel(false); };
  [head, grab].forEach(el=>{ el.addEventListener('pointerdown', start); el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); });
})();

// Two fingers on the scan view resize the slide (and the scan inside it) around the pinch
(function(){
  const pts = new Map(); let pinch = null;
  const skip = t => panel.contains(t) || fcard.contains(t) || chart.contains(t) || $('#labPanel').contains(t) || !!t.closest('.hud-top,.hud-bottom');
  const begin = ()=>{ const [a, b] = [...pts.values()], sr = stageEl.getBoundingClientRect(), g = S.glass;
    const mx = (a.x + b.x)/2 - sr.left, my = (a.y + b.y)/2 - sr.top;
    pinch = {d:Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), size:g.size, fx:(mx - g.x)/g.size, fy:(my - g.y)/g.size};
    drag = null; canvas.classList.remove('dragging'); glassEl.classList.remove('dragging'); glassEl.classList.add('pinching'); hideTip(); };
  stageEl.addEventListener('pointerdown', e=>{
    if (e.pointerType !== 'touch' || skip(e.target) || VIEW !== 'scans') return;
    pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (pts.size === 2){ begin(); e.stopPropagation(); }
    else if (pts.size > 2) e.stopPropagation();
  }, true);
  stageEl.addEventListener('pointermove', e=>{
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (!pinch || pts.size < 2) return;
    e.stopPropagation();
    const [a, b] = [...pts.values()], sr = stageEl.getBoundingClientRect(), g = S.glass;
    const mx = (a.x + b.x)/2 - sr.left, my = (a.y + b.y)/2 - sr.top;
    g.size = Math.round(pinch.size*Math.hypot(a.x - b.x, a.y - b.y)/pinch.d);
    clampGlass(); g.x = Math.round(mx - pinch.fx*g.size); g.y = Math.round(my - pinch.fy*g.size);
    clampGlass(); layoutGlass(); dirty = true; updateAnnotations();
  }, true);
  const up = e=>{ if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pinch){ e.stopPropagation(); if (pts.size < 2){ pinch = null; drag = null; glassEl.classList.remove('pinching'); } } };
  stageEl.addEventListener('pointerup', up, true); stageEl.addEventListener('pointercancel', up, true);
})();

// keep the signal panel sized to the screen when the phone rotates
{ let rz = 0; window.addEventListener('resize', ()=>{ clearTimeout(rz); rz = setTimeout(()=>{ if (!chart.hidden && ready) setupChart(); }, 150); }); }
"""
src = rep(src, "route((location.hash.slice(1)) || 'top');", JS + "\nroute((location.hash.slice(1)) || 'top');")

CSS = """
/* ---------- progress bars move with transforms (no layout while scrolling) ---------- */
.imm-prog,.pin-prog{width:100%!important;transform-origin:0 50%;transform:scaleX(var(--p,0))}
/* ---------- signal panel: swipe aside to a tab on the screen edge ---------- */
.chart{transition:transform .34s var(--ease),opacity .25s;touch-action:none}
.chart.swiping{transition:none}
.chart.tuck-l{transform:translateX(calc(-100% - 18px))}
.chart.tuck-r{transform:translateX(calc(100% + 18px))}
.chart.tucked{box-shadow:none}
.chart.nudge{animation:chartNudge 1.5s var(--ease) .5s both}
@keyframes chartNudge{0%,100%{transform:none}22%{transform:translateX(-22px)}44%{transform:translateX(0)}62%{transform:translateX(-10px)}80%{transform:none}}
.chart-tab{position:absolute;top:50%;width:42px;height:58px;margin-top:-29px;display:none;align-items:center;justify-content:center;gap:2px;
  background:var(--paper);color:var(--signal);border:1px solid var(--line);box-shadow:0 8px 24px rgba(12,22,27,.16);cursor:pointer;touch-action:manipulation}
.chart-tab i{width:7px;height:7px;border-top:2px solid currentColor;border-right:2px solid currentColor}
.chart.tuck-l .chart-tab{display:flex;right:-43px;border-left:0;border-radius:0 12px 12px 0}
.chart.tuck-l .chart-tab i{transform:rotate(45deg);margin-left:-3px}
.chart.tuck-r .chart-tab{display:flex;left:-43px;border-right:0;border-radius:12px 0 0 12px;flex-direction:row-reverse}
.chart.tuck-r .chart-tab i{transform:rotate(-135deg);margin-right:-3px}
.chart-tab:focus-visible{outline:2px solid var(--signal);outline-offset:2px}
.chart-grip{display:none}
@media (hover:none){
  .chart-grip{display:flex;position:absolute;left:50%;top:3px;transform:translateX(-50%);align-items:center;gap:5px;pointer-events:none;opacity:.55}
  .chart-grip b{width:26px;height:3px;border-radius:2px;background:var(--line)}
  .chart-grip i{width:5px;height:5px;border-left:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg)}
  .chart-grip i:last-child{transform:rotate(-135deg)}
  .chart.tucked .chart-grip{opacity:0}
  .chart .chart-h{padding-top:6px}
}
/* findings card: swipe sideways to dismiss */
.fcard{touch-action:pan-y}
.fcard.swiping{transition:none}
.fcard:not(.swiping){transition:transform .22s var(--ease),opacity .22s}
.glass.pinching{cursor:grabbing}
/* small slides: the two top corner captions share the width instead of printing over each other */
.glass.compact .g-c.tl,.glass.compact .g-c.tr{max-width:calc(50% - 16px);overflow:hidden;text-overflow:ellipsis}
.p-grab{display:none}
@media (max-width:820px){
  .chart{left:12px;right:12px;bottom:92px;max-width:none;padding:8px 10px 6px}
  .chart canvas{width:100%}
  .chart.tuck-l{transform:translateX(calc(-100% - 14px))}
  .chart.tuck-r{transform:translateX(calc(100% + 14px))}
  /* the scan buttons: one row that scrolls sideways under the title */
  .hud-top{left:0;right:0;top:10px;flex-direction:column;align-items:stretch;gap:8px;flex-wrap:nowrap}
  .hud-top .now{padding:0 16px}
  .hud-right{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;padding:2px 16px 4px;scrollbar-width:none;touch-action:pan-x;overscroll-behavior-x:contain;
    -webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}
  .hud-right::-webkit-scrollbar{display:none}
  .hud-right>*{flex:none}
  .hud-right #statesBtn{order:-1}   /* the main action first, not off the end of the row */
  .hud-right .btn,.hud-right .seg button{min-height:34px}
  /* Brain states sheet: a grab bar to drag it down */
  .p-grab{display:block;position:relative;height:18px;flex:none;touch-action:none;cursor:grab}
  .p-grab::before{content:"";position:absolute;left:50%;top:7px;width:38px;height:4px;margin-left:-19px;border-radius:2px;background:var(--line)}
  .panel .p-head{touch-action:none;padding-top:4px}
  .panel.swiping{transition:none}
  .fcard{left:12px!important;right:12px;width:auto;bottom:92px;top:auto!important;max-height:52%}
}
/* touch screens: no backdrop blur over the constantly redrawn WebGL views (it re-blurs every frame on phones) */
@media (hover:none){
  .seg,.btn,.slice,.legend{-webkit-backdrop-filter:none;backdrop-filter:none}
  .seg,.btn{background:rgba(255,255,255,.96)}
  .imm-cue{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(6,10,13,.82)}
  button,a,input,select,label{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
}
"""
src = rep(src, "\n</style>\n</head><body>", CSS + "\n</style>\n</head><body>")
