
/* =====================================================================
   Ultrasound walkthrough (transcranial Doppler through the temporal window)
     0.00 at the bedside · 0.12 the probe · 0.27 a window in the skull · 0.40 pulse out, echo back
     0.54 echo time becomes depth · 0.67 moving blood shifts the pitch · 0.81 the spectrum · 0.93 beat by beat
   ===================================================================== */
function buildUS(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats();
  const S = immStudio(scene, renderer);
  W.P = immTable(scene); W.P.table.position.set(0, -22, -16);
  /* ---------- the ultrasound cart ---------- */
  const cart = new T.Group(); cart.position.set(82, 0, -26); cart.rotation.y = -0.75; scene.add(cart); W.cart = cart;
  const F0 = S.FLOOR;
  const cb = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(56, 66, 10), {depth:8, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:3}), M.plinth)); cb.rotation.x = -Math.PI/2; cb.position.y = F0 + 8; cart.add(cb);
  for (const [x, z] of [[-22, -26], [22, -26], [-22, 26], [22, 26]]){ const w = new T.Mesh(new T.CylinderGeometry(4, 4, 3, 20), M.dark); w.rotation.z = Math.PI/2; w.position.set(x, F0 + 4, z); cart.add(w); }
  const colm = ishadow(new T.Mesh(new T.BoxGeometry(16, 74, 16), M.trim)); colm.position.set(0, F0 + 52, -8); cart.add(colm);
  const cons = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(60, 46, 8), {depth:6, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), M.shell)); cons.rotation.x = -Math.PI/2 + 0.18; cons.position.set(0, F0 + 92, 4); cart.add(cons);
  const keys = new T.Mesh(new T.PlaneGeometry(40, 18), new T.MeshStandardMaterial({color:0x2c363c, roughness:0.5})); keys.rotation.x = -Math.PI/2 + 0.18; keys.position.set(0, F0 + 100.4, 8); cart.add(keys);
  const mArm = new T.Mesh(new T.BoxGeometry(5, 34, 5), M.steel); mArm.position.set(0, F0 + 118, -14); cart.add(mArm);
  W.monCv = document.createElement('canvas'); W.monCv.width = 640; W.monCv.height = 420; W.monTex = new T.CanvasTexture(W.monCv); W.monTex.encoding = T.sRGBEncoding;
  const mon = new T.Group(); mon.position.set(0, F0 + 152, -12); mon.rotation.x = -0.08; cart.add(mon); W.mon = mon;
  mon.add(ishadow(new T.Mesh(new T.BoxGeometry(58, 39, 3), M.dark)));
  const ms = new T.Mesh(new T.PlaneGeometry(54, 35.4), new T.MeshBasicMaterial({map:W.monTex, toneMapped:false})); ms.position.z = 1.6; mon.add(ms);
  const holder = new T.Mesh(new T.BoxGeometry(10, 8, 6), M.trim); holder.position.set(30, F0 + 96, 10); cart.add(holder);
  S.blob(82, -26, 120, 120);
  /* ---------- the probe on the left temple (MNI frame, millimetres) ---------- */
  const F = W.P.mni, apex = new T.Vector3(-74, -4, -12);
  const probe = new T.Group(); probe.position.set(-77, -4, -9); probe.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(-1, 0, 0.05).normalize()); F.add(probe); W.probe = probe;
  const pMat = new T.MeshPhysicalMaterial({color:0xe9eef0, roughness:0.3, clearcoat:0.6, transparent:true});
  const prof = [[0, 0], [10.5, 0], [11, 3], [12.5, 18], [14, 46], [13, 70], [8, 92], [5, 98], [0, 99]].map(([r, y])=>new T.Vector2(r, y));
  W.probeShell = new T.Mesh(new T.LatheGeometry(prof, 40), pMat); probe.add(W.probeShell); W.pMat = pMat;
  const lensM = new T.Mesh(new T.CylinderGeometry(10.2, 10.2, 1.5, 32), new T.MeshStandardMaterial({color:0x56636a, roughness:0.4})); lensM.position.y = 0.6; probe.add(lensM);
  // inside the probe: 32 piezo elements, a matching layer and a backing block
  W.elems = []; for (let i = 0; i < 24; i++){ const m = new T.Mesh(new T.BoxGeometry(0.55, 4, 14), new T.MeshStandardMaterial({color:0xb8692f, roughness:0.3, metalness:0.7, emissive:0x2f6bff, emissiveIntensity:0})); m.position.set(-7.4 + i*0.64, 4.2, 0); probe.add(m); W.elems.push(m); }
  const back = new T.Mesh(new T.BoxGeometry(16.4, 10, 15), new T.MeshStandardMaterial({color:0x2c363c, roughness:0.6})); back.position.y = 11.6; probe.add(back);
  const match = new T.Mesh(new T.BoxGeometry(16.4, 1.2, 15), new T.MeshStandardMaterial({color:0x9ec4ff, roughness:0.2, transparent:true, opacity:0.8})); match.position.y = 1.7; probe.add(match);
  W.inner = [back, match, ...W.elems]; W.inner.forEach(m=>{ m.visible = false; });
  W.gel = new T.Mesh(new T.SphereGeometry(13, 24, 12, 0, Math.PI*2, 0, Math.PI/2), new T.MeshPhysicalMaterial({color:0xa9dcff, roughness:0.05, transparent:true, opacity:0.45})); W.gel.scale.y = 0.25; W.gel.rotation.x = Math.PI; probe.add(W.gel);
  W.cableBuilt = false;
  /* ---------- head: scalp, skull with its thin temporal window, brain, the MCA ---------- */
  const skin = new T.MeshPhysicalMaterial({color:0xc9d6de, roughness:0.35, clearcoat:0.4, transparent:true, opacity:0, depthWrite:false});
  W.scalp = immScalp(F, skin, {order:4});
  W.boneMat = new T.MeshStandardMaterial({color:0xf2ead8, roughness:0.6, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
  W.skull = immScalp(F, W.boneMat, {shrink:0.93, order:3});
  W.brain = immBrain(F, {order:2});
  W.win = new T.Mesh(new T.CircleGeometry(14, 40), new T.MeshBasicMaterial({color:0x2f6bff, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); W.win.position.set(-70.5, -4, -8); W.win.rotation.y = -Math.PI/2; W.win.renderOrder = 5; F.add(W.win);
  const mcaPts = [[-14, 2, -14], [-20, 3, -13], [-26, 3, -12], [-34, 4, -9], [-38, 8, 0]].map(mniV);
  W.mcaC = new T.CatmullRomCurve3(mcaPts);
  W.mca = new T.Mesh(new T.TubeGeometry(W.mcaC, 60, 1.7, 16), new T.MeshPhysicalMaterial({color:0xd9412b, roughness:0.25, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); W.mca.renderOrder = 5; F.add(W.mca);
  const icaPts = [[-24, -10, -78], [-22, -13, -44], [-18, -6, -38], [-16, 4, -25], [-14, 2, -14]].map(mniV);
  W.ica = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(icaPts), 50, 2.2, 12), W.mca.material); F.add(W.ica);
  W.NC = 26; W.rbc = new T.InstancedMesh(new T.SphereGeometry(0.75, 12, 8), new T.MeshStandardMaterial({color:0xd9412b, roughness:0.4}), W.NC); F.add(W.rbc); W.rbcU = Array.from({length:W.NC}, (_, i)=>({u:i/W.NC, r:hashf(i*2.3)*0.9, a:hashf(i*5.1)*Math.PI*2}));
  /* ---------- the beam: a fan in the axial plane through the MCA, pulses and echoes ---------- */
  const A = 0.62;
  W.fanMat = new T.MeshBasicMaterial({color:0x3d7bff, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
  W.fan = new T.Mesh(new T.CircleGeometry(150, 48, -A, 2*A), W.fanMat); W.fan.position.copy(apex); W.fan.renderOrder = 5; F.add(W.fan);
  W.pulses = []; for (let i = 0; i < 3; i++){ const m = new T.Mesh(new T.RingGeometry(0.97, 1, 48, 1, -A, 2*A), new T.MeshBasicMaterial({color:0x0050ff, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); m.position.copy(apex); m.renderOrder = 6; F.add(m); W.pulses.push(m); }
  W.echoes = []; for (let i = 0; i < 3; i++){ const m = new T.Mesh(new T.RingGeometry(0.96, 1, 48, 1, Math.PI - 0.5, 1.0), new T.MeshBasicMaterial({color:0xe8962a, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide})); m.position.set(apex.x + 48, apex.y + 7, apex.z); m.renderOrder = 6; F.add(m); W.echoes.push(m); }
  // the B-mode / colour Doppler image from the viewer, revealed line by line across the fan
  W.imgCv = document.createElement('canvas'); W.imgCv.width = W.imgCv.height = 256; W.imgTex = new T.CanvasTexture(W.imgCv); W.imgTex.encoding = T.sRGBEncoding;
  W.alCv = document.createElement('canvas'); W.alCv.width = W.alCv.height = 256; W.alTex = new T.CanvasTexture(W.alCv);
  for (const t of [W.imgTex, W.alTex]){ t.wrapS = T.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  W.img = new T.Mesh(new T.PlaneGeometry(216, 216), new T.MeshBasicMaterial({map:W.imgTex, alphaMap:W.alTex, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide, toneMapped:false}));
  W.img.position.set(0, -16, -12); W.img.renderOrder = 7; F.add(W.img); W.img.material.userData.linear = true;
  // waves at the vessel: sent (blue) and returned at a higher frequency (amber)
  W.wSent = iwiggle(T, 0x0050ff, 160); W.wBack = iwiggle(T, 0xe8962a, 160); F.add(W.wSent, W.wBack);
  /* ---------- panel: the Doppler spectrum ---------- */
  const PN = immPanels(scene); W.spP = PN.make('SPECTRAL DOPPLER · LEFT MCA', 512, 280); W.spP.keepLab = true;
  W.spectrum = (ctx, w, h, t, dark) => {
    ctx.fillStyle = dark ? '#0a1016' : '#ffffff'; ctx.fillRect(0, 0, w, h);
    const base = h*0.74, sc = (h*0.62)/140;
    for (let i = 0; i < w; i += 2){ const tt = t - 4 + 4*i/w, v = tcdVel('normal', tt), hh = v*sc;
      const g = ctx.createLinearGradient(0, base, 0, base - hh); g.addColorStop(0, dark ? 'rgba(200,212,218,.06)' : 'rgba(12,22,27,.06)'); g.addColorStop(0.75, dark ? 'rgba(200,212,218,.45)' : 'rgba(12,22,27,.4)'); g.addColorStop(1, dark ? 'rgba(233,238,240,.95)' : 'rgba(12,22,27,.92)'); ctx.fillStyle = g; ctx.fillRect(i, base - hh, 2, hh); }
    ctx.strokeStyle = dark ? 'rgba(200,212,218,.4)' : 'rgba(12,22,27,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, base - 100*sc); ctx.lineTo(w, base - 100*sc); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = dark ? '#8d9ba1' : '#76858c'; ctx.font = '16px monospace'; ctx.fillText('100 cm/s', 6, base - 100*sc - 6); ctx.fillText('PSV 100  EDV 45  MFV 63 cm/s  PI 0.87', 6, h - 10);
  };
  W.drawMon = (t) => { const c = W.monCv.getContext('2d'); c.fillStyle = '#05080b'; c.fillRect(0, 0, 640, 420); const img = immScanImage('tcd', 'normal'); if (img) c.drawImage(img, 192, 4, 256, 256);
    c.save(); c.translate(0, 262); W.spectrum(c, 640, 158, t, true); c.restore(); c.fillStyle = '#5f8dff'; c.font = '16px monospace'; c.fillText('TCD · L temporal · 2 MHz', 10, 22); W.monTex.needsUpdate = true; };
  W.revealImg = f => {
    const img = immScanImage('tcd', 'normal'); if (!img) return;
    if (!W.imgDrawn){ W.imgDrawn = true; W.imgCv.getContext('2d').drawImage(img, 0, 0, 256, 256); W.imgTex.needsUpdate = true;
      const d = W.imgCv.getContext('2d').getImageData(0, 0, 256, 256).data; W.lum = new Float32Array(256*256); W.ang = new Float32Array(256*256);
      for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++){ const k = j*256 + i, mx = 108 - (i + 0.5)/256*216, my = 92 - (j + 0.5)/256*216;
        W.lum[k] = Math.max(d[k*4], d[k*4 + 1], d[k*4 + 2])/255; W.ang[k] = Math.atan2(my - apex.y, mx - apex.x); } }
    const key = Math.round(f*64); if (W.revK === key) return; W.revK = key;
    const c = W.alCv.getContext('2d'), im = c.createImageData(256, 256), cut = -A + 2*A*f;
    for (let k = 0; k < 256*256; k++){ const v = W.ang[k] <= cut ? Math.min(1, W.lum[k]*3.2 + 0.06*(W.lum[k] > 0.02)) : 0, g = Math.round(v*255); im.data[k*4] = im.data[k*4 + 1] = im.data[k*4 + 2] = g; im.data[k*4 + 3] = 255; }
    c.putImageData(im, 0, 0); W.alTex.needsUpdate = true;
  };
  const cam = immCamPath(R, [
    [0.00, [-330, 150, 420], [24, -24, 20]],
    [0.10, [-210, 110, 280], [30, -10, 0]],
    [0.17, [26, 12, 26], [12.5, -0.5, 1.6]],
    [0.25, [22, 8, 22], [11.5, -0.5, 1.6]],
    [0.32, [34, 52, 34], [4, -1, 1]],
    [0.39, [22, 46, 40], [3, -1, 1]],
    [0.46, [6, 10, 46], [2.6, -1, 1.9]],
    [0.60, [3, 2, 36], [2.2, -1, 1.9]],
    [0.68, [4.6, 2.6, 7.5], [2.7, 0.1, 1.9]],
    [0.78, [4.2, 1.8, 6.4], [2.7, 0.1, 1.9]],
    [0.86, [10, 20, 54], [2, -1, 2]],
    [1.00, [-14, 26, 70], [26, 4, -12]],
  ], {drift:0.09});
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), tan = new T.Vector3(), sc = new T.Vector3(1, 0.45, 1);
  W.update = (p, t, dt) => {
    const P = W.P; W.brain.build(); W.scalp.build(); W.skull.build();
    if (!W.cableBuilt && W.monTex){ W.cableBuilt = true; scene.updateMatrixWorld(true);
      const a = probe.localToWorld(new T.Vector3(0, 99, 0)), b = holder.getWorldPosition(new T.Vector3());
      scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([a, a.clone().add(new T.Vector3(8, 10, 2)), new T.Vector3((a.x + b.x)/2, -40, (a.z + b.z)/2 + 10), b]), 80, 0.45, 8), new T.MeshStandardMaterial({color:0x56636a, roughness:0.5}))); }
    cam(p, t, ilerp(36, 42, ismooth(0.44, 0.5, p)), p < 0.15 ? 6 : 0.2);
    R.saoOn = false;
    // the probe opens to show its crystals; they fire in sequence
    const pOpen = iwin(p, 0.15, 0.19, 0.25, 0.28); ifade(pMat, 1 - pOpen, 0.15); W.inner.forEach(m=>{ m.visible = pOpen > 0.01; });
    W.elems.forEach((m, i)=>{ const ph = (t*1.6 - i/24) % 1; m.material.emissiveIntensity = pOpen*(ph < 0.12 ? 2 : 0.1); });
    W.gel.visible = p > 0.12;
    // the head turns to glass; the temporal window glows
    const glass = ismooth(0.27, 0.33, p);
    P.fadeBody(glass); P.fadeTable(0.7*ismooth(0.4, 0.46, p));
    skin.opacity = 0.2*glass; if (W.scalp.mesh) W.scalp.mesh.visible = glass > 0.01;
    W.boneMat.opacity = 0.32*glass*(1 - 0.4*ismooth(0.5, 0.56, p)); if (W.skull.mesh) W.skull.mesh.visible = glass > 0.01;
    W.win.material.opacity = 0.55*iwin(p, 0.29, 0.32, 0.4, 0.44)*(0.75 + 0.25*Math.sin(t*4));
    W.brain.set(0.9*glass*(1 - 0.55*ismooth(0.62, 0.68, p)));
    // pulses out and echoes back
    const pe = iwin(p, 0.39, 0.42, 0.53, 0.56);
    W.fanMat.opacity = 0.1*Math.max(pe, iwin(p, 0.53, 0.55, 0.66, 0.7)); W.fan.visible = W.fanMat.opacity > 0.005;
    const cyc = (t*0.7) % 1;
    W.pulses.forEach((m, i)=>{ const u = cyc*1.4 - i*0.05; const r = 6 + u*60; m.scale.setScalar(Math.max(0.01, r)); m.material.opacity = pe*(u > 0 && u < 0.85 ? 0.9 - i*0.25 : 0); m.visible = m.material.opacity > 0.01; });
    W.echoes.forEach((m, i)=>{ const u = (cyc - 0.6)*2.2 - i*0.06; const r = 2 + u*46; m.scale.setScalar(Math.max(0.01, r)); m.material.opacity = pe*(u > 0 && u < 0.95 ? 0.95 - i*0.25 : 0); m.visible = m.material.opacity > 0.01; });
    // echo time becomes depth: the fan fills, line by line
    const fill = ismooth(0.55, 0.65, p), imgA = iwin(p, 0.54, 0.56, 0.78, 0.83);
    if (imgA > 0.002) W.revealImg(fill);
    W.img.material.opacity = imgA*(1 - 0.7*iwin(p, 0.67, 0.7, 0.8, 0.84)); W.img.visible = imgA > 0.01 && !!W.imgDrawn;
    // Doppler: red cells in the MCA flow toward the probe; the echo comes back compressed
    const dop = iwin(p, 0.66, 0.69, 0.8, 0.84); W.mca.material.opacity = 0.35*Math.max(dop, 0.5*imgA*0); W.mca.visible = W.ica.visible = dop > 0.01;
    W.rbc.visible = dop > 0.01;
    const vel = tcdVel('normal', t);
    W.rbcU.forEach((c, i)=>{ c.u = (c.u + dt*vel/100*0.22) % 1; if (!(c.u >= 0 && c.u < 1)) c.u = 0; W.mcaC.getPointAt(c.u, v); W.mcaC.getTangentAt(c.u, tan);
      const off = new T.Vector3(Math.cos(c.a), Math.sin(c.a), 0).multiplyScalar(c.r); v.add(off); q.setFromUnitVectors(new T.Vector3(0, 1, 0), tan); m4.compose(v, q, sc); W.rbc.setMatrixAt(i, m4); });
    W.rbc.instanceMatrix.needsUpdate = true;
    const tgt = W.mcaC.getPoint(0.55);
    W.wSent.visible = W.wBack.visible = dop > 0.01; W.wSent.material.opacity = W.wBack.material.opacity = dop;
    W.wSent.userData.set(apex.clone().add(new T.Vector3(4, 0, 0)), tgt.clone().add(new T.Vector3(0, 3, 0)), 1.1, 9, t*14, 0, 1, new T.Vector3(0, 0, 1));
    W.wBack.userData.set(tgt.clone().add(new T.Vector3(0, -3, 0)), apex.clone().add(new T.Vector3(4, -6, 0)), 1.1, 12, -t*14, 0, 1, new T.Vector3(0, 0, 1));
    // monitor and panel
    if (!W.monT || t - W.monT > 1/12){ W.monT = t; W.drawMon(t); }
    const camO = R.camera, sA = ismooth(0.81, 0.84, p);
    if (sA > 0.002){ W.spectrum(W.spP.ctx, 512, 280, t, false); W.spP.dirty(); const land = camO.aspect >= 1.05; PN.place(W.spP, camO, land ? 0.2*Math.min(1, camO.aspect - 0.6) : 0, land ? 0.12 : 0.22, land ? 0.62 : 0.84*Math.min(1, camO.aspect*1.25)); }
    W.spP.show(sA);
  };
  W.labels = p => {
    const a = iwin(p, 0.02, 0.04, 0.09, 0.105), b = iwin(p, 0.18, 0.2, 0.25, 0.265), c = iwin(p, 0.3, 0.32, 0.38, 0.395), d = iwin(p, 0.43, 0.45, 0.52, 0.535), e = iwin(p, 0.7, 0.72, 0.79, 0.81);
    const L = v => F.localToWorld(v.clone()), PR = v => probe.localToWorld(v.clone());
    return [
      {pos:W.mon.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 22, 0)), text:'Ultrasound machine', a},
      {pos:PR(new T.Vector3(7.5, 4.2, 0)), text:'Piezoelectric elements', a:b},
      {pos:PR(new T.Vector3(-8, 11.6, 0)), text:'Backing block', a:b, left:true},
      {pos:PR(new T.Vector3(0, 0, 0)), text:'Gel: no air between probe and skin', a:b, left:true},
      {pos:L(new T.Vector3(-70, -4, 6)), text:'Temporal window: thin bone', a:c},
      {pos:L(new T.Vector3(-30, 40, -12)), text:'Pulses out (blue), echoes back (amber)', a:d},
      {pos:L(W.mcaC.getPoint(0.4)), text:'Middle cerebral artery: flow toward the probe', a:e},
    ];
  };
  immLinearize(scene);
  return W;
}
