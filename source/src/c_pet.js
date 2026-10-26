
/* a white ring gantry with a bore (CT, PET): shell, bell mouths, liner, light ring, screen, name plate */
function immBoreGantry(scene, S, o){
  const T = THREE, M = o.M, G = {gan:new T.Group()}; scene.add(G.gan);
  const {w, h, d, bore} = o;
  const body = ishadow(new T.Mesh(new T.ExtrudeGeometry(iring(w, h, o.corner || 62, bore + 6), {depth:d, bevelEnabled:true, bevelThickness:6, bevelSize:6, bevelSegments:8, curveSegments:80}), M.shell));
  body.geometry.translate(0, 0, -d/2); G.gan.add(body);
  for (const s of [1, -1]){ const f = new T.Mesh(iflare(bore, bore + 9, 9), M.shell); f.scale.z = s; f.position.z = s*(d/2 + 6); G.gan.add(f); }
  const liner = new T.Mesh(new T.CylinderGeometry(bore, bore, d + 14, 96, 1, true), M.liner); liner.rotation.x = Math.PI/2; G.gan.add(liner);
  G.ringMat = new T.MeshStandardMaterial({color:0x0050ff, emissive:0x0050ff, emissiveIntensity:1.4, roughness:0.4});
  const ring = new T.Mesh(new T.TorusGeometry(bore + 10.5, 0.7, 12, 200), G.ringMat); ring.position.z = d/2 + 6.3; G.gan.add(ring);
  G.halo = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0x4d86ff, transparent:true, opacity:0.16, depthWrite:false, blending:T.AdditiveBlending})); G.halo.scale.set(118, 118, 1); G.halo.position.z = d/2 + 7; G.gan.add(G.halo);
  G.scr = iscreen(o.screen, 22, 13.75, 0.5); G.scr.position.set(-w*0.31, h*0.21, d/2 + 6.4); G.scr.rotation.y = 0.16; G.gan.add(G.scr);
  G.plate = iplate(o.plate, 50, 8); G.plate.position.set(0, h*0.38, d/2 + 6.4); G.gan.add(G.plate);
  const stand = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(w*0.75, d*0.7, 10), {depth:24, bevelEnabled:true, bevelThickness:3, bevelSize:3, bevelSegments:4}), M.plinth));
  stand.rotation.x = -Math.PI/2; stand.position.set(0, S.FLOOR, 12); scene.add(stand);
  const fh = -S.FLOOR - h/2 - 2, foot = ishadow(new T.Mesh(new T.BoxGeometry(w*0.55, fh, d*0.6), M.trim)); foot.position.set(0, S.FLOOR + 3 + fh/2, 0); scene.add(foot);
  S.blob(0, 10, w*1.5, d*3.2);
  G.clear = (c, floor = 0.06) => { for (const m of [M.shell, M.liner]) ifade(m, 1 - c, floor); G.scr.visible = G.plate.visible = c < 0.5; G.halo.material.opacity = 0.16*(1 - c); G.halo.visible = c < 0.99; };
  return G;
}
function immScanMats(){
  const T = THREE;
  return {
    shell: new T.MeshPhysicalMaterial({color:0xf3f5f6, roughness:0.24, clearcoat:0.85, clearcoatRoughness:0.1, side:T.DoubleSide}),
    trim: new T.MeshPhysicalMaterial({color:0xdde3e6, roughness:0.32, clearcoat:0.5}),
    dark: new T.MeshStandardMaterial({color:0x2c363c, roughness:0.45, metalness:0.35}),
    steel: new T.MeshStandardMaterial({color:0xaeb8be, roughness:0.28, metalness:0.9, side:T.DoubleSide}),
    plinth: new T.MeshStandardMaterial({color:0x56636a, roughness:0.45, metalness:0.2}),
    liner: new T.MeshStandardMaterial({color:0xe4e9ec, roughness:0.55, side:T.DoubleSide}),
  };
}
// FDG uptake painted on the cortex: the cavity-shaded base colour stands in for grey-matter density
const PET_OVERLAY = () => ({key:'pet', uniforms:{uHot:{value:0}, uGlow:{value:0}}, decl:'uniform float uHot, uGlow;' + GLSL_RAMPS,
  code:`float cHot = clamp((dot(vColor.rgb, vec3(0.333)) - 0.08)/0.62, 0.0, 1.0); vec3 hotC = iHot(0.18 + 0.58*pow(cHot, 1.3)); diffuseColor.rgb = mix(diffuseColor.rgb, hotC*0.85, uHot);`,
  emit:`totalEmissiveRadiance += hotC*uHot*uGlow*0.6;`});

/* =====================================================================
   PET walkthrough
     0.00 scanner · 0.11 tracer and uptake · 0.25 into the ring · 0.35 detector ring
     0.48 one decay (magnified) · 0.61 coincidence · 0.72 millions of lines · 0.84 reconstruction · 0.94 image
   ===================================================================== */
function buildPET(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats();
  const S = immStudio(scene, renderer);
  const BORE = 36, RR = 44;
  const GT = immBoreGantry(scene, S, {M, w:196, h:204, d:86, bore:BORE, screen:['PET · BRAIN', '¹⁸F-FDG  185 MBq', 'Uptake 45 min'], plate:'N E U R O · P E T'});
  /* ---------- detector ring: 4 rings × 48 blocks of LSO crystals, SiPMs and electronics behind ---------- */
  const inner = new T.Group(); GT.gan.add(inner); inner.visible = false;
  const nB = 48, nR = 4, cryTex = immCanvasTex(64, 64, (x, w)=>{ x.fillStyle = '#e9eef0'; x.fillRect(0, 0, w, w); x.strokeStyle = '#9aa6ad'; x.lineWidth = 2; for (let i = 0; i <= 8; i++){ x.beginPath(); x.moveTo(i*8, 0); x.lineTo(i*8, w); x.stroke(); x.beginPath(); x.moveTo(0, i*8); x.lineTo(w, i*8); x.stroke(); } });
  W.blocks = new T.InstancedMesh(new T.BoxGeometry(5.5, 3.0, 4.6), new T.MeshStandardMaterial({color:0xffffff, map:cryTex, roughness:0.35, metalness:0.2}), nB*nR);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
  for (let r = 0; r < nR; r++) for (let i = 0; i < nB; i++){ const a = (i + 0.5)/nB*Math.PI*2; q.setFromAxisAngle(new T.Vector3(0, 0, 1), a + Math.PI/2);
    m4.compose(new T.Vector3((RR + 1.5)*Math.cos(a), (RR + 1.5)*Math.sin(a), (r - 1.5)*4.9), q, new T.Vector3(1, 1, 1)); W.blocks.setMatrixAt(r*nB + i, m4); W.blocks.setColorAt(r*nB + i, col.setRGB(0.75, 0.78, 0.8)); }
  inner.add(W.blocks); W.lit = new Float32Array(nB*nR);
  const sipm = new T.Mesh(new T.CylinderGeometry(RR + 7, RR + 7, 22, 96, 1, true), new T.MeshStandardMaterial({color:0x22313a, roughness:0.4, metalness:0.5, side:T.DoubleSide})); sipm.rotation.x = Math.PI/2; inner.add(sipm);
  const shield = new T.Mesh(new T.RingGeometry(BORE + 2, RR + 12, 96), new T.MeshStandardMaterial({color:0x6f7b82, roughness:0.4, metalness:0.7, side:T.DoubleSide})); for (const z of [-13, 13]){ const s = shield.clone(); s.position.z = z; inner.add(s); }

  /* ---------- patient: a glowing head, the syringe and the tracer ---------- */
  W.P = immTable(scene);
  const headMesh = W.P.man.j.head.children.find(c=>c.isMesh); W.headMat = W.P.mat.clone(); W.headMat.emissive = new T.Color(0xff6a1a); W.headMat.emissiveIntensity = 0; W.headMat.userData.linear = true; headMesh.material = W.headMat;
  W.P.table.position.set(0, -22, 205); scene.updateMatrixWorld(true);
  const toTable = j => W.P.table.worldToLocal(W.P.man.j[j].getWorldPosition(new T.Vector3()));
  const wr = toTable('wristR'), el = toTable('elbowR'), sh = toTable('shoulderR'), nk = toTable('neck'), hd = toTable('head').add(new T.Vector3(0, 4, -6));
  W.flow = new T.CatmullRomCurve3([wr, el, sh, nk.clone().add(new T.Vector3(0, 2, 0)), hd]);
  W.syr = new T.Group(); W.syr.position.copy(wr).add(new T.Vector3(-9, 6, -4)); W.syr.rotation.set(0.2, 0, 0.9); W.P.table.add(W.syr);
  const tung = new T.Mesh(new T.CylinderGeometry(2.1, 2.1, 9, 32), M.dark); W.syr.add(tung);
  const barrel = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 5, 20), new T.MeshPhysicalMaterial({color:0xffffff, roughness:0.05, transmission:0, transparent:true, opacity:0.4})); barrel.position.y = 6.5; W.syr.add(barrel);
  W.liq = new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 4.2, 20), new T.MeshStandardMaterial({color:0xffa53a, emissive:0xff7a1a, emissiveIntensity:1.2})); W.liq.position.y = 6.3; W.syr.add(W.liq);
  const needle = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 6, 8), M.steel); needle.position.y = -7.5; W.syr.add(needle);
  W.drops = []; for (let i = 0; i < 36; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xff8a2a, transparent:true, opacity:0, depthWrite:false})); s.scale.setScalar(2.2); s.renderOrder = 7; W.P.table.add(s); W.drops.push(s); }
  W.headGlow = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xff7a2a, transparent:true, opacity:0, depthWrite:false, blending:T.AdditiveBlending})); W.headGlow.scale.setScalar(40); W.headGlow.position.copy(hd); W.P.table.add(W.headGlow);

  /* ---------- the brain with FDG uptake, and a see-through scalp ---------- */
  W.ov = PET_OVERLAY();
  W.brain = immBrain(W.P.mni, {overlay:W.ov, order:2});
  const skin = new T.MeshPhysicalMaterial({color:0xc9d6de, roughness:0.35, clearcoat:0.4, transparent:true, opacity:0, depthWrite:false});
  W.scalp = immScalp(W.P.mni, skin, {order:4});

  /* ---------- one decay, magnified: nucleus, positron track, electron, flash, two photons ---------- */
  W.D = W.P.mni.localToWorld(new T.Vector3(-22, 46, 38));   // just under the surface of the left frontal cortex (table not yet moved: recomputed below)
  const dec = new T.Group(); scene.add(dec); W.dec = dec;
  const nuc = new T.Group(); dec.add(nuc); const rr = rnd(5);
  for (let i = 0; i < 18; i++){ const u = rr()*2 - 1, th = rr()*Math.PI*2, r = 0.32*Math.cbrt(rr()), s = Math.sqrt(1 - u*u);
    const b = new T.Mesh(new T.SphereGeometry(0.17, 16, 12), new T.MeshStandardMaterial({color:i % 2 ? 0x9fadb3 : 0xd9412b, roughness:0.4, transparent:true})); b.position.set(r*s*Math.cos(th), r*s*Math.sin(th), r*u); nuc.add(b); }
  const track = []; let tp = new T.Vector3(0, 0, 0); const dir = new T.Vector3(0.6, 0.5, 0.4).normalize();
  for (let i = 0; i < 12; i++){ track.push(tp.clone()); tp = tp.clone().addScaledVector(dir, 0.34).add(new T.Vector3((rr() - 0.5)*0.5, (rr() - 0.5)*0.5, (rr() - 0.5)*0.5)); }
  track.push(tp.clone()); W.A = tp.clone();
  W.track = new T.Line(new T.BufferGeometry().setFromPoints(new T.CatmullRomCurve3(track).getPoints(120)), new T.LineDashedMaterial({color:0x0050ff, dashSize:0.12, gapSize:0.08, transparent:true}));
  W.track.computeLineDistances(); dec.add(W.track);
  W.trackCurve = new T.CatmullRomCurve3(track);
  W.pos = new T.Mesh(new T.SphereGeometry(0.13, 20, 14), new T.MeshStandardMaterial({color:0x2f6bff, emissive:0x0050ff, emissiveIntensity:0.8, transparent:true})); dec.add(W.pos);
  W.ele = new T.Mesh(new T.SphereGeometry(0.13, 20, 14), new T.MeshStandardMaterial({color:0x0c161b, roughness:0.3, transparent:true})); dec.add(W.ele);
  W.flash = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xffb24a, transparent:true, opacity:0, depthWrite:false})); W.flash.position.copy(W.A); dec.add(W.flash);
  W.ph = [iwiggle(T, 0xe8962a, 400), iwiggle(T, 0xe8962a, 400)]; W.ph.forEach(l=>{ l.material.linewidth = 2; scene.add(l); });
  W.lor = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), new T.LineBasicMaterial({color:0x0050ff, transparent:true, opacity:0, depthWrite:false})); W.lor.renderOrder = 6; W.lor.frustumCulled = false; scene.add(W.lor);
  W.hitA = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0x4d86ff, transparent:true, opacity:0, depthWrite:false})); W.hitB = W.hitA.clone(); W.hitB.material = W.hitA.material.clone(); W.hitA.scale.setScalar(9); W.hitB.scale.setScalar(9); scene.add(W.hitA, W.hitB);

  /* ---------- many coincidences ---------- */
  W.maxL = 90; const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(W.maxL*6), 3)); lg.setAttribute('color', new T.BufferAttribute(new Float32Array(W.maxL*6), 3));
  W.lines = new T.LineSegments(lg, new T.LineBasicMaterial({vertexColors:true, transparent:true, opacity:0.85, depthWrite:false})); W.lines.renderOrder = 6; W.lines.frustumCulled = false; scene.add(W.lines);
  W.flashes = []; for (let i = 0; i < 14; i++){ const s = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xffa53a, transparent:true, opacity:0, depthWrite:false})); s.scale.setScalar(2.2); s.renderOrder = 7; scene.add(s); W.flashes.push(s); }
  W.ev = []; W.n = 0; W.last = 0; W.rand = rnd(17);
  const hitRing = (o, d) => { const A = d.x*d.x + d.y*d.y, B = 2*(o.x*d.x + o.y*d.y), C = o.x*o.x + o.y*o.y - RR*RR, s = (-B + Math.sqrt(B*B - 4*A*C))/(2*A); return o.clone().addScaledVector(d, s); };
  const lightAt = P => { if (Math.abs(P.z) > 9.8) return; const ang = (Math.atan2(P.y, P.x) + Math.PI*2) % (Math.PI*2), i = Math.floor(ang/(Math.PI*2)*nB) % nB, r = Math.max(0, Math.min(nR - 1, Math.floor((P.z + 9.8)/4.9))); W.lit[r*nB + i] = 1; };
  W.vtmp = new T.Vector3();
  const sampleBrain = () => { const Mr = MESHRAW; if (!Mr) return null; for (let k = 0; k < 8; k++){ const i = Math.floor(W.rand()*Mr.nv), rg = Mr.reg[i]; if ((rg >= 97 && rg <= 98) || rg >= 117) continue; if (Mr.nrm[i*4 + 3] < 0) continue;
      return W.P.mni.localToWorld(W.vtmp.set(Mr.pos[i*3]/64, Mr.pos[i*3 + 1]/64, Mr.pos[i*3 + 2]/64).clone()); } return null; };

  /* ---------- reconstruction panels ---------- */
  const PN = immPanels(scene); W.lorP = PN.make('BACK-PROJECTED LINES'); W.imgP = PN.make('AFTER OSEM');
  W.env = {}; const withEnv = f => { const o = G_ENV_SWAP(W.env); try { return f(); } finally { G.env = o; } };

  const cam = immCamPath(R, [
    [0.00, [-470, 120, 560], [0, -14, 40]],
    [0.09, [-360, 90, 520], [0, -10, 140]],
    [0.14, [-120, 50, 330], [0, -2, 215]],
    [0.23, [-95, 34, 290], [0, -2, 205]],
    [0.31, [-300, 60, 300], [0, -10, 60]],
    [0.39, [-240, 160, 300], [0, 0, 0]],
    [0.46, [-90, 40, 250], [0, 0, 0]],
    [0.52, [-24, 22, 70], [2, 3, -3]],
    [0.58, [-6, 10, 6], [2, 4.4, -3.2]],
    [0.62, [-8, 16, 34], [2, 3, -3]],
    [0.68, [0, 16, 86], [0, 0, -3]],
    [0.72, [-6, 18, 88], [0, 0, -3]],
    [0.80, [-26, 24, 88], [0, 0, 0]],
    [0.90, [-14, 16, 76], [0, 0, 0]],
    [1.00, [0, 12, 68], [0, 0, 0]],
  ], {drift:0.09});
  const wp = new T.Vector3();
  W.update = (p, t, dt) => {
    const P = W.P; W.brain.build(); W.scalp.build();
    const near = p < 0.5 ? 6 : p < 0.66 ? 0.05 : 1;
    cam(p, t, ilerp(34, 44, ismooth(0.48, 0.56, p)), near);
    R.saoOn = false;
    const zt = ilerp(205, -16, ismooth(0.26, 0.34, p)); P.table.position.set(0, -22, zt);
    // tracer: syringe, droplets flowing up the arm to the head, the head warming up
    const inj = iwin(p, 0.10, 0.13, 0.235, 0.26), flow = ismooth(0.12, 0.22, p);
    W.syr.visible = inj > 0.01; W.liq.scale.y = Math.max(0.05, 1 - flow); W.liq.position.y = 6.3 - 2.1*flow;
    W.drops.forEach((s, i)=>{ const u = ((t*0.22 + i/W.drops.length) % 1), live = inj*ismooth(0.12, 0.14, p)*(1 - ismooth(0.21, 0.235, p)); s.position.copy(W.flow.getPoint(u)); s.material.opacity = live*Math.sin(Math.PI*u)*0.9; s.visible = live > 0.01; });
    const uptake = ismooth(0.15, 0.23, p);
    W.headMat.emissiveIntensity = 0.55*uptake*(1 - ismooth(0.3, 0.36, p)); W.headGlow.material.opacity = 0.35*uptake*(1 - ismooth(0.28, 0.34, p)); W.headGlow.visible = W.headGlow.material.opacity > 0.01;
    // ring revealed
    const clear = ismooth(0.36, 0.42, p); GT.clear(clear); inner.visible = clear > 0.01;
    GT.ringMat.emissiveIntensity = 1.2 + 0.8*ismooth(0.32, 0.35, p) + 0.3*Math.sin(t*2.2);
    // inside: body clears, brain glows
    const inside = ismooth(0.45, 0.52, p);
    P.fadeBody(inside); P.fadeTable(0.7*inside);
    for (const m of [W.headMat]){ const f = inside > 0.01; if (m.transparent !== f){ m.transparent = f; m.needsUpdate = true; } m.opacity = 1 - inside; m.depthWrite = !f; }
    skin.opacity = 0.18*inside*(1 - 0.6*ismooth(0.5, 0.56, p)); if (W.scalp.mesh) W.scalp.mesh.visible = skin.opacity > 0.005;
    W.brain.set(inside*(1 - 0.75*iwin(p, 0.53, 0.56, 0.6, 0.64)));
    W.ov.uniforms.uHot.value = inside; W.ov.uniforms.uGlow.value = 0.25 + 0.15*Math.sin(t*1.7);
    // the decay site follows the table
    P.table.updateMatrixWorld(true); P.mni.localToWorld(W.D.set(-22, 46, 38)); dec.position.copy(W.D);
    const u1 = ismooth(0.53, 0.585, p), u2 = ismooth(0.585, 0.68, p), decA = iwin(p, 0.5, 0.53, 0.66, 0.7);
    dec.visible = decA > 0.01;
    dec.traverse(o=>{ if (o.material && o !== W.flash && o.material.transparent !== undefined){ o.material.transparent = true; o.material.opacity = decA*(o === W.track ? 0.9 : 1); } });
    const run = Math.min(1, u1/0.85);
    W.track.geometry.setDrawRange(0, Math.floor(121*run)); W.trackCurve.getPoint(run, W.pos.position); W.pos.visible = u1 < 0.9;
    W.ele.position.copy(W.A).add(new T.Vector3(0.28*Math.cos(t*3), 0.2*Math.sin(t*2.3), 0.15)).lerp(W.A, ismooth(0.6, 0.85, u1)); W.ele.visible = u1 < 0.9;
    const fl = u1 > 0.82 ? Math.max(0, 1 - Math.abs(u1 - 0.95)/0.13) : 0; W.flash.material.opacity = Math.max(fl, u2 > 0 ? 0.6*(1 - ismooth(0, 0.3, u2)) : 0)*decA; W.flash.scale.setScalar(0.6 + 2.4*ismooth(0.82, 1, u1) + 6*u2);
    // two 511 keV photons fly apart across the transverse plane and hit the ring
    const A0 = dec.localToWorld(W.A.clone()), pd = new T.Vector3(Math.cos(0.62), Math.sin(0.62), 0.04).normalize(), HA = hitRing(A0, pd), HB = hitRing(A0, pd.clone().negate());
    const phA = (u1 > 0.97 ? 1 : 0)*iwin(p, 0.585, 0.59, 0.71, 0.74);
    W.ph.forEach((l, k)=>{ l.visible = phA > 0.01; l.material.opacity = phA; const H = k ? HB : HA, L = A0.distanceTo(H), lead = Math.min(1, u2*1.02), tail = Math.max(0, lead - 0.55);
      l.userData.set(A0, H, 0.18 + 0.004*L*0, L/1.1, t*24, tail, lead, new T.Vector3(0, 0, 1)); });
    const hit = ismooth(0.66, 0.69, p)*(1 - ismooth(0.72, 0.75, p));
    W.hitA.position.copy(HA); W.hitB.position.copy(HB); W.hitA.material.opacity = W.hitB.material.opacity = hit; W.hitA.visible = W.hitB.visible = hit > 0.01;
    W.lor.geometry.attributes.position.array.set([HA.x, HA.y, HA.z, HB.x, HB.y, HB.z]); W.lor.geometry.attributes.position.needsUpdate = true; W.lor.material.opacity = ismooth(0.665, 0.69, p)*(1 - ismooth(0.74, 0.77, p)); W.lor.visible = W.lor.material.opacity > 0.01;
    if (hit > 0.5){ lightAt(HA); lightAt(HB); }
    // a stream of coincidences
    const many = iwin(p, 0.72, 0.74, 0.86, 0.9);
    if (W.last > t) W.last = t;
    for (let kk = 0; many > 0.05 && MESHRAW && t - W.last > 0.035 && kk < 4; kk++){ W.last += 0.035; if (t - W.last > 0.5) W.last = t;
      const o = sampleBrain(); if (o){ const a = W.rand()*Math.PI*2, d = new T.Vector3(Math.cos(a), Math.sin(a), (W.rand() - 0.5)*0.2).normalize(), A = hitRing(o, d), B = hitRing(o, d.clone().negate());
        W.ev.push({A, B, o, at:t}); if (W.ev.length > W.maxL) W.ev.shift(); W.n++; lightAt(A); lightAt(B); if (IMM.visible) sndClick(0.6); } }
    W.ev = W.ev.filter(e=>t - e.at < 0.9 && t >= e.at);
    const pa = W.lines.geometry.attributes.position, ca = W.lines.geometry.attributes.color;
    for (let i = 0; i < W.maxL; i++){ const e = W.ev[i]; if (!e || many < 0.05){ for (let k = 0; k < 6; k++){ pa.array[i*6 + k] = 0; ca.array[i*6 + k] = 0; } continue; }
      const f = (1 - (t - e.at)/0.9)*many; pa.array.set([e.A.x, e.A.y, e.A.z, e.B.x, e.B.y, e.B.z], i*6); const r = 0.94 - 0.9*f, g2 = 0.95 - 0.66*f; ca.array.set([r, g2, 0.98, r, g2, 0.98], i*6); }
    pa.needsUpdate = true; ca.needsUpdate = true; W.lines.visible = many > 0.01;
    W.flashes.forEach((s, i)=>{ const e = W.ev[W.ev.length - 1 - i]; if (!e || many < 0.05){ s.material.opacity = 0; s.visible = false; return; } const f = 1 - (t - e.at)/0.35; s.visible = f > 0; s.material.opacity = Math.max(0, f)*many; s.position.copy(e.o); });
    const base = new T.Color(0.75, 0.78, 0.8), hot = new T.Color(0.18, 0.42, 1.0);
    for (let k = 0; k < W.lit.length; k++){ W.blocks.setColorAt(k, col.copy(base).lerp(hot, W.lit[k])); W.lit[k] *= Math.pow(0.04, dt); }
    W.blocks.instanceColor.needsUpdate = true;
    // reconstruction
    const pA = ismooth(0.835, 0.86, p), hand = ismooth(0.93, 0.97, p), camO = R.camera;
    if (pA > 0.002){
      const Ps = withEnv(()=>petSampler());
      if (Ps){ const target = Math.round(ismooth(0.84, 0.92, p)*60000); if (target < Ps.count){ Ps.acc.fill(0); Ps.count = 0; } withEnv(()=>petAdd(Ps, Math.min(target, Ps.count + 4000)));
        if (W.pc !== Ps.count){ W.pc = Ps.count; const c = W.lorP.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); c.drawImage(bufCanvas(Ps.acc, Ps.n, CM.hot), 0, 0, 256, 256); W.lorP.dirty(); }
        const ia = Math.round(ismooth(0.88, 0.93, p)*30) + 31*Math.round(hand*30);
        if (W.ia !== ia){ W.ia = ia; const c = W.imgP.ctx; c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); const fdg = scanCanvas('fdg', 'normal'); if (fdg){ c.globalAlpha = ismooth(0.88, 0.93, p); c.drawImage(fdg, 0, 0, 256, 256); c.globalAlpha = 1; } W.imgP.dirty(); } }
      PN.pair(W.lorP, W.imgP, camO, hand, pA, pA);
    } else { W.lorP.show(0); W.imgP.show(0); }
  };
  W.labels = p => {
    const a = iwin(p, 0.4, 0.42, 0.46, 0.48), b = iwin(p, 0.135, 0.15, 0.22, 0.24), c = iwin(p, 0.54, 0.555, 0.6, 0.62), d = iwin(p, 0.665, 0.68, 0.72, 0.74), e = iwin(p, 0.745, 0.76, 0.84, 0.86);
    const ang = -0.7, onRing = new T.Vector3((RR + 2)*Math.cos(ang), (RR + 2)*Math.sin(ang), 9);
    const tw = v => W.P.table.localToWorld(v.clone());
    const A0 = dec.localToWorld(W.A.clone());
    return [
      {pos:onRing, text:'LSO crystal blocks · 4 rings', a},
      {pos:new T.Vector3(-(RR + 8), 6, 11), text:'Silicon photomultipliers', a, left:true},
      {pos:tw(W.syr.position), text:'¹⁸F-FDG in a tungsten shield', a:b},
      {pos:tw(W.flow.getPoint(1)), text:'Tracer collects in the brain', a:b, left:true},
      {pos:dec.localToWorld(new T.Vector3(0, 0, 0)), text:'¹⁸F nucleus', a:c, left:true},
      {pos:dec.localToWorld(W.trackCurve.getPoint(0.45)), text:'positron · range ≈ 0.6 mm (magnified)', a:c},
      {pos:A0.clone().add(new T.Vector3(0, 0, 0)), text:'annihilation → 2 × 511 keV', a:d},
      {pos:new T.Vector3(0, RR + 2, -2), text:`${W.n.toLocaleString('en-GB')} coincidences`, a:e},
    ];
  };
  immLinearize(scene);
  return W;
}
const G_ENV_SWAP = env => { const o = G.env; G.env = env; return o; };
