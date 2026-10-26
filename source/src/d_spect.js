
const SPECT_OVERLAY = () => ({key:'spect', uniforms:{uHot:{value:0}, uGlow:{value:0}}, decl:'uniform float uHot, uGlow;' + GLSL_RAMPS,
  code:`float cSp = clamp((dot(vColor.rgb, vec3(0.333)) - 0.08)/0.62, 0.0, 1.0); vec3 spC = iSpect(0.3 + 0.62*cSp); diffuseColor.rgb = mix(diffuseColor.rgb, spC*0.85, uHot);`,
  emit:`totalEmissiveRadiance += spC*uHot*uGlow;`});

/* =====================================================================
   SPECT walkthrough
     0.00 camera · 0.11 tracer · 0.26 heads close in · 0.38 inside a head
     0.50 only straight photons · 0.63 step and shoot · 0.77 reconstruction · 0.94 image
   ===================================================================== */
function buildSPECT(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats(), m4 = new T.Matrix4();
  const S = immStudio(scene, renderer);
  /* ---------- gantry ring the heads ride on ---------- */
  const gz = -52;
  const ringG = ishadow(new T.Mesh(new T.ExtrudeGeometry(iring(214, 214, 107, 80), {depth:22, bevelEnabled:true, bevelThickness:5, bevelSize:5, bevelSegments:8, curveSegments:120}), M.shell));
  ringG.position.z = gz - 11; scene.add(ringG);
  const lightR = new T.Mesh(new T.TorusGeometry(91, 0.7, 12, 200), new T.MeshStandardMaterial({color:0x0050ff, emissive:0x0050ff, emissiveIntensity:1.3})); lightR.position.z = gz + 16.3; scene.add(lightR); W.lightR = lightR;
  const base = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(170, 70, 12), {depth:24, bevelEnabled:true, bevelThickness:3, bevelSize:3, bevelSegments:4}), M.plinth)); base.rotation.x = -Math.PI/2; base.position.set(0, S.FLOOR, gz + 10); scene.add(base);
  const foot = ishadow(new T.Mesh(new T.BoxGeometry(120, -S.FLOOR - 104, 46), M.trim)); foot.position.set(0, S.FLOOR + 3 + (-S.FLOOR - 104)/2, gz); scene.add(foot);
  const plate = iplate('N E U R O · S P E C T', 60, 9); plate.position.set(0, 96, gz + 16.4); scene.add(plate);
  S.blob(0, gz + 20, 320, 200);
  /* ---------- three gamma-camera heads ---------- */
  const colTex = immCanvasTex(512, 512, (x, w)=>{ x.fillStyle = '#56636a'; x.fillRect(0, 0, w, w); x.fillStyle = '#c7d0d5'; for (let j = 0; j < 46; j++) for (let i = 0; i < 40; i++){ const cx = i*12.8 + (j % 2)*6.4, cy = j*11.1; x.beginPath(); for (let k = 0; k < 6; k++){ const a = k/6*Math.PI*2 + Math.PI/6; x.lineTo(cx + 4.6*Math.cos(a), cy + 4.6*Math.sin(a)); } x.fill(); } });
  colTex.wrapS = colTex.wrapT = T.RepeatWrapping; colTex.repeat.set(2, 1.6);
  const headMat = new T.MeshPhysicalMaterial({color:0xd8e0e4, roughness:0.3, clearcoat:0.6});
  W.rot = new T.Group(); W.rot.position.z = 0; scene.add(W.rot); W.heads = [];
  for (let k = 0; k < 3; k++){
    const g = new T.Group(); g.rotation.z = Math.PI/2 + k*Math.PI*2/3; W.rot.add(g);   // local +x points at the patient's head from outside
    const hb = new T.Group(); g.add(hb);
    const body = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(24, 54, 5), {depth:42, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), headMat)); body.geometry.translate(12, 0, -21); hb.add(body);
    const face = new T.Mesh(new T.PlaneGeometry(42, 50), new T.MeshStandardMaterial({map:colTex, roughness:0.5, metalness:0.4})); face.rotation.y = -Math.PI/2; face.position.x = -2.2; hb.add(face);
    const edge = new T.Mesh(new T.BoxGeometry(1.2, 55, 43), new T.MeshStandardMaterial({color:0x0050ff, emissive:0x0050ff, emissiveIntensity:0.5})); edge.position.x = -1.2; hb.add(edge);
    const post = ishadow(new T.Mesh(new T.BoxGeometry(10, 12, 24), M.trim)); post.position.set(19, 0, -32); hb.add(post);
    const arm = ishadow(new T.Mesh(new T.BoxGeometry(1, 12, 8), M.trim)); arm.position.set(0, 0, -40); hb.add(arm); hb.userData.arm = arm;
    W.heads.push(hb);
  }
  W.setRadius = r => W.heads.forEach(hb=>{ hb.position.x = r; const L = 92 - (r + 24); hb.userData.arm.scale.x = Math.max(1, L); hb.userData.arm.position.x = 24 + L/2; });
  W.top = new T.Object3D(); W.heads[0].add(W.top); W.top.position.set(14, 0, 0);

  /* ---------- patient, brain, scalp ---------- */
  W.P = immTable(scene);
  const headMesh = W.P.man.j.head.children.find(c=>c.isMesh); W.headMat = W.P.mat.clone(); W.headMat.emissive = new T.Color(0x3dff9a); W.headMat.emissiveIntensity = 0; W.headMat.userData.linear = true; headMesh.material = W.headMat;
  W.ov = SPECT_OVERLAY(); W.brain = immBrain(W.P.mni, {overlay:W.ov, order:2});
  const skin = new T.MeshPhysicalMaterial({color:0xc9d6de, roughness:0.35, clearcoat:0.4, transparent:true, opacity:0, depthWrite:false});
  W.scalp = immScalp(W.P.mni, skin, {order:4});

  /* ---------- inside a camera head, magnified: collimator, crystal, photomultipliers ---------- */
  const ins = new T.Group(); ins.position.set(0, 47, 34); scene.add(ins); W.ins = ins; ins.visible = false;
  const lead = new T.MeshStandardMaterial({color:0x6f7b82, roughness:0.45, metalness:0.6, transparent:true});
  const hexG = new T.CylinderGeometry(0.52, 0.52, 3, 6, 1, true); const NH = 15*9;
  const hex = new T.InstancedMesh(hexG, new T.MeshStandardMaterial({color:0x56636a, roughness:0.5, metalness:0.6, side:T.DoubleSide, transparent:true}), NH);
  let k = 0; for (let j = 0; j < 9; j++) for (let i = 0; i < 15; i++){ m4.compose(new T.Vector3((i - 7)*0.9 + (j % 2)*0.45, 1.5, (j - 4)*0.78), new T.Quaternion(), new T.Vector3(1, 1, 1)); hex.setMatrixAt(k++, m4); }
  ins.add(hex);
  const slab = (w, h, d, y, mat) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.y = y; ins.add(m); return m; };
  W.cry = slab(14.4, 0.9, 7.6, 3.5, new T.MeshPhysicalMaterial({color:0x9ec4ff, roughness:0.1, transparent:true, opacity:0.55, emissive:0x2f6bff, emissiveIntensity:0}));
  slab(14.4, 0.6, 7.6, 4.3, new T.MeshPhysicalMaterial({color:0xffffff, roughness:0.05, transparent:true, opacity:0.25}));
  W.pmts = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++){ const g = new T.Group(); g.position.set((i - 2)*2.8, 4.6, (j - 0.5)*3.4); ins.add(g);
    const tubeM = new T.MeshStandardMaterial({color:0x2c363c, roughness:0.4, metalness:0.4, emissive:0x2f6bff, emissiveIntensity:0, transparent:true});
    const tb = new T.Mesh(new T.CylinderGeometry(1.15, 1.15, 3.6, 24), tubeM); tb.position.y = 1.8; g.add(tb);
    const dome = new T.Mesh(new T.SphereGeometry(1.15, 24, 12, 0, Math.PI*2, 0, Math.PI/2), new T.MeshPhysicalMaterial({color:0xd8f0ff, roughness:0.05, transparent:true, opacity:0.5})); dome.rotation.x = Math.PI; g.add(dome);
    W.pmts.push(tubeM); }
  slab(15, 0.6, 8.2, 8.6, new T.MeshStandardMaterial({color:0x1d6a4a, roughness:0.5, transparent:true}));
  // the source: tracer in the brain below, magnified
  W.src = []; const rs = rnd(31); for (let i = 0; i < 9; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xffa53a, transparent:true, opacity:0, depthWrite:false})); s.scale.setScalar(1.2); s.position.set((rs() - 0.5)*12, -7 - rs()*2, (rs() - 0.5)*5); ins.add(s); W.src.push(s); }
  W.NP = 40; const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(new Float32Array(W.NP*6), 3)); pg.setAttribute('color', new T.BufferAttribute(new Float32Array(W.NP*6), 3));
  W.phL = new T.LineSegments(pg, new T.LineBasicMaterial({vertexColors:true, transparent:true, depthWrite:false})); W.phL.frustumCulled = false; W.phL.renderOrder = 7; ins.add(W.phL);
  W.sparks = []; for (let i = 0; i < 10; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0x4d86ff, transparent:true, opacity:0, depthWrite:false})); s.scale.setScalar(2.6); s.renderOrder = 8; ins.add(s); W.sparks.push({s, t0:-9}); }
  W.phs = []; W.rp = rnd(77); W.lastPh = 0; W.counts = {em:0, pass:0};

  /* ---------- panels ---------- */
  const PN = immPanels(scene); W.sinoP = PN.make('PROJECTIONS · ONE ROW PER VIEW'); W.recP = PN.make('RECONSTRUCTED · HMPAO PERFUSION');
  W.env = {}; const withEnv = f => { const o = G.env; G.env = W.env; try { return f(); } finally { G.env = o; } };

  const cam = immCamPath(R, [
    [0.00, [-460, 140, 520], [0, -14, 20]],
    [0.09, [-340, 90, 450], [0, -10, 90]],
    [0.15, [-130, 50, 340], [0, -2, 215]],
    [0.24, [-110, 40, 300], [0, -2, 205]],
    [0.33, [-280, 80, 280], [0, -6, 30]],
    [0.40, [-150, 90, 180], [0, 30, 10]],
    [0.47, [-26, 52, 70], [0, 49, 34]],
    [0.58, [-20, 48, 64], [0, 48, 34]],
    [0.66, [-190, 120, 230], [0, 0, 0]],
    [0.76, [-70, 40, 170], [0, 0, 0]],
    [0.86, [-30, 24, 110], [0, 0, 0]],
    [1.00, [0, 14, 90], [0, 0, 0]],
  ], {drift:0.09});
  W.update = (p, t, dt) => {
    const P = W.P; W.brain.build(); W.scalp.build();
    cam(p, t, ilerp(34, 40, ismooth(0.44, 0.5, p)), p < 0.42 ? 6 : 1);
    R.saoOn = false;
    P.table.position.set(0, -22, ilerp(205, -16, ismooth(0.26, 0.34, p)));
    W.setRadius(ilerp(66, 44, ismooth(0.3, 0.37, p)));
    lightR.material.emissiveIntensity = 1.1 + 0.3*Math.sin(t*2.2);
    // tracer: the head glows as HMPAO is trapped
    const up = ismooth(0.13, 0.2, p);
    W.headMat.emissiveIntensity = 0.45*up*(1 - ismooth(0.3, 0.36, p));
    // step and shoot: 40 steps of 3° (three heads → 120 views)
    const s = ismooth(0.64, 0.76, p), x = s*40, stepped = Math.floor(x) + ismooth(0.65, 1, x - Math.floor(x));
    W.rot.rotation.z = -stepped*3*Math.PI/180;
    // inside view: inset visible, body fades
    const insA = iwin(p, 0.42, 0.46, 0.6, 0.63); ins.visible = insA > 0.01;
    ins.traverse(o=>{ if (o.isMesh && o.material && o.material.transparent){ o.material.opacity = (o.material.userData.base ?? (o.material.userData.base = o.material.opacity))*insA; } });
    hex.material.opacity = insA; lead.opacity = insA;
    const inside = ismooth(0.62, 0.7, p);
    P.fadeBody(Math.max(inside, 0.85*insA)); P.fadeTable(0.6*inside);
    { const m = W.headMat, a = Math.max(inside, 0.85*insA), f = a > 0.01; if (m.transparent !== f){ m.transparent = f; m.needsUpdate = true; } m.opacity = 1 - a; m.depthWrite = !f; }
    skin.opacity = 0.18*inside; if (W.scalp.mesh) W.scalp.mesh.visible = skin.opacity > 0.005;
    W.brain.set(inside*0.95); W.ov.uniforms.uHot.value = inside; W.ov.uniforms.uGlow.value = 0.22 + 0.1*Math.sin(t*1.5);
    // photons in the magnified head: most hit the lead septa, a few go straight through to the crystal
    const phOn = iwin(p, 0.49, 0.51, 0.6, 0.62);
    W.src.forEach((sp, i)=>{ sp.material.opacity = insA*(0.6 + 0.4*Math.sin(t*3 + i)); });
    if (phOn > 0.05 && (t - W.lastPh > 0.06 || W.lastPh > t)){ W.lastPh = t;
      const sp = W.src[Math.floor(W.rp()*W.src.length)], straight = W.rp() < 0.18, a = straight ? (W.rp() - 0.5)*0.03 : (W.rp() < 0.5 ? -1 : 1)*(0.12 + W.rp()*0.5), b = (W.rp() - 0.5)*0.4;
      const d = new T.Vector3(Math.sin(a), Math.cos(a), straight ? 0 : Math.sin(b)).normalize();
      const stopY = straight ? 3.2 : 0.2 + W.rp()*1.2; W.phs.push({o:sp.position.clone(), d, stop:(stopY - sp.position.y)/d.y, t0:t, pass:straight}); W.counts.em++; if (W.phs.length > W.NP) W.phs.shift(); }
    const pa = W.phL.geometry.attributes.position, ca = W.phL.geometry.attributes.color, v = new T.Vector3();
    W.phs = W.phs.filter(f=>t - f.t0 < 1.4);
    for (let i = 0; i < W.NP; i++){ const f = W.phs[i]; if (!f || phOn < 0.05){ for (let k2 = 0; k2 < 6; k2++){ pa.array[i*6 + k2] = 0; ca.array[i*6 + k2] = 0; } continue; }
      const L = Math.min(f.stop, (t - f.t0)*22), L0 = Math.max(0, L - 2.2), A = f.o.clone().addScaledVector(f.d, L0), B = f.o.clone().addScaledVector(f.d, L);
      const age = (t - f.t0)*22 - f.stop, fadeK = age > 0 ? Math.max(0, 1 - age/6) : 1;
      if (age > 0 && !f.hit){ f.hit = true; if (f.pass){ W.counts.pass++; const sk = W.sparks.find(q=>t - q.t0 > 0.5) || W.sparks[0]; sk.t0 = t; sk.s.position.copy(B); } }
      pa.array.set([A.x, A.y, A.z, B.x, B.y, B.z], i*6); const c = f.pass ? [1, 0.6, 0.15] : [0.5, 0.56, 0.6]; ca.array.set([c[0]*fadeK*phOn, c[1]*fadeK*phOn, c[2]*fadeK*phOn, c[0]*fadeK*phOn, c[1]*fadeK*phOn, c[2]*fadeK*phOn], i*6); }
    pa.needsUpdate = ca.needsUpdate = true; W.phL.visible = phOn > 0.01; W.phL.material.opacity = phOn;
    let glow = 0; W.sparks.forEach(q=>{ const f = 1 - (t - q.t0)/0.5; q.s.material.opacity = Math.max(0, f)*phOn; q.s.visible = f > 0; glow = Math.max(glow, f); });
    W.cry.material.emissiveIntensity = 0.8*Math.max(0, glow)*phOn; W.pmts.forEach((m, i)=>{ m.emissiveIntensity = 0.9*Math.max(0, glow)*phOn*(0.5 + 0.5*Math.sin(i*1.7)); });
    // panels: projections fill as the heads step round, then reconstruction
    const camO = R.camera, TT = p > 0.6 ? withEnv(()=>tomo('hmpao', 'normal')) : null;
    const sA = ismooth(0.645, 0.67, p), rA = ismooth(0.77, 0.79, p), hand = ismooth(0.93, 0.97, p);
    if (TT && sA > 0.002){
      const kk = Math.round(s*TT.nA);
      if (W.k !== kk){ W.k = kk; const c = W.sinoP.ctx; c.fillStyle = '#0a1016'; c.fillRect(0, 0, 256, 256); if (kk > 0) c.drawImage(TT.sinoCv, 0, 0, 128, kk, 0, 0, 256, 256*kk/TT.nA); if (kk < TT.nA){ c.fillStyle = 'rgba(95,141,255,.95)'; c.fillRect(0, 256*kk/TT.nA, 256, 2); } W.sinoP.dirty(); }
      const kr = Math.round(ismooth(0.78, 0.9, p)*TT.nA);
      if (W.kr !== kr){ W.kr = kr; withEnv(()=>tomoTo(TT, kr)); const f = Float32Array.from(TT.accF, v=>Math.max(0, v)); W.recCv = bufCanvas(f, TT.n, CM.spect, kr ? undefined : 1); W.hk = -1; }
      const hk = Math.round(ismooth(0.9, 0.94, p)*30);
      if (W.hk !== hk){ W.hk = hk; const c = W.recP.ctx; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); c.drawImage(W.recCv, 0, 0, 256, 256); const fin = hk ? scanCanvas('hmpao', 'normal') : null; if (fin){ c.globalAlpha = hk/30; c.drawImage(fin, 0, 0, 256, 256); c.globalAlpha = 1; } W.recP.dirty(); }
      if (rA < 0.002){ const land = camO.aspect >= 1.05; PN.place(W.sinoP, camO, land ? 0.3 : 0, land ? 0.06 : 0.18, land ? 0.46 : 0.5*Math.min(1, camO.aspect*1.4)); W.sinoP.show(sA); W.recP.show(0); }
      else PN.pair(W.sinoP, W.recP, camO, hand, sA, rA);
    } else { W.sinoP.show(0); W.recP.show(0); }
  };
  W.labels = p => {
    const a = iwin(p, 0.465, 0.48, 0.55, 0.57), b = iwin(p, 0.34, 0.36, 0.4, 0.42), c = iwin(p, 0.15, 0.17, 0.23, 0.25), d = iwin(p, 0.52, 0.53, 0.6, 0.615);
    const L = v => ins.localToWorld(v.clone());
    return [
      {pos:L(new T.Vector3(-6.8, 1.5, 3)), text:'Lead collimator · hexagonal holes', a, left:true},
      {pos:L(new T.Vector3(7.2, 3.5, 2)), text:'Sodium iodide crystal', a},
      {pos:L(new T.Vector3(5.6, 6.5, 1.7)), text:'Photomultiplier tubes', a},
      {pos:W.top.getWorldPosition(new T.Vector3()), text:'Gamma camera head', a:b},
      {pos:W.P.table.localToWorld(new T.Vector3(0, 22, 14)), text:'⁹⁹ᵐTc-HMPAO trapped by blood flow', a:c, left:true},
      {pos:L(new T.Vector3(0, -8, 0)), text:`${W.counts.pass} of ${W.counts.em} photons counted`, a:d},
    ];
  };
  immLinearize(scene);
  return W;
}
