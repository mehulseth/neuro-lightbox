
// motor-task activation painted on the cortex (same blobs as the viewer's finger-tapping state)
const ACT_OVERLAY = () => ({key:'act', uniforms:{uAct:{value:STATES.motor.act.map(a=>new THREE.Vector4(a.c[0], a.c[1], a.c[2], a.s))}, uActA:{value:STATES.motor.act.map(a=>a.a)}, uBold:{value:0}},
  decl:'uniform vec4 uAct[5]; uniform float uActA[5]; uniform float uBold;' + GLSL_RAMPS,
  code:`float aF = 0.0; for (int i = 0; i < 5; i++){ vec3 dd = vMni - uAct[i].xyz; aF += uActA[i]*exp(-dot(dd, dd)/(2.0*uAct[i].w*uAct[i].w)); }
    aF *= uBold; vec3 aC = iAct(aF); float aM = smoothstep(0.24, 0.36, aF)*0.92; diffuseColor.rgb = mix(diffuseColor.rgb, aC, aM);`,
  emit:`totalEmissiveRadiance += aC*aM*0.4;`});

/* =====================================================================
   fMRI walkthrough
     0.00 the same magnet · 0.11 task on a screen · 0.235 the mirror · 0.355 motor cortex
     0.47 neurons fire · 0.57 blood rushes in · 0.67 deoxyhaemoglobin washed out
     0.76 the BOLD signal · 0.86 a volume every 2 s · 0.945 the map
   ===================================================================== */
function buildFMRI(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats(), SIG = 0x0050ff;
  const S = immStudio(scene, renderer);
  /* ---------- magnet (the MRI film's shape, without the cutaway) ---------- */
  const mag = new T.Group(); scene.add(mag);
  const body = ishadow(new T.Mesh(new T.ExtrudeGeometry(iring(232, 236, 58, 64), {depth:128, bevelEnabled:true, bevelThickness:6, bevelSize:6, bevelSegments:8, curveSegments:72}), M.shell)); body.geometry.translate(0, 0, -64); mag.add(body);
  const seam = new T.MeshStandardMaterial({color:0x3a454b, roughness:0.6, transparent:true});
  for (const z of [-71.5, 71.5]){ const s = new T.Mesh(new T.ExtrudeGeometry(iring(226, 230, 55, 62), {depth:3, bevelEnabled:false, curveSegments:64}), seam); s.position.z = z - 1.5; mag.add(s); }
  const coverGeo = new T.ExtrudeGeometry(iring(238, 242, 60, 57), {depth:16, bevelEnabled:true, bevelThickness:5, bevelSize:5, bevelSegments:10, curveSegments:80});
  for (const side of [1, -1]){ const g = new T.Group(); g.position.z = 77*side; mag.add(g);
    const c = ishadow(new T.Mesh(coverGeo, M.shell)); c.position.z = side > 0 ? 0 : -16; g.add(c);
    const f = new T.Mesh(iflare(36.5, 57.5, 28), M.shell); f.scale.z = side; f.position.z = side > 0 ? 21 : -21; g.add(f);
    const trim = new T.Mesh(new T.TorusGeometry(60, 2.4, 24, 160), M.trim); trim.position.z = side > 0 ? 21.5 : -21.5; g.add(trim);
    if (side > 0){ W.ringMat = new T.MeshStandardMaterial({color:SIG, emissive:SIG, emissiveIntensity:1.4, roughness:0.4, transparent:true}); const ring = new T.Mesh(new T.TorusGeometry(64.5, 0.75, 12, 200), W.ringMat); ring.position.z = 21.6; g.add(ring);
      W.scr = iscreen(['HEAD FIRST · SUPINE', 'Motor task · 15 s blocks', 'EPI BOLD  TR 2000'], 26, 16.25, 0.3); W.scr.position.set(-86, 58, 21.4); W.scr.rotation.y = 0.18; g.add(W.scr);
      W.plate = iplate('N E U R O · 3 T'); W.plate.position.set(0, 96, 21.6); g.add(W.plate); } }
  const plinth = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(212, 150, 14), {depth:16, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:3}), M.plinth)); plinth.rotation.x = -Math.PI/2; plinth.position.set(0, S.FLOOR, 75); scene.add(plinth);
  const liner = new T.Mesh(new T.CylinderGeometry(36.5, 36.5, 176, 128, 1, true), M.liner); liner.rotation.x = Math.PI/2; mag.add(liner);
  S.blob(0, 10, 330, 300);
  /* ---------- the task: a screen behind the magnet, a projector, a mirror on the head coil ---------- */
  W.taskCv = document.createElement('canvas'); W.taskCv.width = 512; W.taskCv.height = 384; W.taskTex = new T.CanvasTexture(W.taskCv); W.taskTex.encoding = T.sRGBEncoding;
  const screen = new T.Mesh(new T.PlaneGeometry(48, 36), new T.MeshBasicMaterial({map:W.taskTex, toneMapped:false})); screen.position.set(0, 6, -132); scene.add(screen); W.screen = screen;
  const frame = new T.Mesh(new T.BoxGeometry(52, 40, 1.5), M.dark); frame.position.set(0, 6, -133.2); scene.add(frame);
  const stand = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 6 - 20 - S.FLOOR, 16), M.steel); stand.position.set(0, (S.FLOOR + 6 - 20)/2, -134); scene.add(stand);
  const proj = new T.Group(); proj.position.set(0, 18, -300); scene.add(proj);
  proj.add(ishadow(new T.Mesh(new T.BoxGeometry(40, 16, 34), M.trim)));
  const lens = new T.Mesh(new T.CylinderGeometry(4, 4.4, 4, 24), M.dark); lens.rotation.x = Math.PI/2; lens.position.set(0, 0, 18.5); proj.add(lens);
  const pstand = new T.Mesh(new T.CylinderGeometry(2, 2, 18 - S.FLOOR - 8, 16), M.steel); pstand.position.set(0, (S.FLOOR - 8 + 18)/2 - 18, 0); proj.add(pstand);
  const beamG = new T.BufferGeometry(); const apex = [0, 18, -279.5], cs = [[-24, -12], [24, -12], [24, 24], [-24, 24]].map(([x, y])=>[x, 6 + y*0.0 + (y < 0 ? -18 : 18), -133.5]);
  beamG.setAttribute('position', new T.Float32BufferAttribute([...apex, ...cs[0], ...cs[1], ...apex, ...cs[1], ...cs[2], ...apex, ...cs[2], ...cs[3], ...apex, ...cs[3], ...cs[0]], 3));
  W.beam = new T.Mesh(beamG, new T.MeshBasicMaterial({color:0xdfe9ff, transparent:true, opacity:0.12, depthWrite:false, side:T.DoubleSide, blending:T.AdditiveBlending})); scene.add(W.beam);
  /* ---------- patient, head coil with mirror ---------- */
  W.P = immTable(scene);
  const hcMat = new T.MeshPhysicalMaterial({color:0xf8f9fa, roughness:0.28, clearcoat:0.7, transparent:true, side:T.DoubleSide}); W.hcMat = hcMat;
  const hc = new T.Group(); hc.position.set(0, 19, 16); W.P.table.add(hc); W.hc = hc;
  const cradle = ishadow(new T.Mesh(new T.CylinderGeometry(15.5, 15.5, 32, 64, 1, true, -Math.PI*0.5, Math.PI), hcMat)); cradle.rotation.x = Math.PI/2; hc.add(cradle);
  for (const z of [-15, -5, 5, 15]){ const r = new T.Mesh(new T.TorusGeometry(15.5, 1.1, 10, 64, Math.PI), hcMat); r.position.z = z; hc.add(r); }
  for (const a of [0.25, 0.5, 0.75].map(f=>f*Math.PI)){ const b = new T.Mesh(new T.BoxGeometry(2.2, 2.2, 32), hcMat); b.position.set(15.5*Math.cos(a), 15.5*Math.sin(a), 0); hc.add(b); }
  const mtex = W.taskTex.clone(); mtex.needsUpdate = true; mtex.wrapS = T.RepeatWrapping; mtex.repeat.x = -1; mtex.offset.x = 1; W.mtex = mtex;
  W.mirror = new T.Mesh(new T.PlaneGeometry(10, 6), new T.MeshBasicMaterial({map:mtex, toneMapped:false, transparent:true})); W.mirror.position.set(0, 17.5, 4); W.mirror.rotation.x = -Math.PI/2 + 0.6; hc.add(W.mirror);
  const mframe = new T.Mesh(new T.BoxGeometry(11, 7, 0.6), hcMat); mframe.position.set(0, 17.5, 4); mframe.rotation.x = -Math.PI/2 + 0.6; mframe.translateZ(-0.35); hc.add(mframe);
  const btn = new T.Mesh(new T.BoxGeometry(5, 3, 9), new T.MeshStandardMaterial({color:0x2c363c, roughness:0.4})); W.P.man.j.wristR.add(btn); btn.position.set(0, -8, 1.5);
  /* ---------- brain with activation, and a scalp ---------- */
  W.ov = ACT_OVERLAY(); W.brain = immBrain(W.P.mni, {overlay:W.ov, order:2});
  const skin = new T.MeshPhysicalMaterial({color:0xc9d6de, roughness:0.35, clearcoat:0.4, transparent:true, opacity:0, depthWrite:false});
  W.scalp = immScalp(W.P.mni, skin, {order:4});
  /* ---------- neurovascular unit, magnified, floating just outside the hand knob ---------- */
  W.P.table.position.set(0, -22, -16); scene.updateMatrixWorld(true);
  const knob = W.P.mni.localToWorld(new T.Vector3(-38, -22, 58)), knobIn = W.P.mni.localToWorld(new T.Vector3(-28, -20, 40));
  const N = knob.clone().sub(knobIn).normalize(), U = new T.Vector3(0, 1, 0).sub(N.clone().multiplyScalar(N.y)).normalize(), V = new T.Vector3().crossVectors(U, N).normalize();
  const C = knob.clone().addScaledVector(N, 13);
  const nvu = new T.Group(); nvu.position.copy(C); nvu.rotation.set(0, Math.PI/2, 0); scene.add(nvu); W.nvu = nvu; nvu.visible = false;
  // local: x along the vessel, y = out of the brain, z across
  const slabMat = new T.MeshPhysicalMaterial({color:0xe8d6d0, roughness:0.6, transparent:true, opacity:0.35, depthWrite:false});
  const slabM = new T.Mesh(new T.BoxGeometry(10, 4, 6), slabMat); slabM.position.y = -2; nvu.add(slabM);
  const surf = new T.Mesh(new T.PlaneGeometry(10, 6), new T.MeshStandardMaterial({color:0xd9b6ae, roughness:0.7, transparent:true, opacity:0.5, side:T.DoubleSide, depthWrite:false})); surf.rotation.x = -Math.PI/2; nvu.add(surf);
  W.vesMat = new T.MeshPhysicalMaterial({color:0xd9412b, roughness:0.25, transparent:true, opacity:0.32, depthWrite:false, side:T.DoubleSide});
  W.vessel = new T.Mesh(new T.CylinderGeometry(1, 1, 10.4, 40, 1, true), W.vesMat); W.vessel.rotation.z = Math.PI/2; W.vessel.position.y = 0.7; nvu.add(W.vessel);
  const capMat = new T.MeshStandardMaterial({color:0xc4513e, roughness:0.4, transparent:true, opacity:0.8});
  for (let i = 0; i < 4; i++){ const x = -3.6 + i*2.4, pts = [new T.Vector3(x, 0.5, 0), new T.Vector3(x + 0.4, -1, 0.8*(i % 2 ? 1 : -1)), new T.Vector3(x - 0.2, -2.6, 0.2), new T.Vector3(x + 0.6, -3.6, -0.6)];
    nvu.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.09, 6), capMat)); }
  W.neur = []; const nMat = () => new T.MeshStandardMaterial({color:0x8fa0a8, roughness:0.5, emissive:0x2f6bff, emissiveIntensity:0, transparent:true});
  for (let i = 0; i < 5; i++){ const g = new T.Group(); g.position.set(-3.8 + i*1.9, -3.1, (i % 2 ? 1.6 : -1.6)); nvu.add(g); const m = nMat();
    const soma = new T.Mesh(new T.ConeGeometry(0.32, 0.8, 16), m); g.add(soma);
    const ap = new T.Mesh(new T.CylinderGeometry(0.06, 0.1, 2.5, 8), m); ap.position.y = 1.6; g.add(ap);
    for (const s of [-1, 1]){ const bd = new T.Mesh(new T.CylinderGeometry(0.04, 0.06, 0.8, 6), m); bd.position.set(s*0.35, -0.55, 0); bd.rotation.z = s*0.9; g.add(bd); }
    W.neur.push({g, m, ph:i*0.37}); }
  W.NC = 34; W.cells = new T.InstancedMesh(new T.SphereGeometry(0.22, 14, 10), new T.MeshStandardMaterial({color:0xffffff, roughness:0.4}), W.NC); nvu.add(W.cells);
  W.cellD = Array.from({length:W.NC}, (_, i)=>({x:-5 + 10*i/W.NC, r:hashf(i*3.1)*0.6, a:hashf(i*7.7)*Math.PI*2, d:hashf(i*1.9)}));
  const ringTex = immCanvasTex(64, 64, (x, w)=>{ x.strokeStyle = 'rgba(107,42,79,.9)'; x.lineWidth = 3; x.setLineDash([4, 4]); x.beginPath(); x.arc(w/2, w/2, w*0.4, 0, Math.PI*2); x.stroke(); });
  W.halos = []; for (let i = 0; i < W.NC; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:ringTex, transparent:true, opacity:0, depthWrite:false})); s.scale.setScalar(1.1); nvu.add(s); W.halos.push(s); }
  /* ---------- EPI slices sweeping through the head ---------- */
  W.slabs = []; for (let i = 0; i < 7; i++){ const m = new T.Mesh(new T.BoxGeometry(19, 22, 0.32), new T.MeshBasicMaterial({color:0x2f6bff, transparent:true, opacity:0, depthWrite:false})); m.renderOrder = 6; scene.add(m); W.slabs.push(m); }
  W.headC = W.P.mni.localToWorld(new T.Vector3(0, -18, 12));
  /* ---------- panels ---------- */
  const PN = immPanels(scene); W.boldP = PN.make('BOLD SIGNAL · LEFT HAND KNOB', 512, 256); W.mapP = PN.make('Z-MAP ON ANATOMY'); W.mapP.keepLab = true;
  // camera: computed around the magnified unit
  const k = (v) => [v.x, v.y, v.z], vS = C.clone().add(new T.Vector3(16, 3.5, 0)), vT = C.clone().add(new T.Vector3(0, -1, 0));
  const above = W.headC.clone().add(new T.Vector3(8, 16, -30)), beyond = W.headC.clone().addScaledVector(N, 34).add(new T.Vector3(0, 6, 0));
  const cam = immCamPath(R, [
    [0.00, [-480, 130, 560], [0, -10, 0]],
    [0.10, [-60, 34, 430], [0, 4, -110]],
    [0.20, [-26, 30, 250], [0, 6, -130]],
    [0.28, [0, 26, 70], [0, 12, -2]],
    [0.34, [0, 22, 32], [0, 14.5, 4]],
    [0.40, k(above), k(W.headC.clone().add(new T.Vector3(2, 0, -5)))],
    [0.46, k(beyond), k(knob)],
    [0.53, k(vS), k(vT)],
    [0.66, k(C.clone().add(new T.Vector3(14, 6, -4))), k(vT)],
    [0.74, k(C.clone().add(new T.Vector3(15, 2, 3))), k(vT)],
    [0.82, k(W.headC.clone().add(new T.Vector3(34, 22, -46))), k(W.headC)],
    [0.90, k(W.headC.clone().add(new T.Vector3(48, 12, -8))), k(W.headC)],
    [1.00, k(W.headC.clone().add(new T.Vector3(30, 20, -40))), k(W.headC.clone().add(new T.Vector3(0, 0, -3)))],
  ], {drift:0.08});
  W.drawTask = (on, t) => { const c = W.taskCv.getContext('2d'), w = 512, h = 384; c.fillStyle = '#0a0d10'; c.fillRect(0, 0, w, h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (on){ c.fillStyle = '#ffffff'; c.font = '600 64px Archivo, Arial, sans-serif'; c.fillText('TAP', w/2, h/2 - 34); c.font = '400 26px Archivo, Arial, sans-serif'; c.fillStyle = '#9fb6ff'; c.fillText('right fingers, in time', w/2, h/2 + 30);
      const b = (Math.floor(t*3) % 2) ? 1 : 0.35; c.fillStyle = `rgba(95,141,255,${b})`; c.beginPath(); c.arc(w/2, h/2 + 92, 14, 0, Math.PI*2); c.fill(); }
    else { c.fillStyle = '#c8d4da'; c.font = '300 90px Archivo, Arial, sans-serif'; c.fillText('+', w/2, h/2 - 6); c.font = '400 24px Archivo, Arial, sans-serif'; c.fillStyle = '#76858c'; c.fillText('rest', w/2, h/2 + 70); }
    W.taskTex.needsUpdate = true; W.mtex.needsUpdate = true; };
  const m4 = new T.Matrix4(), q0 = new T.Quaternion(), sc = new T.Vector3(1, 0.42, 1), col = new T.Color(), oxy = new T.Color(0xd9412b).convertSRGBToLinear(), deo = new T.Color(0x6b2a4f).convertSRGBToLinear();
  W.update = (p, t, dt) => {
    const P = W.P; W.brain.build(); W.scalp.build();
    cam(p, t, ilerp(34, 46, ismooth(0.28, 0.36, p)), p < 0.26 ? 6 : 0.3);
    R.saoOn = false;
    P.table.position.set(0, -22, ilerp(205, -16, ismooth(0.1, 0.24, p)));
    // task blocks, 15 s on / 15 s off (shown 3× faster)
    const tau = t*3, on = (tau % 30) < 15;
    const tk = (on ? 1 : 0) + Math.floor(t*3)*2; if (W.tk !== tk){ W.tk = tk; W.drawTask(on, t); }
    // inside: the magnet turns to glass, coil fades, brain appears
    const inside = ismooth(0.355, 0.4, p), deep = ismooth(0.36, 0.42, p);
    for (const m of [M.shell, M.liner, M.trim]) ifade(m, 1 - deep, 0.05); seam.opacity = 1 - deep; W.ringMat.opacity = 1 - 0.9*deep; W.scr.visible = W.plate.visible = deep < 0.5;
    P.fadeBody(ismooth(0.3, 0.37, p)); P.fadeTable(0.75*inside);
    const hcA = 1 - ismooth(0.34, 0.39, p); hcMat.opacity = hcA; hcMat.depthWrite = hcA > 0.98; W.hc.visible = hcA > 0.02; W.mirror.material.opacity = hcA;
    skin.opacity = 0.16*inside; if (W.scalp.mesh) W.scalp.mesh.visible = skin.opacity > 0.005;
    const nvA = iwin(p, 0.46, 0.5, 0.745, 0.77);
    W.brain.set(inside*(1 - 0.7*nvA));
    // activation follows the task during "into the motor cortex", then the statistical map holds still
    const live = boldAt(tau), mapHold = ismooth(0.93, 0.96, p);
    W.ov.uniforms.uBold.value = inside*(ilerp(0.25 + 0.85*live, 1.0, mapHold));
    // neurons fire during the task, vessel widens, oxygenated blood washes out deoxyhaemoglobin
    nvu.visible = nvA > 0.01;
    nvu.traverse(o=>{ if (o.material && o.material.transparent && o !== W.vessel){ o.material.opacity = (o.material.userData.b ?? (o.material.userData.b = o.material.opacity))*nvA; } });
    W.vesMat.opacity = 0.32*nvA;
    const fire = ismooth(0.48, 0.52, p), dil = ismooth(0.57, 0.64, p), wash = ismooth(0.6, 0.7, p);
    W.neur.forEach(n=>{ const r = ilerp(0.6, 6, fire), ph = (t*r + n.ph) % 1; n.m.emissiveIntensity = (ph < 0.18 ? 1.6*(1 - ph/0.18) : 0)*nvA; });
    const R0 = ilerp(0.75, 1.1, dil); W.vessel.scale.set(R0, 1, R0);
    const speed = ilerp(0.8, 2.4, dil), fDeoxy = ilerp(0.55, 0.12, wash);
    W.cellD.forEach((c, i)=>{ c.x += speed*dt*(0.9 + 0.2*hashf(i)); if (c.x > 5) { c.x -= 10; c.d = hashf(i*13.3 + t); }
      const rr = c.r*R0*0.8, y = 0.7 + rr*Math.sin(c.a), z = rr*Math.cos(c.a); q0.setFromAxisAngle(new T.Vector3(0, 0, 1), c.x*0.6 + i);
      m4.compose(new T.Vector3(c.x, y, z), q0, sc); W.cells.setMatrixAt(i, m4); const de = c.d < fDeoxy; W.cells.setColorAt(i, col.copy(de ? deo : oxy));
      const h = W.halos[i]; h.position.set(c.x, y, z); h.material.opacity = de ? 0.75*nvA*iwin(p, 0.66, 0.69, 0.76, 0.78) : 0; h.visible = h.material.opacity > 0.01; });
    W.cells.instanceMatrix.needsUpdate = true; if (W.cells.instanceColor) W.cells.instanceColor.needsUpdate = true;
    W.cells.material.opacity = nvA; W.cells.material.transparent = nvA < 0.99; W.cells.visible = nvA > 0.01;
    // EPI: slices acquired one after another through the head
    const epi = iwin(p, 0.855, 0.87, 0.93, 0.95);
    W.slabs.forEach((s, i)=>{ const idx = (Math.floor(t*14) - i), z = ((idx % 30) + 30) % 30; s.position.copy(W.headC); s.position.z += -9 + z*0.62; s.material.opacity = epi*(i ? 0.32*(1 - i/7) : 0.55); s.visible = epi > 0.01; });
    // panels
    const camO = R.camera, bA = iwin(p, 0.765, 0.79, 0.85, 0.87);
    if (bA > 0.002){ const c = W.boldP.ctx, w = 512, h = 256, win = 60, t1 = tau, t0 = t1 - win, X = s => (s - t0)/win*w;
      c.fillStyle = '#0a1016'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,80,255,0.22)'; for (let b = Math.floor(t0/30)*30; b < t1; b += 30){ const a0 = Math.max(b, t0), z0 = Math.min(b + 15, t1); if (z0 > a0) c.fillRect(X(a0), 0, X(z0) - X(a0), h); }
      c.strokeStyle = 'rgba(200,212,218,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, h - 30); c.lineTo(w, h - 30); c.stroke();
      c.strokeStyle = '#7fa6ff'; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 200; i++){ const s = t0 + win*i/200, y = h - 30 - boldAt(s)*(h - 70); i ? c.lineTo(X(s), y) : c.moveTo(X(s), y); } c.stroke();
      c.fillStyle = '#c8d4da'; c.font = '20px monospace'; c.fillText('tap', 8, 24); c.fillText('+2 %', w - 64, 24); c.fillText('60 s', 8, h - 6); W.boldP.dirty();
      const land = camO.aspect >= 1.05; PN.place(W.boldP, camO, land ? 0.22 : 0, land ? 0.18 : 0.25, land ? 0.62 : 0.62*camO.aspect*1.3); }
    W.boldP.show(bA);
    const mA = ismooth(0.945, 0.97, p);
    if (mA > 0.002){ if (!W.mapDrawn){ const cv = scanCanvas('bold', 'motor'); if (cv){ W.mapP.ctx.drawImage(cv, 0, 0, 256, 256); W.mapP.dirty(); W.mapDrawn = true; } }
      const land = camO.aspect >= 1.05; PN.place(W.mapP, camO, land ? Math.min(0.44, camO.aspect/2 - 0.3) : 0, land ? 0.03 : 0.2, land ? 0.52 : 0.6*Math.min(1, camO.aspect*1.4)); }
    W.mapP.show(mA);
  };
  W.labels = p => {
    const a = iwin(p, 0.12, 0.14, 0.2, 0.22), b = iwin(p, 0.29, 0.31, 0.34, 0.35), c = iwin(p, 0.4, 0.42, 0.455, 0.47), d = iwin(p, 0.5, 0.52, 0.56, 0.575), e = iwin(p, 0.58, 0.6, 0.66, 0.675), f = iwin(p, 0.68, 0.7, 0.75, 0.765);
    const L = v => nvu.localToWorld(v.clone());
    return [
      {pos:new T.Vector3(-24, 24, -132), text:'Screen behind the magnet', a, left:true},
      {pos:W.P.table.localToWorld(new T.Vector3(0, 36.5, 20)), text:'Mirror on the head coil', a:b},
      {pos:W.P.mni.localToWorld(new T.Vector3(-38, -22, 58)), text:'Left motor cortex: hand area', a:c},
      {pos:L(new T.Vector3(-3.8, -3.1, -1.6)), text:'Pyramidal neurons firing', a:d, left:true},
      {pos:L(new T.Vector3(3.5, 1.6, 0)), text:'Arteriole widens, flow rises', a:e},
      {pos:L(new T.Vector3(-2, 1.8, 0)), text:'Deoxyhaemoglobin distorts the field', a:f, left:true},
    ];
  };
  immLinearize(scene);
  return W;
}
