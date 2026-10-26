
/* =====================================================================
   CT walkthrough
     0.00 suite · 0.10 table in · 0.24 cover clears, the drum inside
     0.38 helical scan · 0.52 into the gantry, fan through the head
     0.63 detector profile · 0.73 sinogram · 0.84 back-projection · 0.94 the slice
   ===================================================================== */
function buildCT(scene, renderer, R){
  const T = THREE, W = {}, SIG = 0x0050ff;
  const S = immStudio(scene, renderer);
  const M = {
    shell: new T.MeshPhysicalMaterial({color:0xf3f5f6, roughness:0.24, clearcoat:0.85, clearcoatRoughness:0.1, side:T.DoubleSide}),
    trim: new T.MeshPhysicalMaterial({color:0xdde3e6, roughness:0.32, clearcoat:0.5}),
    dark: new T.MeshStandardMaterial({color:0x2c363c, roughness:0.45, metalness:0.35}),
    steel: new T.MeshStandardMaterial({color:0xaeb8be, roughness:0.28, metalness:0.9, side:T.DoubleSide}),
    plinth: new T.MeshStandardMaterial({color:0x56636a, roughness:0.45, metalness:0.2}),
    det: new T.MeshStandardMaterial({color:0xffffff, roughness:0.35, metalness:0.3}),
    liner: new T.MeshStandardMaterial({color:0xe4e9ec, roughness:0.55, side:T.DoubleSide}),
  };
  /* ---------- gantry: a short ring, 74 cm bore ---------- */
  const GW = 200, GH = 206, GD = 62, BORE = 37;
  const gan = new T.Group(); scene.add(gan); W.gan = gan;
  const body = ishadow(new T.Mesh(new T.ExtrudeGeometry(iring(GW, GH, 64, BORE + 6), {depth:GD, bevelEnabled:true, bevelThickness:6, bevelSize:6, bevelSegments:8, curveSegments:80}), M.shell));
  body.geometry.translate(0, 0, -GD/2); gan.add(body);
  const shellParts = [body];
  for (const s of [1, -1]){ const f = new T.Mesh(iflare(BORE, BORE + 9, 9), M.shell); f.scale.z = s; f.position.z = s*(GD/2 + 6); gan.add(f); shellParts.push(f); }
  const liner = new T.Mesh(new T.CylinderGeometry(BORE, BORE, GD + 14, 96, 1, true), M.liner); liner.rotation.x = Math.PI/2; gan.add(liner); shellParts.push(liner);
  W.ringMat = new T.MeshStandardMaterial({color:SIG, emissive:SIG, emissiveIntensity:1.4, roughness:0.4});
  const ring = new T.Mesh(new T.TorusGeometry(BORE + 10.5, 0.7, 12, 200), W.ringMat); ring.position.z = GD/2 + 6.3; gan.add(ring);
  W.halo = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0x4d86ff, transparent:true, opacity:0.16, depthWrite:false, blending:T.AdditiveBlending})); W.halo.scale.set(120, 120, 1); W.halo.position.z = GD/2 + 7; gan.add(W.halo);
  const scr = iscreen(['HEAD · HELICAL', 'Routine brain', '120 kV  250 mAs'], 22, 13.75, 0.4); scr.position.set(-62, 44, GD/2 + 6.4); scr.rotation.y = 0.16; gan.add(scr); shellParts.push(...scr.children);
  const plate = iplate('N E U R O · C T', 50, 8); plate.position.set(0, 78, GD/2 + 6.4); gan.add(plate); shellParts.push(plate);
  const stand = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(150, 40, 10), {depth:24, bevelEnabled:true, bevelThickness:3, bevelSize:3, bevelSegments:4}), M.plinth));
  stand.rotation.x = -Math.PI/2; stand.position.set(0, S.FLOOR, 12); scene.add(stand);
  const foot = ishadow(new T.Mesh(new T.BoxGeometry(110, S.FLOOR*-1 - GH/2 - 2, 40), M.trim)); foot.position.set(0, (S.FLOOR + (-GH/2 - 4))/2 + 4, 0); scene.add(foot);
  S.blob(0, 10, 300, 200);

  /* ---------- the rotating drum (revealed when the cover clears) ---------- */
  const drum = new T.Group(); gan.add(drum); W.drum = drum;
  const slip = new T.Mesh(new T.CylinderGeometry(88, 88, 30, 128, 1, true), M.steel); slip.rotation.x = Math.PI/2; drum.add(slip);
  const disc = new T.Mesh(new T.RingGeometry(BORE + 4, 88, 128), new T.MeshStandardMaterial({color:0x8d999f, roughness:0.4, metalness:0.7, side:T.DoubleSide})); disc.position.z = -15; drum.add(disc);
  for (let i = 0; i < 6; i++){ const a = i/6*Math.PI*2 + 0.5, b = new T.Mesh(new T.BoxGeometry(22, 12, 18), i % 2 ? M.dark : M.plinth); b.position.set(74*Math.cos(a), 74*Math.sin(a), -4); b.rotation.z = a; if (Math.abs(Math.sin(a) - 1) > 0.3 && Math.abs(Math.sin(a) + 1) > 0.3) drum.add(b); }
  const tube = new T.Group(); tube.position.set(0, 64, 0); drum.add(tube); W.tube = tube;
  const tb = new T.Mesh(new T.CylinderGeometry(10, 10, 38, 40), M.dark); tb.rotation.z = Math.PI/2; tube.add(tb);
  for (const s of [-1, 1]){ const cap = new T.Mesh(new T.CylinderGeometry(10.6, 10.6, 3, 40), M.steel); cap.rotation.z = Math.PI/2; cap.position.x = s*19; tube.add(cap); }
  const coll = new T.Mesh(new T.BoxGeometry(14, 8, 14), M.steel); coll.position.y = -12; tube.add(coll);
  W.focal = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0xffb24a, transparent:true, opacity:0.95, depthWrite:false})); W.focal.scale.set(9, 9, 1); W.focal.position.y = -17; tube.add(W.focal);
  // detector arc: 72 modules on a 118 cm radius about the focal spot (focal at y = 47)
  const FY = 47, RF = 118, ND = 72, A0 = 0.43;
  W.det = new T.InstancedMesh(new T.BoxGeometry(3.4, 3.6, 5.2), M.det, ND); const m4 = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
  for (let i = 0; i < ND; i++){ const a = -A0 + 2*A0*(i + 0.5)/ND; q.setFromAxisAngle(new T.Vector3(0, 0, 1), a); m4.compose(new T.Vector3(RF*Math.sin(a), FY - RF*Math.cos(a), 0), q, new T.Vector3(1, 1, 1)); W.det.setMatrixAt(i, m4); W.det.setColorAt(i, col.setRGB(0.05, 0.12, 0.35)); }
  drum.add(W.det);
  const das = new T.Mesh(new T.BoxGeometry(70, 8, 16), M.dark); das.position.set(0, FY - RF - 6, -2); drum.add(das);
  W.detC = new T.Object3D(); W.detC.position.set(0, FY - RF, 0); drum.add(W.detC);
  // the fan beam: a thin wedge, 4 cm thick (64 rows × 0.625 mm)
  const fan = new T.Shape(); fan.moveTo(0, FY); for (let i = 0; i <= 32; i++){ const a = -A0 + 2*A0*i/32; fan.lineTo((RF - 2)*Math.sin(a), FY - (RF - 2)*Math.cos(a)); } fan.lineTo(0, FY);
  W.fanMat = new T.MeshBasicMaterial({color:0x3d7bff, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
  W.fan = new T.Mesh(new T.ExtrudeGeometry(fan, {depth:4, bevelEnabled:false, curveSegments:4}), W.fanMat); W.fan.position.z = -2; W.fan.renderOrder = 5; drum.add(W.fan);
  W.rays = []; for (let i = 0; i < 9; i++){ const a = -A0*0.9 + 1.8*A0*i/8, g = new T.BufferGeometry().setFromPoints([new T.Vector3(0, FY, 0), new T.Vector3((RF - 3)*Math.sin(a), FY - (RF - 3)*Math.cos(a), 0)]);
    const l = new T.Line(g, new T.LineBasicMaterial({color:0x0050ff, transparent:true, opacity:0, depthWrite:false})); l.renderOrder = 6; drum.add(l); W.rays.push(l); }
  W.inner = [drum];
  drum.visible = false;

  /* ---------- patient, scalp, skull and brain ---------- */
  W.P = immTable(scene);
  const skin = new T.MeshPhysicalMaterial({color:0xc9d6de, roughness:0.35, clearcoat:0.4, transparent:true, opacity:0, depthWrite:false});
  W.scalp = immScalp(W.P.mni, skin, {order:4});
  W.boneMat = new T.MeshStandardMaterial({color:0xf2ead8, roughness:0.6, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
  W.skull = immScalp(W.P.mni, W.boneMat, {shrink:0.93, order:3});
  W.brain = immBrain(W.P.mni, {order:2});
  // helix: the path of the beam through the head during a helical scan (5 turns, 4 cm per turn)
  const hp = []; for (let i = 0; i <= 600; i++){ const u = i/600, a = u*5*Math.PI*2; hp.push(new T.Vector3(16*Math.sin(a), 20 + 16*Math.cos(a), 26 - u*20)); }
  W.helix = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(hp), 900, 0.32, 6), new T.MeshBasicMaterial({color:SIG, transparent:true, opacity:0.9})); W.helix.renderOrder = 6; W.P.table.add(W.helix); W.helix.visible = false;
  W.helixN = W.helix.geometry.index.count;

  /* ---------- panels: detector profile, sinogram, reconstruction ---------- */
  const PN = immPanels(scene);
  W.prof = PN.make('DETECTOR READING · ONE ANGLE', 512, 256);
  W.sino = PN.make('SINOGRAM · ANGLE ↓', 256, 256);
  W.recon = PN.make('FILTERED BACK-PROJECTION', 256, 256);
  W.env = {};
  W.T = () => { if (W.TT) return W.TT; const o = G.env; G.env = W.env; try { W.TT = tomo('ctb', 'normal'); } finally { G.env = o; } return W.TT; };

  const cam = immCamPath(R, [
    [0.00, [-470, 120, 560], [0, -14, 40]],
    [0.09, [-400, 70, 470], [0, -14, 40]],
    [0.20, [-300, 30, 300], [0, -18, 60]],
    [0.29, [-250, 170, 330], [0, 0, 0]],
    [0.37, [-70, 40, 300], [0, 0, 0]],
    [0.47, [-200, 110, 230], [0, 0, 10]],
    [0.56, [-70, 46, 118], [0, -2, 0]],
    [0.63, [-46, 30, 62], [0, -2, 0]],
    [0.70, [-16, 24, 60], [0, -1, 0]],
    [0.76, [-10, 20, 58], [0, -1, 0]],
    [0.86, [-6, 14, 50], [0, -1, 0]],
    [1.00, [0, 10, 44], [0, -1, 0]],
  ], {drift:0.09});

  let phase = 0;
  W.update = (p, t, dt) => {
    const P = W.P;
    W.brain.build(); W.scalp.build(); W.skull.build();
    cam(p, t, ilerp(34, 46, ismooth(0.52, 0.64, p)), p < 0.55 ? 6 : 1);
    R.saoOn = false;
    // table: in, then a helical pass from skull base to vertex, then back to centre the slice on the brain
    const zIn = ilerp(205, -24.5, ismooth(0.10, 0.22, p)), zHel = ilerp(-24.5, -4.5, ismooth(0.40, 0.50, p)), zBack = ilerp(-4.5, -15.5, ismooth(0.52, 0.60, p));
    P.table.position.set(0, -22, p < 0.38 ? zIn : p < 0.51 ? zHel : zBack);
    // cover clears to show the drum; it stays faint while we are inside
    const clear = ismooth(0.25, 0.31, p);
    for (const m of [M.shell, M.liner]) ifade(m, 1 - clear, 0.06);
    scr.visible = plate.visible = clear < 0.5;
    drum.visible = clear > 0.01;
    W.halo.material.opacity = 0.16*(1 - clear); W.halo.visible = clear < 0.99;
    W.ringMat.emissiveIntensity = 1.2 + 0.8*ismooth(0.22, 0.25, p) + 0.3*Math.sin(t*2.2);
    // drum speed: slow while revealed, fast during the helical scan, then parked and driven by scroll
    const w = 1.1*iwin(p, 0.25, 0.3, 0.38, 0.4) + 3.6*iwin(p, 0.38, 0.41, 0.53, 0.58) + 1.0*iwin(p, 0.5, 0.53, 0.6, 0.62);
    phase += w*dt;
    const sweep = ismooth(0.73, 0.83, p), scrollA = -Math.PI*sweep, mix = ismooth(0.6, 0.66, p);
    const ang = scrollA + (1 - mix)*iwrap(phase - scrollA);
    drum.rotation.z = ang;
    const beam = ismooth(0.33, 0.38, p)*(1 - ismooth(0.93, 0.97, p));
    W.fanMat.opacity = (0.16 - 0.08*ismooth(0.62, 0.7, p))*beam*(0.8 + 0.2*Math.sin(t*20)); W.fan.visible = beam > 0.01;
    W.focal.material.opacity = 0.3 + 0.65*beam;
    // helix grows as the table moves
    const hel = ismooth(0.40, 0.50, p), helA = iwin(p, 0.39, 0.41, 0.53, 0.58);
    W.helix.visible = helA > 0.01; W.helix.material.opacity = 0.9*helA; W.helix.geometry.setDrawRange(0, Math.floor(W.helixN*hel/6)*6);
    // inside: body clears, scalp and skull glass, brain
    const inside = ismooth(0.53, 0.62, p);
    P.fadeBody(inside); P.fadeTable(0.7*inside);
    skin.opacity = 0.22*inside; W.scalp.mesh && (W.scalp.mesh.visible = inside > 0.01);
    W.boneMat.opacity = 0.28*inside; W.skull.mesh && (W.skull.mesh.visible = inside > 0.01);
    W.brain.set(inside*0.95);
    // detector profile: transmitted intensity from the real CT slice, for the current angle
    const TT = inside > 0.2 ? W.T() : null;
    let row = null;
    if (TT){ let th = (-ang) % (2*Math.PI); if (th < 0) th += 2*Math.PI; const flip = th >= Math.PI; if (flip) th -= Math.PI;
      const a = Math.min(TT.nA - 1, Math.round(th/Math.PI*TT.nA)), n = TT.n; row = new Float32Array(n); let mx = 1e-6; for (let d = 0; d < n; d++){ const v = TT.sino[a*n + (flip ? n - 1 - d : d)]; row[d] = v; if (v > mx) mx = v; }
      for (let d = 0; d < n; d++) row[d] = Math.exp(-1.3*row[d]/mx); W.rowA = a; }
    const detA = beam;
    for (let i = 0; i < ND; i++){ const a = -A0 + 2*A0*(i + 0.5)/ND, s = 470*Math.tan(a)/(216/128) + 64; let v = 1;
      if (row && inside > 0.2){ const d = Math.round(s); v = d >= 0 && d < 128 ? row[d] : 1; } else v = 0.9 + 0.1*Math.sin(i*0.7 + t*6);
      W.det.setColorAt(i, col.setRGB(0.05 + 0.25*v*detA, 0.12 + 0.55*v*detA, 0.35 + 0.65*v*detA)); }
    W.det.instanceColor.needsUpdate = true;
    const rayA = iwin(p, 0.6, 0.64, 0.72, 0.76); W.rays.forEach(l=>{ l.visible = rayA > 0.01; l.material.opacity = 0.7*rayA; });
    // panels
    const camO = R.camera;
    const profA = iwin(p, 0.635, 0.66, 0.73, 0.75);
    if (profA > 0.002 && row){ const c = W.prof.ctx, Wd = 512, H = 256; c.fillStyle = '#0a1016'; c.fillRect(0, 0, Wd, H);
      c.strokeStyle = 'rgba(95,141,255,.25)'; c.lineWidth = 1; for (let k = 1; k < 4; k++){ c.beginPath(); c.moveTo(0, H*k/4); c.lineTo(Wd, H*k/4); c.stroke(); }
      c.strokeStyle = '#7fa6ff'; c.lineWidth = 3; c.beginPath(); for (let d = 0; d < 128; d++){ const x = 16 + d/127*(Wd - 32), y = H - 24 - row[d]*(H - 56); d ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.fillStyle = '#c8d4da'; c.font = '20px monospace'; c.fillText('I/I₀', 16, 28); c.fillText('detector →', Wd - 140, H - 4); W.prof.dirty(); }
    if (profA > 0.002) PN.place(W.prof, camO, camO.aspect > 1.05 ? 0.18*Math.min(1, camO.aspect - 0.8) : 0, camO.aspect > 1.05 ? 0.19 : 0.26, camO.aspect > 1.05 ? 0.62 : 0.6*camO.aspect);
    W.prof.show(profA);
    const pA = ismooth(0.725, 0.75, p), hand = ismooth(0.93, 0.97, p);
    W.sino.g.visible = W.recon.g.visible = pA > 0.002;
    if (pA > 0.002 && TT){
      const k = Math.round(sweep*TT.nA);
      if (W.k !== k){ W.k = k; const c = W.sino.ctx; c.fillStyle = '#0a1016'; c.fillRect(0, 0, 256, 256); if (k > 0) c.drawImage(TT.sinoCv, 0, 0, 128, k, 0, 0, 256, 256*k/TT.nA);
        if (k < TT.nA){ c.fillStyle = 'rgba(95,141,255,.95)'; c.fillRect(0, 256*k/TT.nA, 256, 2); } W.sino.dirty(); }
      const kr = Math.round(ismooth(0.84, 0.93, p)*TT.nA);
      if (W.kr !== kr){ W.kr = kr; tomoTo(TT, kr); const f = Float32Array.from(TT.accF, v=>Math.max(0, v)); W.reconCv = bufCanvas(f, TT.n, CM.gray, kr ? undefined : 1); W.handK = -1; }
      const hk = Math.round(hand*40);
      if (W.handK !== hk){ W.handK = hk; const c = W.recon.ctx; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256); c.drawImage(W.reconCv, 0, 0, 256, 256);
        const fin = hk ? scanCanvas('ctb', 'normal') : null; if (fin){ c.globalAlpha = hk/40; c.drawImage(fin, 0, 0, 256, 256); c.globalAlpha = 1; } W.recon.dirty(); }
      PN.pair(W.sino, W.recon, camO, hand, pA, ismooth(0.83, 0.85, p));
    } else { W.sino.show(0); W.recon.show(0); }
  };
  W.labels = p => {
    const a = iwin(p, 0.3, 0.32, 0.37, 0.385), b = iwin(p, 0.12, 0.15, 0.21, 0.235), c = iwin(p, 0.54, 0.57, 0.62, 0.635);
    const wp = o => o.getWorldPosition(new T.Vector3());
    return [
      {pos:wp(W.tube), text:'X-ray tube', a},
      {pos:wp(W.detC), text:'Detector array', a, left:true},
      {pos:new T.Vector3(-62, 62, 16), text:'Slip ring: power while spinning', a, left:true},
      {pos:new T.Vector3(0, 0, 40), text:'Isocentre', a:b},
      {pos:new T.Vector3(0, BORE + 10, GD/2 + 6), text:'Laser marks the first slice', a:b, left:true},
      {pos:new T.Vector3(0, -12, 0), text:'Fan beam through the head', a:c},
    ];
  };
  immLinearize(scene);
  return W;
}
