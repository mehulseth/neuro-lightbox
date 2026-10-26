/* =====================================================================
   Brain Lab feedback: a 3D mannequin that answers cortical stimulation.
   Replaces the flat SVG figure (kept only as a fallback without WebGL).
   The figure faces the reader, so the patient's right is on the reader's
   left; stimulating one hemisphere lights and moves the opposite side.
   Joints come from buildMannequin: xL = the mannequin's left (+x).
   ===================================================================== */
const LB = {r:null, failed:false, raf:0, yaw:0, pitch:0.05, plan:null, evT0:null, evKey:null, dist:0, drag:null};
if (location.hostname === 'localhost') window.__LB = {LB, LAB, stimEffect, renderLabPanel, lbPose, lbPlan};
const LB_PART = {
  toes:{lit:['ankle'], mv:'ankle'}, foot:{lit:['ankle'], mv:'ankle'}, leg:{lit:['knee', 'ankle'], mv:'knee'}, hip:{lit:['hip'], mv:'hip'},
  trunk:{lit:['spine'], mv:'trunk'}, shoulder:{lit:['shoulder'], mv:'shoulder'}, arm:{lit:['shoulder', 'elbow'], mv:'elbow'},
  hand:{lit:['wrist', 'fingers', 'thumb'], mv:'hand'}, fingers:{lit:['fingers', 'thumb'], mv:'fingers'}, thumb:{lit:['thumb'], mv:'thumb'},
  neck:{lit:['neck'], mv:'neck'}, face:{lit:['cheek', 'lips', 'brow', 'eye'], mv:'face', face:true}, lips:{lit:['lips'], mv:'lips', face:true},
  tongue:{lit:['tongue'], mv:'tongue', face:true}, throat:{lit:['neck', 'lips'], mv:'throat', face:true},
};
const LB_MID = new Set(['spine', 'neck', 'head', 'tongue', 'nose']);
const LB_FACEKEYS = ['browL', 'browR', 'eyeL', 'eyeR', 'lidL', 'lidR', 'cheekL', 'cheekR', 'lipsL', 'lipsR', 'tongue', 'nose', 'earL', 'earR'];
const LB_KIND = {move:'Motor response', feel:'Sensation', see:'Visual', hear:'Auditory', speech:'Language', eyes:'Eye movement', memory:'Experiential', self:'Experiential', emotion:'Limbic', gut:'Visceral', quiet:'No visible movement'};
const LB_COL = {move:0x2f6bff, feel:0x00a389, see:0xe0a01c, hear:0x00a389, speech:0x2f6bff, eyes:0x2f6bff, memory:0x8a5cf6, self:0x8a5cf6, emotion:0xe8962a, gut:0xe8962a, quiet:0x00a389};

// what lights up, what moves, what floats above the body
function lbPlan(e){
  const sides = e.side === 'both' ? ['L', 'R'] : [e.side === 'right' ? 'R' : 'L'];
  const J = names => { const out = []; for (const n of names){ if (LB_MID.has(n)) out.push(n); else for (const s of sides) out.push(n + s); } return [...new Set(out)]; };
  const P = {lit:[], col:LB_COL[e.kind] || 0x2f6bff, mv:null, sides, bubble:null, glow:[], ghost:false, kind:e.kind};
  const k = e.kind;
  if ((k === 'move' || k === 'feel') && LB_PART[e.part]){ const d = LB_PART[e.part]; P.lit = J(d.lit); P.mv = k === 'move' ? d.mv : 'feel'; P.glow = d.face ? [] : J([d.lit[0]]); P.face = !!d.face; }
  else if (e.part === 'posture'){ P.sides = ['L', 'R']; P.lit = ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'neck']; P.mv = 'posture'; P.glow = ['shoulderL', 'shoulderR']; }
  else if (k === 'eyes'){ P.lit = ['eyeL', 'eyeR']; P.mv = 'eyes'; P.face = true; }
  else if (k === 'speech'){ P.lit = ['lipsL', 'lipsR', 'tongue']; P.mv = 'speech'; P.face = true; P.bubble = e.title.startsWith('Speech') ? 'one, two, th…' : 'a… pencil? no…'; }
  else if (k === 'hear'){ P.lit = sides.map(s=>'ear' + s); P.mv = 'hear'; P.face = true; P.glow = sides.map(s=>'ear' + s); }
  else if (k === 'see'){ P.lit = ['eyeL', 'eyeR']; P.mv = 'see'; P.face = true; P.glow = ['eyes']; }
  else if (k === 'memory'){ P.lit = ['head']; P.mv = 'dream'; P.face = true; P.bubble = 'déjà vu'; }
  else if (k === 'self'){ P.lit = ['head']; P.mv = 'dream'; P.ghost = true; }
  else if (k === 'emotion'){
    if (/stomach/.test(e.title)){ P.lit = ['head', 'spine']; P.glow = ['gut']; P.mv = 'fear'; }
    else { P.face = true; P.lit = ['head']; P.mv = /smile/i.test(e.title) ? 'smile' : /[Mm]ood/.test(e.title) ? 'mood' : /urge/.test(e.title) ? 'urge' : 'fear'; } }
  else if (k === 'gut'){ P.lit = ['spine', 'neck']; P.glow = ['gut']; P.mv = 'nausea'; }
  else if (k === 'quiet' && /^Tremor/.test(e.title)){ P.lit = J(['wrist', 'fingers', 'thumb']); P.mv = 'tremor'; }
  if (P.lit.includes('head')) P.lit.push(...LB_FACEKEYS);
  return P;
}
function lbTag(e){
  const nm = {toes:'toes', foot:'foot', leg:'leg', hip:'hip', trunk:'trunk', shoulder:'shoulder', arm:'arm', hand:'hand', fingers:'fingers', thumb:'thumb', neck:'neck', face:'face', lips:'lips', tongue:'tongue', throat:'throat'}[e.part];
  const side = e.side === 'both' ? 'both sides' : e.side;
  if ((e.kind === 'move' || e.kind === 'feel') && nm) return `${LB_KIND[e.kind]} · ${e.side === 'both' ? nm + ', both sides' : side + ' ' + nm}`;
  if (e.kind === 'eyes') return `${LB_KIND.eyes} · to the ${side}`;
  return LB_KIND[e.kind] || 'Response';
}

function lbBuild(){
  if (LB.r || LB.failed) return LB.r;
  if (typeof THREE === 'undefined' || typeof buildMannequin !== 'function'){ LB.failed = true; return null; }
  try {
    const T = THREE, cv = document.createElement('canvas');
    cv.className = 'lb-cv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', '3D body showing the response to stimulation. Drag to turn it, click to replay.');
    const r = new T.WebGLRenderer({canvas:cv, antialias:true, alpha:true, powerPreference:'high-performance'});
    r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 0.8; r.setClearColor(0xffffff, 0);
    const sc = new T.Scene(); sc.environment = immStudioEnv(r, {top:0.7, floor:0.32, horizon:0.3, panel:1.1});
    sc.add(new T.HemisphereLight(0xffffff, 0xb9c4ca, 0.22));
    const key = new T.DirectionalLight(0xffffff, 1.15); key.position.set(-190, 300, 260); sc.add(key);
    const rim = new T.DirectionalLight(0xd6e4ff, 0.75); rim.position.set(240, 210, -280); sc.add(rim);
    const lin = h => new T.Color(h).convertSRGBToLinear();
    // platform: a white plinth with a thin signal-blue edge light and a soft contact shadow
    const disc = new T.Mesh(new T.CylinderGeometry(38, 41, 3, 96), new T.MeshPhysicalMaterial({color:lin(0xf3f5f6), roughness:0.3, clearcoat:0.6})); disc.position.y = -1.6; sc.add(disc);
    LB.ringMat = new T.MeshStandardMaterial({color:lin(0x0050ff), emissive:lin(0x0050ff), emissiveIntensity:1.1});
    const ring = new T.Mesh(new T.TorusGeometry(38.4, 0.45, 8, 160), LB.ringMat); ring.rotation.x = Math.PI/2; ring.position.y = 0.05; sc.add(ring);
    const sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({map:immCanvasTex(128, 128, (x, w)=>{ const g = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); g.addColorStop(0, 'rgba(20,30,36,.32)'); g.addColorStop(1, 'rgba(20,30,36,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), transparent:true, depthWrite:false}));
    sh.rotation.x = -Math.PI/2; sh.position.y = 0.15; sh.scale.set(56, 32, 1); sc.add(sh);
    // the body: one material per segment so each part can light up on its own
    const base = new T.MeshPhysicalMaterial({color:lin(0xbcc6cc), roughness:0.42, metalness:0, clearcoat:0.45, clearcoatRoughness:0.3});
    const M = buildMannequin(T, {material:base, segments:48}); sc.add(M.group);
    M.j.shoulderL.rotation.z = 0.2; M.j.shoulderR.rotation.z = -0.2;       // anatomical position: arms a little out, palms forward
    M.j.elbowL.rotation.x = M.j.elbowR.rotation.x = -0.06;
    const jname = new Map(Object.entries(M.j).map(([k, g])=>[g, k]));
    LB.parts = {};
    for (const m of M.meshes){ const jn = jname.get(m.parent); m.material = base.clone(); m.userData.h = 0; m.userData.base = m.material.color.clone(); m.geometry.computeBoundingSphere(); (LB.parts[jn] = LB.parts[jn] || []).push(m); }
    LB.base = Object.fromEntries(Object.entries(M.j).map(([k, g])=>[k, g.rotation.clone()]));
    // soft halos over the responding part
    LB.glowTex = immGlowTex(); LB.glows = [];
    for (let i = 0; i < 4; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:LB.glowTex, color:0x2f6bff, transparent:true, opacity:0, depthWrite:false, depthTest:false})); s.scale.set(44, 44, 1); s.renderOrder = 5; sc.add(s); LB.glows.push(s); }
    // out-of-body experience: a translucent copy floating face-down above
    LB.ghostMat = new T.MeshBasicMaterial({color:lin(0x8a5cf6), transparent:true, opacity:0, depthWrite:false});
    const gw = new T.Group(), gh = M.group.clone(true); gh.traverse(o=>{ if (o.isMesh) o.material = LB.ghostMat; }); gh.rotation.y = -Math.PI/2; gw.add(gh);
    gw.rotation.z = Math.PI/2; gw.scale.setScalar(0.5); gw.position.set(44, 190, -12); gw.visible = false; sc.add(gw); LB.ghost = gw;
    lbFace(T, M.j.head, base, lin);
    LB.r = r; LB.cv = cv; LB.scene = sc; LB.M = M; LB.cam = new T.PerspectiveCamera(24, 1, 10, 4000); LB.hi = new T.Color(); LB.hiD = new T.Color(); LB.v = new T.Vector3();
    // drag to turn, click to replay, double-click to face front
    cv.addEventListener('pointerdown', e=>{ LB.drag = {x:e.clientX, y:e.clientY, yaw:LB.yaw, pitch:LB.pitch, moved:false}; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging'); });
    cv.addEventListener('pointermove', e=>{ const d = LB.drag; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; LB.yaw = d.yaw - dx*0.012; LB.pitch = Math.max(-0.12, Math.min(0.55, d.pitch + dy*0.004)); LB.yawHome = false; });
    const up = () => { const d = LB.drag; if (!d) return; LB.drag = null; cv.classList.remove('dragging'); if (!d.moved && LB.plan) LB.evT0 = performance.now(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('dblclick', ()=>{ LB.yawHome = true; });
  } catch(err){ console.warn('3D body unavailable', err); LB.failed = true; LB.r = null; }
  return LB.r;
}

function lbMount(host, s){
  if (!lbBuild() || !host) return false;
  host.innerHTML = `<span class="lb-tag"></span><span class="lb-side" data-s="R" title="Patient's right">R</span><span class="lb-side" data-s="L" title="Patient's left">L</span><span class="lb-bub" hidden></span><span class="lb-hint">Facing you · drag to turn · click to replay</span><button type="button" class="lb-view">Face</button>`;
  host.prepend(LB.cv); LB.host = host;
  LB.sideR = host.querySelector('[data-s="R"]'); LB.sideL = host.querySelector('[data-s="L"]'); LB.bub = host.querySelector('.lb-bub');
  const tag = host.querySelector('.lb-tag');
  LB.viewBtn = host.querySelector('.lb-view');
  LB.viewBtn.addEventListener('click', ()=>{ LB.view = (LB.fz ?? 0) > 0.5 ? 'body' : 'face'; });
  if (s){
    if (LB.evKey !== s.t0){ LB.evKey = s.t0; LB.evT0 = performance.now(); LB.plan = lbPlan(s.effect); LB.yawHome = true; LB.view = null; }
    tag.textContent = lbTag(s.effect); tag.style.setProperty('--c', '#' + new THREE.Color(LB.plan.col).getHexString());
    if (LB.plan.bubble){ LB.bub.textContent = LB.plan.bubble; LB.bub.hidden = false; }
  } else { LB.plan = null; LB.evKey = null; tag.textContent = 'Awaiting stimulation'; tag.classList.add('idle'); }
  if (!LB.raf) LB.raf = requestAnimationFrame(lbFrame);
  return true;
}

/* ---------- the face: sculpted features on the blank head, each one a separate part that can light and move ---------- */
// the head's own surface (buildMannequin's egg with its jaw taper), so features sit flush on it
const lbHeadZ = (x, y) => { const yy = y - 10.5, k = yy < -2 ? Math.min(1, (-2 - yy)/9) : 0, x0 = Math.abs(x)/(1 - 0.22*k), q = 1 - (x0/7.6)**2 - (yy/11.2)**2; return (0.8 + 9.6*Math.sqrt(Math.max(0, q)))*(1 - 0.12*k) - 0.8*k; };
function lbFace(T, head, base, lin){
  const F = LB.F = {eye:{}, lid:{}, brow:{}, cheek:{}, lips:{}, key:''};
  const reg = (m, key) => { m.userData.part = key; m.userData.h = 0; m.userData.base = m.material.color.clone(); m.geometry.computeBoundingSphere(); (LB.parts[key] = LB.parts[key] || []).push(m); return m; };
  const mat = (hex, o = {}) => { const m = base.clone(); m.color = lin(hex); Object.assign(m, o); return m; };
  const ell = (rx, ry, rz, seg = 28) => { const g = new T.SphereGeometry(1, seg, Math.round(seg*0.7)); g.scale(rx, ry, rz); return g; };
  const skin = 0xbcc6cc;
  for (const s of ['L', 'R']){
    const sg = s === 'L' ? 1 : -1;
    // eye: a ball that turns (with iris and pupil) under an eyelid that closes
    const E = new T.Group(); E.position.set(sg*2.75, 12.2, lbHeadZ(2.75, 12.2) - 0.72); head.add(E);
    const ball = new T.Group(); E.add(ball); F.eye[s] = ball;
    ball.add(reg(new T.Mesh(ell(1.12, 1.12, 1.12, 32), mat(0xe8ecee, {roughness:0.18, clearcoat:1})), 'eye' + s));
    const iris = new T.Mesh(new T.CircleGeometry(0.56, 32), new T.MeshStandardMaterial({color:lin(0x4d5c64), roughness:0.3})); iris.position.z = 1.115; ball.add(iris);
    const pupil = new T.Mesh(new T.CircleGeometry(0.25, 24), new T.MeshBasicMaterial({color:lin(0x141b20)})); pupil.position.z = 1.125; ball.add(pupil);
    const lid = new T.Mesh(new T.SphereGeometry(1.24, 32, 12, 0, Math.PI*2, 0, 1.05), mat(skin, {side:T.DoubleSide})); E.add(lid); F.lid[s] = reg(lid, 'lid' + s);
    // brow ridge
    const brow = new T.Mesh(ell(1.85, 0.34, 0.55), mat(0xa4aeb4)); brow.position.set(sg*2.9, 14.55, lbHeadZ(2.9, 14.55) + 0.05); brow.rotation.set(0, sg*0.32, -sg*0.12); head.add(brow);
    brow.userData.p0 = brow.position.clone(); brow.userData.r0 = brow.rotation.z; F.brow[s] = reg(brow, 'brow' + s);
    // cheek pad
    const ck = new T.Mesh(ell(1.55, 1.05, 0.95), mat(skin)); ck.position.set(sg*4.1, 8.8, lbHeadZ(4.1, 8.8) - 0.6); ck.rotation.y = sg*0.5; head.add(ck);
    ck.userData.p0 = ck.position.clone(); F.cheek[s] = reg(ck, 'cheek' + s);
    // ear
    const ear = new T.Mesh(ell(0.62, 2.3, 1.45), mat(skin)); ear.position.set(sg*7.4, 11, 0.5); ear.rotation.y = -sg*0.25; head.add(ear); reg(ear, 'ear' + s);
    // lips: an upper and a lower half-lip on this side plus the corner; rebuilt as the mouth moves
    const lm = mat(0xb1a6a5, {roughness:0.35});
    F.lips[s] = {up:new T.Mesh(new T.BufferGeometry(), lm), lo:new T.Mesh(new T.BufferGeometry(), lm.clone()), co:new T.Mesh(new T.SphereGeometry(0.32, 16, 12), lm.clone())};
    for (const k of ['up', 'lo', 'co']){ head.add(F.lips[s][k]); }
  }
  // nose: bridge, tip and the two wings
  const nm = mat(skin);
  const nose = new T.Mesh(ell(0.7, 2.2, 0.95), nm); nose.position.set(0, 10.35, lbHeadZ(0, 10.35) - 0.12); nose.rotation.x = -0.22; head.add(nose); reg(nose, 'nose');
  const tip = new T.Mesh(ell(0.66, 0.58, 0.62), nm.clone()); tip.position.set(0, 8.8, lbHeadZ(0, 8.8) + 0.6); head.add(tip); reg(tip, 'nose');
  for (const sg of [1, -1]){ const w = new T.Mesh(ell(0.48, 0.38, 0.42), nm.clone()); w.position.set(sg*0.78, 8.6, lbHeadZ(0.78, 8.6) + 0.18); head.add(w); reg(w, 'nose'); }
  // inside of the mouth and the tongue
  F.mouth = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({color:lin(0x242b30)})); head.add(F.mouth);
  F.tongue = reg(new T.Mesh(ell(1.2, 0.5, 2.0), mat(0xb39494, {roughness:0.45})), 'tongue'); head.add(F.tongue);
  // register the lip meshes once their geometry exists
  lbMouth({open:0, cx:{L:0, R:0}, cy:{L:0, R:0}});
  for (const s of ['L', 'R']) for (const k of ['up', 'lo', 'co']) reg(F.lips[s][k], 'lips' + s);
}
// rebuild the lips for this mouth shape (only when it actually changes)
function lbMouth(X){
  const F = LB.F, T = THREE, V = T.Vector3;
  const key = [X.open, X.cx.L, X.cx.R, X.cy.L, X.cy.R].map(v=>Math.round(v*40)).join(',');
  if (key === F.key) return; F.key = key;
  const yU = 6.32 + X.open*0.12, yL = 5.68 - X.open*1.3;
  for (const s of ['L', 'R']){
    const sg = s === 'L' ? 1 : -1, xc = sg*(2.05 + X.cx[s]), yc = 6.0 + X.cy[s] - X.open*0.45, zc = lbHeadZ(xc, yc) + 0.22;
    const L = F.lips[s];
    for (const up of [true, false]){
      const ym = up ? yU : yL, zm = lbHeadZ(0, ym) + (up ? 0.38 : 0.3);
      const c = new T.QuadraticBezierCurve3(new V(-sg*0.14, ym, zm), new V(sg*1.2, ym*0.62 + yc*0.38 + (up ? 0.1 : -0.12), (zm + zc)/2 + 0.22), new V(xc, yc, zc));
      const m = up ? L.up : L.lo; m.geometry.dispose(); m.geometry = new T.TubeGeometry(c, 14, up ? 0.3 : 0.36, 8, false); m.geometry.computeBoundingSphere();
    }
    L.co.position.set(xc, yc, zc);
  }
  const gap = Math.max(0, (yU - yL) - 0.75), my = (yU + yL)/2;
  F.mouth.visible = gap > 0.04; F.mouth.position.set(0, my, lbHeadZ(0, my) + 0.06); F.mouth.scale.set(1.75 + 0.25*(X.cx.L + X.cx.R)/2, Math.max(0.01, gap/2), 1);
  F.mouthY = my;
}
function lbFaceApply(X, t){
  const F = LB.F; if (!F) return;
  // a natural blink every few seconds
  const bt = (t + 1.3) % 4.3, blink = Math.max(0, 1 - Math.abs(bt - 0.09)/0.09);
  for (const s of ['L', 'R']){
    const sg = s === 'L' ? 1 : -1, e = Math.max(0, Math.min(1.3, X.eye[s]*(1 - blink)));
    F.lid[s].rotation.x = 1.5 - 1.25*e;
    F.eye[s].rotation.set(-0.4*X.gazeY, 0.62*X.gaze, 0);
    const b = F.brow[s]; b.position.copy(b.userData.p0); b.position.y += 0.75*X.brow[s] - 0.2*X.browIn; b.position.x -= sg*0.25*X.browIn; b.rotation.z = b.userData.r0 + sg*0.3*X.browIn;
    const c = F.cheek[s]; c.position.copy(c.userData.p0); c.position.y += 0.55*X.cheek[s]; c.position.z += 0.2*X.cheek[s];
  }
  lbMouth(X);
  const tg = F.tongue, out = X.tongue;
  tg.visible = out > 0.01 || X.open > 0.1; tg.position.set(X.tongueX, (F.mouthY || 6) - 0.35*out, lbHeadZ(0, 6) - 1.4 + 3.9*out); tg.rotation.set(0.25*out, 0.3*X.tongueX, 0);
}

function lbPose(t, k){
  const J = LB.M.j, P = LB.plan, TAU = Math.PI*2;
  for (const n in J) J[n].rotation.copy(LB.base[n]);
  J.spine.rotation.x += 0.01*Math.sin(t*1.3); J.neck.rotation.x += 0.008*Math.sin(t*1.3 + 0.6);     // breathing
  const X = {open:0, cx:{L:0, R:0}, cy:{L:0, R:0}, brow:{L:0, R:0}, browIn:0, eye:{L:1, R:1}, gaze:0, gazeY:0, cheek:{L:0, R:0}, tongue:0, tongueX:0};
  if (P && P.mv) lbMove(P, J, X, k, TAU);
  lbFaceApply(X, t);
}
function lbMove(P, J, X, k, TAU){
  const env = ismooth(0, 0.06, k)*(1 - ismooth(2.4, 3.0, k));
  const flex = Math.pow(Math.max(0, Math.sin(TAU*1.8*k)), 1.5)*env;     // brief contractions, about two a second… then rest
  const jerk = Math.sin(TAU*3.2*k)*env, hold = ismooth(0, 0.45, k)*(1 - ismooth(4.2, 5.2, k));
  const one = P.sides.length === 1, sg0 = P.sides[0] === 'L' ? 1 : -1, both = f => { for (const s of ['L', 'R']) f(s, s === 'L' ? 1 : -1); };
  switch (P.mv){
    case 'trunk': J.spine.rotation.z += 0.07*(one ? flex*sg0 : jerk); J.spine.rotation.y += 0.05*jerk; return;
    case 'neck': J.neck.rotation.y += one ? 0.45*flex*sg0 : 0.25*jerk; return;
    case 'face':   // the lower face on that side pulls: mouth corner up and out, cheek rises, eye narrows, brow dips
      for (const s of P.sides){ X.cx[s] += 0.4*flex; X.cy[s] += 0.6*flex; X.cheek[s] += 0.6*flex; X.eye[s] -= 0.5*flex; X.brow[s] -= 0.25*flex; }
      X.open += 0.1*flex; J.head.rotation.z += 0.03*jerk; return;
    case 'lips':   // the corner of the mouth twitches; the lips purse and part
      for (const s of P.sides){ X.cx[s] += 0.35*flex; X.cy[s] += 0.45*flex; }
      both(s=>{ X.cx[s] -= 0.18*Math.abs(jerk); }); X.open += 0.18*flex; return;
    case 'tongue': { const h2 = ismooth(0, 0.3, k)*(1 - ismooth(2.7, 3.2, k));
      X.open = 0.8*h2; X.tongue = h2*(0.8 + 0.2*flex); X.tongueX = (one ? sg0*0.8*h2 : 0) + 0.3*jerk; return; }
    case 'throat': J.neck.rotation.x += 0.07*flex; J.head.rotation.x -= 0.06*flex; both(s=>{ X.cx[s] -= 0.15*flex; X.cy[s] -= 0.08*flex; }); return;   // a swallow
    case 'eyes': J.neck.rotation.y += 0.25*hold*sg0; J.head.rotation.y += 0.08*hold*sg0; X.gaze = 0.75*hold*sg0; return;
    case 'speech': X.open = k < 0.7 ? 0.22 + 0.22*Math.max(0, Math.sin(TAU*5.5*k)) : 0.3*hold; J.head.rotation.x += 0.02*Math.sin(TAU*4*k)*(1 - ismooth(0.5, 0.8, k)); return;
    case 'hear': X.gaze = 0.45*hold*sg0*(one ? 1 : 0); both(s=>{ X.brow[s] += 0.35*hold; }); J.head.rotation.y += 0.12*hold*(one ? sg0 : 0); return;
    case 'see': { const fl = Math.max(0, Math.sin(TAU*2.4*k))*env; X.gaze = 0.4*hold*(one ? sg0 : 0); both(s=>{ X.eye[s] -= 0.45*fl; X.brow[s] += 0.2*hold; }); return; }
    case 'dream': both(s=>{ X.eye[s] = 1 - 0.6*hold; X.cy[s] += 0.12*hold; }); X.gazeY = 0.35*hold; J.head.rotation.x -= 0.06*hold; return;
    case 'fear': both(s=>{ X.brow[s] += 0.85*hold; X.eye[s] = 1 + 0.3*hold; X.cy[s] -= 0.28*hold; X.cx[s] += 0.1*hold; }); X.browIn = 0.35*hold; X.open = 0.45*hold; J.head.rotation.x -= 0.05*hold; return;
    case 'smile': both(s=>{ X.cy[s] += 0.75*hold; X.cx[s] += 0.4*hold; X.cheek[s] += 0.6*hold; X.eye[s] -= 0.3*hold; }); X.open = 0.12*hold; return;
    case 'mood': both(s=>{ X.cy[s] += 0.4*hold; X.cx[s] += 0.18*hold; X.cheek[s] += 0.3*hold; X.brow[s] += 0.15*hold; }); return;
    case 'urge': both(s=>{ X.brow[s] -= 0.3*hold; X.cx[s] -= 0.12*hold; X.cy[s] -= 0.08*hold; }); X.browIn = 0.65*hold; J.head.rotation.x += 0.06*flex; return;
    case 'nausea': both(s=>{ X.cy[s] -= 0.3*hold; X.eye[s] -= 0.25*hold; }); X.browIn = 0.4*hold; J.spine.rotation.x += 0.05*hold; return;
    case 'posture':
      for (const s of ['L', 'R']){ const sg = s === 'L' ? 1 : -1; J['shoulder' + s].rotation.z += sg*(s === 'R' ? 1.3 : 0.55)*hold; J['shoulder' + s].rotation.x -= 0.25*hold; J['elbow' + s].rotation.x -= (s === 'R' ? 0.35 : 0.9)*hold; }
      J.neck.rotation.y += -0.5*hold; X.gaze = -0.5*hold; return;
  }
  for (const s of P.sides){
    const g = n => J[n + s], sg = s === 'L' ? 1 : -1;
    switch (P.mv){
      case 'ankle': g('ankle').rotation.x += 0.6*flex; break;
      case 'knee': g('knee').rotation.x += 0.75*flex; g('hip').rotation.x -= 0.3*flex; break;
      case 'hip': g('hip').rotation.x -= 0.55*flex; g('knee').rotation.x += 0.4*flex; break;
      case 'shoulder': g('shoulder').rotation.z += 0.5*flex*sg; break;
      case 'elbow': g('elbow').rotation.x -= 1.05*flex; g('shoulder').rotation.x -= 0.18*flex; break;
      case 'hand': g('wrist').rotation.x -= 0.5*flex; g('fingers').rotation.x -= 1.2*flex; g('thumb').rotation.x -= 0.7*flex; break;
      case 'fingers': g('fingers').rotation.x -= 1.3*flex; break;
      case 'thumb': g('thumb').rotation.x -= 0.9*flex; g('thumb').rotation.z -= 0.45*flex*sg; break;
      case 'tremor': { const a = 0.2*Math.sin(TAU*5.2*k)*(1 - ismooth(0.8, 2.8, k))*ismooth(0, 0.1, k); g('wrist').rotation.x += a; g('fingers').rotation.x += a*0.6; break; }
    }
  }
}
function lbAnchor(n, v){
  const J = LB.M.j;
  if (n === 'eyes') return J.head.localToWorld(v.set(0, 12.2, 10.6));
  if (n === 'earL' || n === 'earR') return J.head.localToWorld(v.set(n === 'earL' ? 8.2 : -8.2, 11, 0.6));
  if (n === 'gut') return J.spine.localToWorld(v.set(0, 10, 10));
  const ms = LB.parts[n]; if (!ms) return null; const m = ms[0]; return m.localToWorld(v.copy(m.geometry.boundingSphere.center));
}
function lbFrame(now){
  LB.raf = 0;
  const cv = LB.cv, lp = $('#labPanel');
  if (!cv || !cv.isConnected || S.tab !== 'lab' || !lp || lp.hidden) return;
  LB.raf = requestAnimationFrame(lbFrame);
  const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  const r = LB.r, pr = Math.min(window.devicePixelRatio || 1, 2);
  if (r.getPixelRatio() !== pr) r.setPixelRatio(pr);
  if (cv.width !== Math.round(w*pr) || cv.height !== Math.round(h*pr)) r.setSize(w, h, false);
  const dt = Math.min(0.1, Math.max(0, (now - (LB.lastT || now))/1000)); LB.lastT = now;
  const t = now/1000, P = LB.plan, k = LB.debugK != null ? LB.debugK : LB.evT0 != null ? (performance.now() - LB.evT0)/1000 : 99, cam = LB.cam;
  // frame the whole figure (and the ghost above it), or close in on the face for facial responses
  const wantFace = LB.view ? LB.view === 'face' : !!(P && P.face);
  LB.fz = LB.fz == null ? (wantFace ? 1 : 0) : LB.fz + ((wantFace ? 1 : 0) - LB.fz)*(1 - Math.exp(-dt*4.5)); const fz = ismooth(0, 1, LB.fz);
  const topB = P && P.ghost ? 204 : 186, botB = -18, tf = Math.tan(12*Math.PI/180);
  const cy = ilerp((topB + botB)/2, 162.5, fz), half = ilerp((topB - botB)/2*1.05, 15.5, fz), halfW = ilerp(64, 13, fz);
  const want = Math.max(half/tf, halfW/(tf*w/h)); LB.dist = LB.dist ? LB.dist + (want - LB.dist)*(1 - Math.exp(-dt*8)) : want;
  if (LB.yawHome && !LB.drag){ LB.yaw *= Math.exp(-dt*9); LB.pitch += (0.05 - LB.pitch)*(1 - Math.exp(-dt*9)); if (Math.abs(LB.yaw) < 0.002) LB.yawHome = false; }
  cam.aspect = w/h; cam.near = Math.max(1, LB.dist*0.2); cam.updateProjectionMatrix();
  const tz = ilerp(0, 3, fz);
  cam.position.set(Math.sin(LB.yaw)*Math.cos(LB.pitch)*LB.dist, cy + Math.sin(LB.pitch)*LB.dist, tz + Math.cos(LB.yaw)*Math.cos(LB.pitch)*LB.dist); cam.lookAt(0, cy, tz);
  if (LB.viewBtn){ const lab = fz > 0.5 ? 'Full body' : 'Face'; if (LB.viewBtn.textContent !== lab) LB.viewBtn.textContent = lab; }
  lbPose(t, k);
  LB.scene.updateMatrixWorld(true);
  // light the responding segments, fade the rest back to clinical grey
  const pulse = 0.72 + 0.28*Math.sin(t*4.2);
  LB.hi.set(P ? P.col : 0x2f6bff).convertSRGBToLinear(); LB.hiD.copy(LB.hi).multiplyScalar(0.32);
  for (const jn in LB.parts){ const on = P && P.lit.includes(jn) ? 1 : 0;
    for (const m of LB.parts[jn]){ m.userData.h += (on - m.userData.h)*(1 - Math.exp(-dt*9)); const hh = m.userData.h; if (hh < 0.002 && !on){ m.material.color.copy(m.userData.base); m.material.emissive.setRGB(0, 0, 0); continue; }
      m.material.color.copy(m.userData.base).lerp(LB.hiD, 0.95*hh); m.material.emissive.copy(LB.hi).multiplyScalar(0.32*hh*pulse); } }
  const fin = ismooth(0, 0.3, k);
  LB.glows.forEach((s, i)=>{ const a = P && P.glow[i]; if (!a || !lbAnchor(a, s.position)){ s.material.opacity = 0; return; } s.material.color.set(P.col); s.material.opacity = 0.5*pulse*fin; s.scale.setScalar(ilerp(44, 8, fz)); });
  LB.ghost.visible = !!(P && P.ghost); if (LB.ghost.visible){ LB.ghostMat.opacity = 0.3*ismooth(0.2, 1.4, k); LB.ghost.position.y = 190 + 2*Math.sin(t*1.4); }
  LB.ringMat.emissiveIntensity = 0.9 + 0.5*(P ? fin*pulse : 0.3);
  r.render(LB.scene, cam);
  // overlay: R / L at the patient's hands, speech bubble over the head
  const v = LB.v, put = (el, p, ox, oy) => { if (!el) return; v.copy(p).project(cam); el.style.transform = `translate(${((v.x*0.5 + 0.5)*w + ox).toFixed(1)}px,${((-v.y*0.5 + 0.5)*h + oy).toFixed(1)}px)`; el.style.opacity = v.z < 1 ? 1 : 0; };
  const J = LB.M.j, tmp = new THREE.Vector3();
  if (fz > 0.5){ put(LB.sideR, J.head.localToWorld(tmp.set(-11.5, 10, 1)), 0, 0); put(LB.sideL, J.head.localToWorld(tmp.set(11.5, 10, 1)), 0, 0); }
  else { put(LB.sideR, J.wristR.localToWorld(tmp.set(0, -24, 0)), 0, 0); put(LB.sideL, J.wristL.localToWorld(tmp.set(0, -24, 0)), 0, 0); }
  if (LB.bub && !LB.bub.hidden) put(LB.bub, J.head.localToWorld(tmp.set(fz > 0.5 ? 6 : 0, fz > 0.5 ? 4 : 25, 10)), fz > 0.5 ? 70 : 0, 0);
}
