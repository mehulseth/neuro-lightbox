
// the magnetic field of current dipoles, read on a surface (same formula as the viewer's MEG map)
const MEG_OVERLAY = () => ({key:'megmap', scale:'1.0', uniforms:{uDip:{value:new THREE.Vector4(-38, -27, 54, 0)}, uDipQ:{value:new THREE.Vector4(0, 1, 0, 0)}, uMap:{value:0}},
  decl:'uniform vec4 uDip, uDipQ; uniform float uMap;' + GLSL_RAMPS,
  code:`vec3 nrM = normalize(vMni - vec3(0.0, -18.0, 5.0)); vec3 dM = vMni - uDip.xyz; float rM = length(dM); float vM = dot(cross(uDipQ.xyz, dM), nrM)/(rM*rM*rM)*uDipQ.w;
    vec3 mC = iRdBu(vM); float isoM = abs(fract(vM*5.0 + 0.5) - 0.5); float isoL = 1.0 - smoothstep(0.0, fwidth(vM*5.0)*1.4 + 1e-4, isoM);
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(mC, mC*0.6, isoL*0.6), uMap);`});

/* =====================================================================
   MEG walkthrough
     0.00 shielded room · 0.12 head in the helmet · 0.245 inside the dewar · 0.37 SQUID sensors
     0.485 a current in a sulcus · 0.615 out on one side, in on the other · 0.745 millisecond timing · 0.87 the source
   ===================================================================== */
function buildMEG(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats();
  const S = immStudio(scene, renderer, {floor:0, shadow:260, target:[0, 80, -40]});
  /* ---------- the shielded room: aluminium and mu-metal panels ---------- */
  const panTex = immCanvasTex(256, 256, (x, w)=>{ const g = x.createLinearGradient(0, 0, w, w); g.addColorStop(0, '#e8ecee'); g.addColorStop(1, '#d6dde0'); x.fillStyle = g; x.fillRect(0, 0, w, w); x.strokeStyle = '#aeb8be'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, w - 3); x.fillStyle = '#9aa6ad'; for (const [a, b] of [[14, 14], [w - 14, 14], [14, w - 14], [w - 14, w - 14]]){ x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); } });
  panTex.wrapS = panTex.wrapT = T.RepeatWrapping;
  const wallMat = (rx, ry) => { const t = panTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new T.MeshStandardMaterial({color:0xffffff, map:t, roughness:0.45, metalness:0.35}); };
  const back = ishadow(new T.Mesh(new T.BoxGeometry(330, 250, 6), wallMat(5.5, 4.2))); back.position.set(0, 125, -150); scene.add(back);
  const left = ishadow(new T.Mesh(new T.BoxGeometry(6, 250, 260), wallMat(4.3, 4.2))); left.position.set(-165, 125, -20); scene.add(left);
  const floorP = new T.Mesh(new T.BoxGeometry(330, 2, 260), wallMat(5.5, 4.3)); floorP.position.set(0, 1, -20); floorP.receiveShadow = true; scene.add(floorP);
  const door = ishadow(new T.Mesh(new T.BoxGeometry(110, 230, 18), wallMat(1.8, 3.8))); door.position.set(196, 116, 64); door.rotation.y = -0.55; scene.add(door);
  /* ---------- MEG gantry, dewar and helmet ---------- */
  const shellM = new T.MeshPhysicalMaterial({color:0xf3f5f6, roughness:0.24, clearcoat:0.85, clearcoatRoughness:0.1, side:T.DoubleSide}); W.shellM = shellM;
  const col = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(46, 220, 14), {depth:30, bevelEnabled:true, bevelThickness:4, bevelSize:4, bevelSegments:6}), M.trim)); col.position.set(0, 112, -98); scene.add(col);
  const baseP = ishadow(new T.Mesh(new T.BoxGeometry(110, 8, 70), M.plinth)); baseP.position.set(0, 6, -86); scene.add(baseP);
  const arm = ishadow(new T.Mesh(new T.BoxGeometry(30, 22, 70), M.trim)); arm.position.set(0, 200, -58); scene.add(arm);
  const dew = new T.Group(); dew.position.set(0, 0, 2.4); scene.add(dew); W.dew = dew;
  const prof = []; const top = 236, cyl0 = 162, rC = 30;
  prof.push(new T.Vector2(0, top + 6)); for (let i = 0; i <= 8; i++){ const a = i/8*Math.PI/2; prof.push(new T.Vector2(rC - 6 + 6*Math.sin(a), top - 6 + 6*Math.cos(a))); }
  prof.push(new T.Vector2(rC, cyl0)); for (let i = 1; i <= 14; i++){ const u = i/14; prof.push(new T.Vector2(rC - (rC - 14)*Math.pow(u, 0.7), cyl0 - 26*u)); }
  const dewBody = ishadow(new T.Mesh(new T.LatheGeometry(prof, 96), shellM)); dew.add(dewBody);
  const cap = new T.Mesh(new T.CylinderGeometry(9, 9, 6, 32), M.steel); cap.position.y = top + 8; dew.add(cap);
  W.he = new T.Mesh(new T.CylinderGeometry(rC - 5, rC - 5, 52, 64), new T.MeshPhysicalMaterial({color:0x9fd0ff, roughness:0.05, transparent:true, opacity:0, depthWrite:false, emissive:0x3a7dff, emissiveIntensity:0.15})); W.he.position.y = 196; dew.add(W.he);
  /* ---------- seated volunteer, real head ---------- */
  const chairMat = new T.MeshPhysicalMaterial({color:0xe9eef0, roughness:0.35, clearcoat:0.5});
  scene.add(ichair(T, chairMat)); S.blob(0, 6, 120, 130);
  W.man = buildMannequin(T, {shadows:true}); poseSeated(W.man); scene.add(W.man.group);
  W.F = immSeatedHead(W.man);
  W.headMat = W.man.mat.clone(); W.headMat.userData.linear = true;
  W.scalp = immScalp(W.F, W.headMat, {order:1, shadow:true});
  W.helmetOut = immScalp(W.F, shellM, {keep:icapKeep(-22, 0.16), offset:52, order:5});
  W.helmetIn = immScalp(W.F, new T.MeshStandardMaterial({color:0x56636a, roughness:0.6, side:T.BackSide}), {keep:icapKeep(-22, 0.16), offset:18, order:5});
  W.mapOv = MEG_OVERLAY(); W.mapMat = new T.MeshStandardMaterial({color:0xf4f4f6, roughness:0.6, transparent:true, opacity:0, depthWrite:false}); immOverlay(W.mapMat, W.mapOv);
  W.mapShell = immScalp(W.F, W.mapMat, {keep:icapKeep(-18, 0.14), offset:5, order:4});
  W.genOv = SRC_OVERLAY('meggen'); W.brain = immBrain(W.F, {overlay:W.genOv, order:2});
  /* ---------- sensors on the helmet: ~100 positions, coloured by the field ---------- */
  W.sens = []; W.lazy = () => {
    if (W.sensBuilt || !MESHRAW) return; W.sensBuilt = true;
    const Mr = MESHRAW, v0 = Mr.nv, nv = Mr.pos.length/3 - v0, c = new T.Vector3(0, -18, 5), keep = icapKeep(-20, 0.16), cand = [];
    for (let i = 0; i < nv; i += 7){ const p = new T.Vector3(Mr.pos[(v0 + i)*3]/64, Mr.pos[(v0 + i)*3 + 1]/64, Mr.pos[(v0 + i)*3 + 2]/64); if (!keep([p.x, p.y, p.z], 0)) continue; if (p.y > 70 && p.z < 30) continue; cand.push(p); }
    const rr = rnd(8); cand.sort(()=>rr() - 0.5);
    for (const p of cand){ const n = p.clone().sub(c).normalize(), q = p.clone().addScaledVector(n, 30); if (W.sens.every(s=>s.p.distanceTo(q) > 27)) W.sens.push({p:q, n}); if (W.sens.length >= 102) break; }
    W.sI = new T.InstancedMesh(new T.BoxGeometry(9, 3.4, 9), new T.MeshStandardMaterial({color:0xffffff, roughness:0.4, metalness:0.3}), W.sens.length);
    const m4 = new T.Matrix4(), qq = new T.Quaternion(); W.sens.forEach((s, i)=>{ qq.setFromUnitVectors(new T.Vector3(0, 1, 0), s.n); m4.compose(s.p, qq, new T.Vector3(1, 1, 1)); W.sI.setMatrixAt(i, m4); W.sI.setColorAt(i, new T.Color(0.18, 0.42, 1)); });
    W.F.add(W.sI); W.sI.visible = false;
  };
  /* ---------- one sensor triplet, magnified ---------- */
  const trip = new T.Group(); trip.position.set(-36, 156, 26); trip.rotation.set(0.5, 0.6, 0.2); scene.add(trip); W.trip = trip; trip.visible = false;
  const cu = new T.MeshStandardMaterial({color:0xc8783c, roughness:0.35, metalness:0.8, transparent:true}), chipM = new T.MeshStandardMaterial({color:0x1d2630, roughness:0.3, metalness:0.5, transparent:true});
  const plateM = new T.MeshPhysicalMaterial({color:0xdfe6ea, roughness:0.2, clearcoat:0.8, transparent:true, opacity:0.9});
  const plate = new T.Mesh(new T.BoxGeometry(22, 0.6, 22), plateM); trip.add(plate);
  const loop = (pts, y) => { const c = new T.CatmullRomCurve3(pts.map(([x, z])=>new T.Vector3(x, y, z)), true, 'catmullrom', 0.02); return new T.Mesh(new T.TubeGeometry(c, 160, 0.28, 6, true), cu); };
  trip.add(loop([[-9, -9], [9, -9], [9, 9], [-9, 9]], 0.6));
  trip.add(loop([[-8, -8], [-0.6, -8], [-0.6, 8], [-8, 8]], 1.1)); trip.add(loop([[0.6, -8], [8, -8], [8, 8], [0.6, 8]], 1.1));
  trip.add(loop([[-7, -7], [7, -7], [7, -0.6], [-7, -0.6]], 1.7)); trip.add(loop([[-7, 0.6], [7, 0.6], [7, 7], [-7, 7]], 1.7));
  W.chips = []; for (let i = 0; i < 3; i++){ const ch = new T.Mesh(new T.BoxGeometry(2.6, 0.8, 2.6), chipM); ch.position.set(-6 + i*6, 2.4, 11.6); trip.add(ch); W.chips.push(ch); }
  W.tripMats = [cu, chipM, plateM];
  /* ---------- current dipole in the left hand area, and its field ---------- */
  W.dip = iarrow(T, 26, 1.3, 0xe8962a, {glow:0.8}); W.dip.position.set(-38, -27 - 13, 54); W.dip.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 1, 0)); W.F.add(W.dip); W.dip.visible = false;
  // MNI y is the current direction; in the head frame the arrow's own +y already maps to MNI +y
  W.rings = []; const dashT = immCanvasTex(256, 8, (x, w)=>{ for (let i = 0; i < 16; i++){ x.fillStyle = i % 2 ? 'rgba(255,255,255,0)' : '#ffffff'; x.fillRect(i*16, 0, 16, 8); } }); dashT.wrapS = T.RepeatWrapping;
  for (let k = 0; k < 4; k++){ const r = 7 + k*7, m = new T.MeshBasicMaterial({color:0x2f6bff, alphaMap:dashT, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
    const ring = new T.Mesh(new T.TorusGeometry(r, 0.8, 6, 120), m); ring.rotation.x = Math.PI/2; ring.position.set(-38, -27, 54); W.F.add(ring); W.rings.push(ring); }
  /* ---------- panel: evoked field, all sensors ---------- */
  const PN = immPanels(scene); W.bfP = PN.make('MEG · 102 SENSORS · RIGHT WRIST PULSE', 512, 300); W.bfP.keepLab = true;
  W.field = (dips, p, n) => { let b = 0; for (const d of dips){ const r = p.clone().sub(mniV(d.p)), L = r.length(); b += new T.Vector3().crossVectors(mniV(d.q), r).dot(n)/(L*L*L)*d.a; } return b; };
  W.butterfly = (ctx, w, h, tau) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); const X = ms => 30 + (w - 50)*ms/250, Y = v => h*0.48 - Math.max(-1.4, Math.min(1.4, v))*h*0.3;
    ctx.strokeStyle = 'rgba(12,22,27,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(250), Y(0)); ctx.stroke();
    ctx.strokeStyle = '#e8962a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), 10); ctx.lineTo(X(0), h - 40); ctx.stroke();
    const S = W.sens.length ? W.sens.slice(0, 60) : [];
    S.forEach((s, k)=>{ ctx.strokeStyle = `hsla(${200 + (k*29)%90},60%,${30 + (k*13)%30}%,.55)`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i <= 120; i++){ const ms = i/120*250, d = megDipoles('sep', ms/1000), v = W.field(d, s.p, s.n)*16000; const x = X(ms), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); });
    ctx.strokeStyle = '#0050ff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(20), 10); ctx.lineTo(X(20), h - 40); ctx.stroke(); ctx.setLineDash([]);
    const cx = X(Math.min(250, tau*1000)); ctx.fillStyle = 'rgba(0,80,255,.12)'; ctx.fillRect(cx - 2, 10, 4, h - 50);
    ctx.fillStyle = '#76858c'; ctx.font = '16px monospace'; for (const ms of [0, 50, 100, 150, 200, 250]) ctx.fillText(ms + ' ms', X(ms) - 18, h - 14);
    ctx.fillStyle = '#0050ff'; ctx.fillText('N20m', X(20) + 6, 26); ctx.fillStyle = '#965400'; ctx.fillText('pulse', X(0) + 6, h - 46);
  };
  const cam = immCamPath(R, [
    [0.00, [-290, 200, 370], [0, 110, -30]],
    [0.11, [-220, 175, 270], [0, 125, -10]],
    [0.18, [-150, 150, 175], [0, 132, 0]],
    [0.26, [-140, 176, 140], [0, 142, -4]],
    [0.34, [-96, 156, 104], [0, 136, 0]],
    [0.40, [-62, 168, 70], [-36, 156, 26]],
    [0.47, [-66, 170, 56], [-36, 156, 26]],
    [0.53, [40, 150, 42], [3.8, 128, 1.2]],
    [0.59, [24, 140, 26], [3.8, 128, 1.2]],
    [0.67, [30, 151, 30], [2, 129, 0]],
    [0.75, [26, 150, 42], [2, 129, 0]],
    [0.86, [12, 152, 72], [2, 127, 0]],
    [1.00, [2, 147, 66], [2, 127, 0]],
  ], {drift:0.08});
  const ccol = new T.Color();
  W.update = (p, t, dt) => {
    W.scalp.build(); W.helmetOut.build(); W.helmetIn.build(); W.mapShell.build(); W.brain.build(); W.lazy();
    cam(p, t, ilerp(36, 40, ismooth(0.48, 0.55, p)), p < 0.36 ? 6 : 0.5);
    R.saoOn = false;
    // the dewar turns to glass: helium and the sensor array inside
    const clear = ismooth(0.25, 0.31, p);
    ifade(shellM, 1 - clear, 0.08); W.he.material.opacity = 0.35*clear*(1 - ismooth(0.6, 0.66, p)); W.he.visible = W.he.material.opacity > 0.01;
    if (W.sI) W.sI.visible = clear > 0.01;
    if (W.helmetIn.mesh) W.helmetIn.mesh.visible = clear < 0.5;
    // a sensor triplet, magnified
    const tA = iwin(p, 0.37, 0.4, 0.47, 0.49); trip.visible = tA > 0.01; W.tripMats.forEach(m=>{ m.opacity = tA*(m === W.tripMats[2] ? 0.9 : 1); });
    // the current source: head clears, brain shows the active patch
    const deep = iwin(p, 0.485, 0.52, 0.86, 0.9), see = ismooth(0.485, 0.52, p);
    ifade(W.headMat, 1 - see, 0.14);
    W.brain.set(deep*(1 - 0.45*iwin(p, 0.5, 0.54, 0.6, 0.64)));
    const dips = megDipoles('sep', 0.02), pk = 0.85 + 0.15*Math.sin(t*3);
    const tau = (t*0.08) % 0.25, live = ismooth(0.745, 0.77, p), dLive = megDipoles('sep', tau)[0].a;
    const amp = ilerp(-1.0*pk, dLive, live);     // the evoked response, slowed down ~12× in the timing step
    W.genOv.uniforms.uGen.value.set(-38, -27, 54, 9); W.genOv.uniforms.uGenA.value = Math.abs(amp)*deep*1.2; W.genOv.uniforms.uGen2A.value = 0;
    const dA = iwin(p, 0.5, 0.53, 0.98, 1.01)*see; W.dip.visible = dA > 0.01; W.dip.userData.mat.opacity = dA; W.dip.scale.setScalar(Math.max(0.1, Math.abs(amp)));
    W.dip.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, amp < 0 ? -1 : 1, 0)); W.dip.position.set(-38, -27 - 13*Math.sign(amp || 1)*Math.max(0.1, Math.abs(amp)), 54);
    const rA = iwin(p, 0.51, 0.54, 0.7, 0.74)*see;
    W.rings.forEach((r, k)=>{ r.material.opacity = rA*(1 - k*0.18); r.visible = rA > 0.01; r.material.alphaMap.offset.x = (t*0.25*Math.sign(amp || 1)) % 1; });
    // the field map on the head and the sensor colours
    const mapA = ismooth(0.62, 0.67, p);
    const mo = ifade(W.mapMat, mapA*(1 - ismooth(0.95, 0.99, p))); if (W.mapShell.mesh) W.mapShell.mesh.visible = mo > 0.01;
    W.mapOv.uniforms.uDip.value.set(-38, -27, 54, 0); W.mapOv.uniforms.uDipQ.value.set(0, 1, 0, 7000*amp); W.mapOv.uniforms.uMap.value = 1;
    if (W.sI){ const d0 = [{p:[-38, -27, 54], q:[0, 1, 0], a:amp}], blueC = new T.Color(0.2, 0.42, 1); W.sens.forEach((s, i)=>{ const v = W.field(d0, s.p, s.n)*16000; v >= 0 ? ccol.setRGB(0.92, 0.92 - 0.8*Math.min(1, v), 0.92 - 0.8*Math.min(1, v)) : ccol.setRGB(0.92 + 0.8*Math.max(-1, v), 0.92 + 0.55*Math.max(-1, v), 0.96); W.sI.setColorAt(i, ccol.lerp(blueC, 1 - mapA)); }); W.sI.instanceColor.needsUpdate = true; }
    // the evoked response over time
    const camO = R.camera, bA = ismooth(0.75, 0.78, p);
    if (bA > 0.002 && W.sens.length){ if (!W.bfT || t - W.bfT > 1/12){ W.bfT = t; W.butterfly(W.bfP.ctx, 512, 300, tau); W.bfP.dirty(); }
      const land = camO.aspect >= 1.05; PN.place(W.bfP, camO, land ? 0.2*Math.min(1, camO.aspect - 0.6) : 0, land ? 0.12 : 0.22, land ? 0.6 : 0.8*Math.min(1, camO.aspect*1.25)); }
    W.bfP.show(bA);
  };
  W.labels = p => {
    const a = iwin(p, 0.02, 0.04, 0.09, 0.105), b = iwin(p, 0.27, 0.29, 0.35, 0.365), c = iwin(p, 0.4, 0.42, 0.465, 0.48), d = iwin(p, 0.53, 0.55, 0.6, 0.615), e = iwin(p, 0.88, 0.9, 0.98, 1.01);
    const L = v => trip.localToWorld(v.clone()), H = v => W.F.localToWorld(v.clone());
    return [
      {pos:new T.Vector3(-100, 210, -147), text:'Mu-metal and aluminium walls', a},
      {pos:new T.Vector3(0, 214, 2.4 - 28), text:'Liquid helium, 4 K', a:b, left:true},
      {pos:H(new T.Vector3(-70, -10, 95)), text:'102 sensor positions · 306 channels', a:b},
      {pos:L(new T.Vector3(9, 0.6, -9)), text:'Magnetometer loop', a:c},
      {pos:L(new T.Vector3(-8, 1.1, 0)), text:'Two planar gradiometers', a:c, left:true},
      {pos:L(new T.Vector3(0, 2.4, 11.6)), text:'SQUIDs', a:c},
      {pos:H(new T.Vector3(-38, -14, 56)), text:'Current along the wall of the central sulcus', a:d},
      {pos:H(new T.Vector3(-38, -27, 54)), text:'Fitted dipole: left hand area, 20 ms', a:e},
    ];
  };
  immLinearize(scene);
  return W;
}
