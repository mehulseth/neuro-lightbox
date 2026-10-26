
// scalp potential (EEG) painted on the cap, plus a knitted-net look from a 3D grid
const EEG_CAP_OVERLAY = () => ({key:'eegcap', scale:'1.0', uniforms:{uSrc:{value:Array.from({length:6}, ()=>new THREE.Vector4(0, 0, 0, 40))}, uSrcA:{value:new Array(6).fill(0)}, uMap:{value:0}},
  decl:'uniform vec4 uSrc[6]; uniform float uSrcA[6]; uniform float uMap;' + GLSL_RAMPS,
  code:`float vE = 0.0; for (int i = 0; i < 6; i++){ vec3 dd = vMni - uSrc[i].xyz; vE += uSrcA[i]*exp(-dot(dd, dd)/(2.0*uSrc[i].w*uSrc[i].w)); }
    vec3 gq = abs(fract(vMni/8.0) - 0.5); float net = smoothstep(0.42, 0.5, max(gq.x, max(gq.y, gq.z)));
    vec3 mapC = iRdBu(vE); float iso = abs(fract(vE*5.0 + 0.5) - 0.5); float isoL = 1.0 - smoothstep(0.0, fwidth(vE*5.0)*1.4 + 1e-4, iso);
    diffuseColor.rgb = mix(diffuseColor.rgb*(1.0 - 0.3*net), mix(mapC, mapC*0.6, isoL*0.6), uMap);`});
// a glowing generator on the cortex (EEG and MEG)
const SRC_OVERLAY = (key) => ({key, uniforms:{uGen:{value:new THREE.Vector4(0, -92, 10, 14)}, uGenA:{value:0}, uGen2:{value:new THREE.Vector4(0, -92, 10, 14)}, uGen2A:{value:0}},
  decl:'uniform vec4 uGen, uGen2; uniform float uGenA, uGen2A;' + GLSL_RAMPS,
  code:`vec3 g1 = vMni - uGen.xyz, g2 = vMni - uGen2.xyz; float gv = uGenA*exp(-dot(g1, g1)/(2.0*uGen.w*uGen.w)) + uGen2A*exp(-dot(g2, g2)/(2.0*uGen2.w*uGen2.w));
    vec3 gC = mix(vec3(0.18,0.42,1.0), vec3(0.6,0.85,1.0), clamp(abs(gv) - 0.6, 0.0, 1.0)); float gM = clamp(abs(gv), 0.0, 1.0); diffuseColor.rgb = mix(diffuseColor.rgb, gC, gM*0.85);`,
  emit:`totalEmissiveRadiance += gC*gM*0.6;`});
function iarrow(T, len, r, color, o = {}){
  const g = new T.Group(), m = new T.MeshStandardMaterial({color, emissive:color, emissiveIntensity:o.glow ?? 0.5, roughness:0.4, transparent:true});
  const sh = new T.Mesh(new T.CylinderGeometry(r, r, len*0.72, 16), m); sh.position.y = len*0.36; g.add(sh);
  const hd = new T.Mesh(new T.ConeGeometry(r*2.6, len*0.28, 20), m); hd.position.y = len*0.86; g.add(hd);
  g.userData.mat = m; return g;
}

/* =====================================================================
   EEG walkthrough
     0.00 no scanner · 0.12 the 10–20 cap · 0.26 a core sample under C3 · 0.39 pyramidal cells in step
     0.53 millions together · 0.67 the skull smears it · 0.80 amplify the difference · 0.92 the trace
   ===================================================================== */
function buildEEG(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats();
  const S = immStudio(scene, renderer, {floor:0, shadow:220, target:[0, 60, 0]});
  /* ---------- a seated volunteer in a chair, real head, cap ---------- */
  const chairMat = new T.MeshPhysicalMaterial({color:0xe9eef0, roughness:0.35, clearcoat:0.5});
  scene.add(ichair(T, chairMat)); S.blob(0, 6, 120, 130);
  W.man = buildMannequin(T, {shadows:true}); poseSeated(W.man); scene.add(W.man.group);
  W.F = immSeatedHead(W.man);
  W.headMat = W.man.mat.clone(); W.headMat.userData.linear = true; W.headMat.side = T.FrontSide;
  W.scalp = immScalp(W.F, W.headMat, {order:1, shadow:true});
  W.capOv = EEG_CAP_OVERLAY();
  W.capMat = new T.MeshStandardMaterial({color:0x2a3d66, roughness:0.85, metalness:0, transparent:true, opacity:1}); immOverlay(W.capMat, W.capOv);
  W.cap = immScalp(W.F, W.capMat, {keep:icapKeep(-6, 0.12), offset:1.6, order:3});
  W.genOv = SRC_OVERLAY('eeggen'); W.brain = immBrain(W.F, {overlay:W.genOv, order:2});
  /* ---------- amplifier and monitor on a side table ---------- */
  const side = new T.Group(); side.position.set(78, 0, -10); side.rotation.y = -0.5; scene.add(side); W.side = side;
  const tTop = ishadow(new T.Mesh(new T.BoxGeometry(70, 3, 46), chairMat)); tTop.position.y = 72; side.add(tTop);
  for (const [x, z] of [[-31, -19], [31, -19], [-31, 19], [31, 19]]){ const l = ishadow(new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 70, 12), M.steel)); l.position.set(x, 35, z); side.add(l); }
  W.amp = ishadow(new T.Mesh(new T.BoxGeometry(22, 7, 16), M.dark)); W.amp.position.set(-18, 77.5, 6); side.add(W.amp);
  W.leds = []; for (let i = 0; i < 8; i++){ const l = new T.Mesh(new T.BoxGeometry(1.2, 0.8, 0.4), new T.MeshStandardMaterial({color:0x2f6bff, emissive:0x2f6bff, emissiveIntensity:0.8})); l.position.set(-25 + i*2, 78, 14.2); side.add(l); W.leds.push(l); }
  W.monCv = document.createElement('canvas'); W.monCv.width = 640; W.monCv.height = 400; W.monTex = new T.CanvasTexture(W.monCv); W.monTex.encoding = T.sRGBEncoding;
  const mon = new T.Group(); mon.position.set(12, 74, -4); side.add(mon); W.mon = mon;
  const scrM = new T.Mesh(new T.PlaneGeometry(44, 27.5), new T.MeshBasicMaterial({map:W.monTex, toneMapped:false})); scrM.position.set(0, 22, 0.8); mon.add(scrM);
  mon.add(ishadow(new T.Mesh(new T.BoxGeometry(46, 29.5, 1.4), M.dark))); mon.children[1].position.set(0, 22, 0);
  const neck = new T.Mesh(new T.BoxGeometry(4, 8, 2), M.steel); neck.position.set(0, 4, -1); mon.add(neck);
  W.monScr = scrM;
  /* ---------- a core sample through the head under C3, magnified ---------- */
  const core = new T.Group(); W.core = core; core.visible = false; W.F.add(core);
  const lay = (y0, y1, mat, r = 9) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, y0 - y1, 48), mat); m.position.y = (y0 + y1)/2; core.add(m); return m; };
  const LM = c => new T.MeshPhysicalMaterial({color:c, roughness:0.5, transparent:true});
  lay(6, 2.2, new T.MeshStandardMaterial({color:0xdfe6ea, roughness:0.25, metalness:0.6, transparent:true}), 6.5);
  W.gel = lay(2.2, 0, new T.MeshPhysicalMaterial({color:0x7fd4ff, roughness:0.05, transparent:true, opacity:0.6}), 7);
  lay(0, -6, LM(0xe9cfc0)); const boneTex = immCanvasTex(128, 128, (x, w)=>{ x.fillStyle = '#efe6d2'; x.fillRect(0, 0, w, w); x.fillStyle = '#d9cba9'; for (let i = 0; i < 90; i++){ x.beginPath(); x.arc(Math.random()*w, 30 + Math.random()*68, 2 + Math.random()*4, 0, 7); x.fill(); } });
  const bm = LM(0xffffff); bm.map = boneTex; lay(-6, -13, bm);
  lay(-13, -16, new T.MeshPhysicalMaterial({color:0xbfe0ff, roughness:0.1, transparent:true, opacity:0.5}));
  W.gm = lay(-16, -23, new T.MeshPhysicalMaterial({color:0xd9b8b0, roughness:0.6, transparent:true, opacity:0.4, depthWrite:false}));
  lay(-23, -31, LM(0xf3ece4));
  W.cells = []; const nm = new T.MeshStandardMaterial({color:0x6f7f88, roughness:0.45, emissive:0x2f6bff, emissiveIntensity:0, transparent:true});
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++){ const g = new T.Group(); g.position.set(i*4.6 + j*0.8, -21.6, j*4.2); core.add(g);
    const so = new T.Mesh(new T.ConeGeometry(0.9, 1.7, 14), nm); g.add(so); const ap = new T.Mesh(new T.CylinderGeometry(0.16, 0.26, 4.6, 8), nm); ap.position.y = 3.1; g.add(ap);
    for (const s of [-1, 1]){ const bd = new T.Mesh(new T.CylinderGeometry(0.1, 0.16, 1.6, 6), nm); bd.position.set(s*0.75, -1.1, 0); bd.rotation.z = s*0.85; g.add(bd); }
    const dots = []; for (let k = 0; k < 3; k++){ const d = new T.Mesh(new T.SphereGeometry(0.28, 10, 8), new T.MeshBasicMaterial({color:0x2f6bff, transparent:true, opacity:0})); g.add(d); dots.push(d); }
    W.cells.push({g, dots, ph:hashf(i*3 + j*7 + 11)}); }
  W.cellMat = nm;
  W.dip = iarrow(T, 9, 0.45, 0x0050ff, {glow:0.8}); W.dip.position.set(6.8, -22.8, 0); core.add(W.dip);
  /* ---------- the generator at the back of the brain (alpha) ---------- */
  W.gen = iarrow(T, 28, 1.2, 0x0050ff, {glow:0.9}); W.F.add(W.gen); W.gen.visible = false;
  W.gen.position.set(0, -86, 12); W.gen.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, -1, 0.15).normalize());
  /* ---------- electrodes and wires (built once the brain data has loaded) ---------- */
  W.elec = []; W.lazy = () => {
    if (W.elecBuilt || !META || !META.landmarks) return; W.elecBuilt = true;
    const E = META.landmarks.electrodes, c = new T.Vector3(0, -18, 5), house = new T.MeshPhysicalMaterial({color:0xf4f6f7, roughness:0.3, clearcoat:0.6}), rim = new T.MeshStandardMaterial({color:0x0050ff, emissive:0x0050ff, emissiveIntensity:0.4});
    const back = new T.Vector3(0, -118, -42), wireMats = [0xd9412b, 0xe8962a, 0x1d6a4a, 0x0050ff, 0x3d4c53].map(c=>new T.MeshStandardMaterial({color:c, roughness:0.5}));
    Object.entries(E).forEach(([nm, p], i)=>{ const e = mniV(p), n = e.clone().sub(c).normalize();
      const g = new T.Group(); g.position.copy(e).addScaledVector(n, 2.6); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); W.F.add(g);
      const h = ishadow(new T.Mesh(new T.CylinderGeometry(5.2, 5.8, 4.2, 28), house)); h.position.y = 2.1; g.add(h);
      const r = new T.Mesh(new T.TorusGeometry(5.6, 0.45, 8, 32), rim); r.rotation.x = Math.PI/2; r.position.y = 0.8; g.add(r);
      const pts = [e.clone().addScaledVector(n, 7), e.clone().addScaledVector(n, 22).lerp(back, 0.25), e.clone().addScaledVector(n, 18).lerp(back, 0.7), back];
      const wire = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.75, 5), wireMats[i % 5]); W.F.add(wire);
      W.elec.push({nm, pos:e.clone().addScaledVector(n, 7), g}); });
    // the bundled cable from the back of the head to the amplifier
    W.F.updateMatrixWorld(true); scene.updateMatrixWorld(true);
    const a = W.F.localToWorld(back.clone()), b = W.amp.getWorldPosition(new T.Vector3()).add(new T.Vector3(-4, 0, -8));
    const cable = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([a, a.clone().add(new T.Vector3(4, -26, -10)), new T.Vector3(a.x + 20, 84, a.z - 12), b]), 60, 0.9, 8), new T.MeshStandardMaterial({color:0x2c363c, roughness:0.5}));
    scene.add(cable);
    // core sample placement: C3, along its outward normal
    const e3 = mniV(E.C3); W.n3 = e3.clone().sub(c).normalize(); W.e3 = e3;
    core.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), W.n3);
  };
  /* ---------- panel: the trace ---------- */
  const PN = immPanels(scene); W.trP = PN.make('EEG · 8 CHANNELS · BIPOLAR', 512, 320); W.trP.keepLab = true;
  W.trace = (ctx, w, h, t, nch, dark) => {
    const ch = [3, 7, 11, 15, 16, 17, 1, 5].slice(0, nch), rows = ch.length, rh = (h - 26)/rows, sc = rh/120, N = 260, win = 4;
    ctx.fillStyle = dark ? '#0a1016' : '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = dark ? 'rgba(95,141,255,.18)' : 'rgba(12,22,27,.07)'; ctx.lineWidth = 1; for (let s = 1; s < 4; s++){ const x = 70 + (w - 70)*s/4; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 26); ctx.stroke(); }
    ctx.font = '15px monospace';
    ch.forEach((c, r)=>{ const y0 = rh*(r + 0.5) + 4; ctx.fillStyle = dark ? '#8d9ba1' : '#76858c'; ctx.fillText(MONTAGE[c][0] + '-' + MONTAGE[c][1], 6, y0 + 5);
      ctx.strokeStyle = dark ? (c >= 16 ? '#7fa6ff' : '#c8d4da') : (c >= 16 ? '#0050ff' : '#0c161b'); ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < N; i++){ const tt = t - win + win*i/N, V = eegElectrodes('alpha', tt), v = V[MONTAGE[c][0]] - V[MONTAGE[c][1]], x = 70 + (w - 70)*i/N, y = y0 - v*sc; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); });
    ctx.fillStyle = dark ? '#8d9ba1' : '#76858c'; ctx.fillText('1 s', w - 40, h - 6); ctx.fillText('eyes closed · alpha ≈ 10 Hz', 72, h - 6);
  };
  const H = new T.Vector3(0, 122, 1.6);
  const cam = immCamPath(R, [
    [0.00, [-250, 160, 330], [20, 82, 0]],
    [0.10, [-170, 150, 250], [16, 96, 0]],
    [0.17, [-46, 178, 70], [0, 122, 0]],
    [0.24, [26, 176, -46], [0, 122, 0]],
    [0.30, [-6, 148, 50], [10, 132, 2]],
    [0.37, [2, 138, 24], [10.8, 133.4, 2]],
    [0.44, [8, 135, 19], [9.4, 132.1, 2]],
    [0.51, [7, 134, 17], [9.4, 132.1, 2]],
    [0.58, [-26, 134, -46], [0, 121, -4]],
    [0.64, [-34, 140, -42], [0, 122, -3]],
    [0.74, [-40, 166, -50], [0, 124, -2]],
    [0.84, [10, 116, 72], [72, 88, -10]],
    [1.00, [20, 112, 62], [75, 92, -9]],
  ], {drift:0.08});
  W.update = (p, t, dt) => {
    W.scalp.build(); W.cap.build(); W.brain.build(); W.lazy();
    cam(p, t, ilerp(34, 40, ismooth(0.3, 0.4, p)), p < 0.3 ? 6 : 0.5);
    R.saoOn = false;
    // the core pops out of the head under C3 and grows
    const pop = ismooth(0.27, 0.34, p)*(1 - ismooth(0.52, 0.56, p)), coreA = iwin(p, 0.265, 0.29, 0.53, 0.56);
    core.visible = coreA > 0.01 && !!W.e3;
    if (W.e3){ core.position.copy(W.e3).addScaledVector(W.n3, 4 + 86*pop); core.scale.setScalar(ilerp(1, 2.6, pop)); }
    core.traverse(o=>{ if (o.material && o.material.transparent && o !== W.gm){ o.material.opacity = (o.material.userData.b ?? (o.material.userData.b = o.material.opacity))*coreA; } });
    W.gm.material.opacity = 0.4*coreA*(1 - 0.5*ismooth(0.4, 0.44, p));
    // pyramidal cells: out of step, then in step; currents run up the apical dendrites and a dipole appears
    const sync = ismooth(0.43, 0.48, p), zoomA = iwin(p, 0.385, 0.41, 0.52, 0.545);
    W.cells.forEach(c=>{ const ph = (t*1.6 + (1 - sync)*c.ph*3) % 1; c.dots.forEach((d, k)=>{ const u = (ph + k/3) % 1; d.position.y = -0.6 + u*5.4; d.material.opacity = zoomA*Math.sin(Math.PI*u)*0.95; d.visible = zoomA > 0.01; }); });
    W.cellMat.emissiveIntensity = 0.5*zoomA*(0.5 + 0.5*Math.sin(t*6)*sync);
    const dA = zoomA*ismooth(0.46, 0.5, p); W.dip.visible = dA > 0.01; W.dip.userData.mat.opacity = dA; W.dip.scale.y = 0.7 + 0.3*Math.abs(Math.sin(t*3));
    // millions together: the head clears, a patch of occipital cortex oscillates at 10 Hz
    const clear = iwin(p, 0.54, 0.58, 0.655, 0.69);
    ifade(W.headMat, 1 - clear, 0.12); W.capMat.opacity = 1 - 0.75*clear; W.capMat.depthWrite = clear < 0.01;
    W.elec.forEach(e=>{ e.g.visible = clear < 0.6; });
    W.brain.set(clear);
    const alpha = Math.sin(t*2*Math.PI*1.25)*(0.62 + 0.38*Math.sin(t*0.9));   // shown at 1.25 Hz so the eye can follow; real alpha is ~10 Hz
    W.genOv.uniforms.uGen.value.set(-14, -94, 10, 13); W.genOv.uniforms.uGen2.value.set(16, -94, 10, 13);
    W.genOv.uniforms.uGenA.value = W.genOv.uniforms.uGen2A.value = 1.4*alpha*clear;
    W.gen.visible = clear > 0.05; W.gen.userData.mat.opacity = clear; W.gen.scale.y = Math.max(0.05, Math.abs(alpha));
    W.gen.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, alpha >= 0 ? -1 : 1, alpha >= 0 ? 0.15 : -0.15).normalize());
    // the scalp map: broad and blurred, the same pattern the viewer shows
    const mapA = ismooth(0.64, 0.69, p)*(1 - ismooth(0.93, 0.97, p));
    if (mapA > 0.01 && META){ const src = eegSources('alpha', t*0.125 + 3); const U = W.capOv.uniforms;
      for (let i = 0; i < 6; i++){ const s = src[i]; if (s){ U.uSrc.value[i].set(s.p[0], s.p[1], s.p[2], s.s*1.15); U.uSrcA.value[i] = s.a/55; } else U.uSrcA.value[i] = 0; } }
    W.capOv.uniforms.uMap.value = mapA;
    W.leds.forEach((l, i)=>{ l.material.emissiveIntensity = 0.3 + 0.7*(0.5 + 0.5*Math.sin(t*9 + i)); });
    // monitor and final panel
    if (!W.lastMon || t - W.lastMon > 1/15){ W.lastMon = t; if (META){ W.trace(W.monCv.getContext('2d'), 640, 400, t, 8, true); W.monTex.needsUpdate = true; } }
    const camO = R.camera, fA = ismooth(0.92, 0.95, p);
    if (fA > 0.002 && META){ W.trace(W.trP.ctx, 512, 320, t, 8, false); W.trP.dirty(); const land = camO.aspect >= 1.05; PN.place(W.trP, camO, land ? 0.2*Math.min(1, camO.aspect - 0.6) : 0, land ? 0.06 : 0.2, land ? 0.66 : 0.82*camO.aspect*1.2); }
    W.trP.show(fA);
  };
  W.labels = p => {
    const a = iwin(p, 0.13, 0.15, 0.245, 0.26), L = v => W.F.localToWorld(v.clone());
    const out = W.elec.map(e=>({pos:L(e.pos), text:e.nm, a:a*(['C3','Cz','C4','Fz','Pz','O1','O2','F3','F4','P3','P4','T7','T8','Fp1','Fp2','F7','F8','P7','P8'].includes(e.nm) ? 1 : 0)}));
    const b = iwin(p, 0.31, 0.33, 0.38, 0.395), C = y => W.e3 ? core.localToWorld(new T.Vector3(9.5, y, 0)) : new T.Vector3();
    const c = iwin(p, 0.42, 0.45, 0.51, 0.53), d = iwin(p, 0.6, 0.62, 0.69, 0.72), e = iwin(p, 0.82, 0.84, 0.9, 0.92);
    out.push({pos:C(1.1), text:'Gel', a:b}, {pos:C(-3), text:'Scalp', a:b}, {pos:C(-9.5), text:'Skull', a:b}, {pos:C(-14.5), text:'CSF', a:b}, {pos:C(-19.5), text:'Grey matter', a:b}, {pos:C(-27), text:'White matter', a:b});
    out.push({pos:W.e3 ? core.localToWorld(new T.Vector3(6.8, -14, 0)) : new T.Vector3(), text:'Dipole: currents in step', a:c});
    out.push({pos:L(new T.Vector3(0, -100, 14)), text:'Visual cortex, alpha generator', a:d, left:true});
    out.push({pos:W.amp.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 4, 0)), text:'Differential amplifier', a:e, left:true});
    return out;
  };
  immLinearize(scene);
  return W;
}
