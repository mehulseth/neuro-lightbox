
const BLUSH_OVERLAY = () => ({key:'blush', uniforms:{uBlush:{value:0}}, decl:'uniform float uBlush;',
  code:`float sideB = smoothstep(4.0, -4.0, vMni.x); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.32, 0.38), uBlush*sideB*0.6);`});

/* =====================================================================
   Angiography walkthrough
     0.00 the suite · 0.11 in at the groin · 0.23 up the aorta · 0.37 into the carotid
     0.49 contrast in · 0.61 capillaries then veins · 0.72 X-ray frames · 0.83 subtraction · 0.94 the angiogram
   Body vessels are drawn in the mannequin's standing coordinates (cm, y up, facing +z);
   the head's vessels in MNI millimetres, from the same tree the viewer uses.
   ===================================================================== */
function buildDSA(scene, renderer, R){
  const T = THREE, W = {}, M = immScanMats(), F0 = -124;
  const S = immStudio(scene, renderer);
  W.P = immTable(scene); W.P.table.position.set(0, -22, -16);
  const root = W.P.man.j.root;
  /* ---------- the C-arm, floor-mounted at the head end ---------- */
  const carm = new T.Group(); scene.add(carm); W.carm = carm;
  const base = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(80, 90, 12), {depth:12, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:3}), M.plinth)); base.rotation.x = -Math.PI/2; base.position.set(0, F0, -170); scene.add(base);
  const colm = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(46, 96, 12), {depth:46, bevelEnabled:true, bevelThickness:3, bevelSize:3, bevelSegments:4}), M.shell)); colm.position.set(0, F0 + 60, -195); scene.add(colm);
  const larm = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(34, 30, 10), {depth:84, bevelEnabled:true, bevelThickness:3, bevelSize:3, bevelSegments:4}), M.shell)); larm.position.set(0, -6, -190); scene.add(larm);
  const RC = 84, cpts = []; for (let i = 0; i <= 40; i++){ const a = -1.38 + 2.76*i/40; cpts.push(new T.Vector3(0, RC*Math.sin(a), -RC*Math.cos(a))); }
  const cshape = immRoundRect(14, 7, 3);
  const C = ishadow(new T.Mesh(new T.ExtrudeGeometry(cshape, {steps:80, extrudePath:new T.CatmullRomCurve3(cpts), bevelEnabled:false}), M.shell)); carm.add(C);
  const pivot = ishadow(new T.Mesh(new T.CylinderGeometry(12, 12, 16, 40), M.trim)); pivot.rotation.x = Math.PI/2; pivot.position.set(0, 0, -RC - 10); carm.add(pivot);
  const tubeH = new T.Group(); tubeH.position.set(0, -66, -6); carm.add(tubeH); W.tubeH = tubeH;
  tubeH.add(ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(30, 22, 8), {depth:34, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), M.shell)).translateZ(-17));
  const colli = new T.Mesh(new T.BoxGeometry(16, 6, 16), M.dark); colli.position.y = 13; tubeH.add(colli);
  const tbr = ishadow(new T.Mesh(new T.BoxGeometry(12, 14, 16), M.shell)); tbr.position.set(0, -78, -16); carm.add(tbr);
  const det = new T.Group(); det.position.set(0, 58, -2); carm.add(det); W.det = det;
  det.add(ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(48, 48, 6), {depth:9, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), M.shell)).rotateX(Math.PI/2).translateZ(-4.5));
  const detFace = new T.Mesh(new T.PlaneGeometry(42, 42), new T.MeshStandardMaterial({color:0x2c363c, roughness:0.4, metalness:0.3})); detFace.rotation.x = Math.PI/2; detFace.position.y = -7; det.add(detFace);
  const dbr = ishadow(new T.Mesh(new T.BoxGeometry(12, 14, 20), M.shell)); dbr.position.set(0, 78, -18); carm.add(dbr);
  W.beamMat = new T.MeshBasicMaterial({color:0x3d7bff, transparent:true, opacity:0, depthWrite:false, side:T.DoubleSide});
  W.beam = new T.Mesh(new T.ConeGeometry(20, 118, 4, 1, true), W.beamMat); W.beam.rotation.y = Math.PI/4; W.beam.position.set(0, -6, -2); W.beam.renderOrder = 6; carm.add(W.beam);
  S.blob(0, -170, 140, 140);
  /* ---------- ceiling monitors ---------- */
  W.monCv = document.createElement('canvas'); W.monCv.width = 1024; W.monCv.height = 512; W.monTex = new T.CanvasTexture(W.monCv); W.monTex.encoding = T.sRGBEncoding;
  const mons = new T.Group(); mons.position.set(78, 44, 18); mons.rotation.y = -0.95; scene.add(mons); W.mons = mons;
  mons.add(ishadow(new T.Mesh(new T.BoxGeometry(124, 64, 4), M.dark)));
  const msc = new T.Mesh(new T.PlaneGeometry(120, 60), new T.MeshBasicMaterial({map:W.monTex, toneMapped:false})); msc.position.z = 2.1; mons.add(msc);
  const boom = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, 150, 16), M.steel); boom.position.set(0, 107, -6); mons.add(boom);
  /* ---------- vessels of the body (standing coordinates) ---------- */
  const red = new T.MeshPhysicalMaterial({color:0xd9412b, roughness:0.3, transparent:true, opacity:0, depthWrite:false}); W.red = red;
  const blue = new T.MeshPhysicalMaterial({color:0x3d6bdc, roughness:0.3, transparent:true, opacity:0, depthWrite:false}); W.blue = blue;
  const V3 = a => new T.Vector3(...a), tube = (pts, r, mat, seg = 60) => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(V3), false, 'centripetal'), seg, r, 10), mat); m.renderOrder = 3; root.add(m); return m; };
  const aorta = [[-1, 136, 3], [-1.8, 140, 3.5], [-1.5, 145, 3], [0, 146.6, 1.2], [1.8, 145.4, -1.2], [2, 141, -2.5], [1.8, 134, -2.4], [1.2, 126, -1], [0.6, 116, 0.6], [0, 108, 1.5]];
  tube(aorta, 1.2, red, 120);
  tube([[0, 108, 1.5], [-4.5, 103, 2.5], [-8, 95, 4], [-9.5, 86, 5.5], [-9.8, 76, 5]], 0.6, red);
  tube([[0, 108, 1.5], [4.5, 103, 2.5], [8, 95, 4], [9.5, 86, 5.5], [9.8, 76, 5]], 0.6, red);
  tube([[-0.8, 146.4, 2.0], [-2.6, 149, 2.3]], 0.55, red, 10);
  tube([[-2.6, 149, 2.3], [-3.2, 154, 2.2], [-2.6, 157.2, 2.1]], 0.33, red, 24);
  tube([[-2.6, 149, 2.3], [-6, 149.5, 1.5], [-12, 147.5, 0.5]], 0.38, red, 24);
  tube([[0.3, 146.8, 1.4], [1.6, 149.5, 1.6], [2.6, 153, 1.9], [2.4, 156.7, 2.1]], 0.35, red, 30);
  tube([[1.4, 146.2, -0.3], [5, 148, 0], [12, 147.5, 0.5]], 0.38, red, 24);
  // the catheter: in at the right femoral artery, up the aorta, over the arch, into the left common carotid
  const cath = [[-10.2, 74, 7.5], [-9.8, 78, 5.2], [-9.5, 86, 5.5], [-8, 95, 4], [-4.5, 103, 2.5], [0, 108, 1.5], [0.6, 116, 0.6], [1.2, 126, -1], [1.8, 134, -2.4], [2, 141, -2.5], [1.8, 145.4, -1.2], [0.7, 146.5, 0.4], [0.35, 147.2, 1.4], [1.6, 149.6, 1.6], [2.6, 153, 1.9], [2.5, 155.6, 2.0]];
  W.cathC = new T.CatmullRomCurve3(cath.map(V3), false, 'centripetal');
  W.cath = new T.Mesh(new T.TubeGeometry(W.cathC, 400, 0.13, 8), new T.MeshStandardMaterial({color:0x1d2630, roughness:0.35, metalness:0.2})); W.cath.renderOrder = 4; root.add(W.cath); W.cathN = W.cath.geometry.index.count;
  W.tip = new T.Sprite(new T.SpriteMaterial({map:S.glow, color:0x2f6bff, transparent:true, opacity:0, depthWrite:false})); W.tip.scale.setScalar(4); root.add(W.tip);
  const sheath = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 5, 16), new T.MeshStandardMaterial({color:0x0050ff, roughness:0.4})); sheath.position.set(-10.3, 72.4, 9); sheath.rotation.x = 0.9; root.add(sheath);
  /* ---------- the head: brain and the cerebral vessels (MNI frame on the mannequin's head) ---------- */
  const HF = immMNIFrame('upright', [0, -15, -5], [0, 164, 1.6]); root.add(HF); W.HF = HF;
  W.blushOv = BLUSH_OVERLAY(); W.brain = immBrain(HF, {overlay:W.blushOv, order:2});
  W.ink = new T.MeshPhysicalMaterial({color:0x121a24, roughness:0.25, clearcoat:0.6, transparent:true});
  W.cv = []; W.base = [];
  const gen = {ICA:[0, 0.26], M1:[0.22, 0.38], M1d:[0.32, 0.44], A1:[0.24, 0.38], PCom:[0.26, 0.4], ACom:[0.34, 0.44], M2s:[0.32, 0.42], M2i:[0.32, 0.42], A2:[0.3, 0.41], M3a:[0.36, 0.45], M3b:[0.36, 0.45], M3c:[0.36, 0.45], M3d:[0.36, 0.45], peri:[0.35, 0.44], callosomarg:[0.36, 0.45]};
  W.lazyV = () => {
    if (W.vBuilt || !META || !META.landmarks) return; W.vBuilt = true;
    for (const [name, grp, type, r, pts0, flag] of VESSELS){
      let pts = pts0; if (name === 'SSS') pts = META.landmarks.sss.map(p=>p.slice()).reverse().concat([[0, -104, 8]]);
      const mirror = flag !== 'mid' && !(grp === 'VEIN' && (name === 'SSS' || name === 'SS'));
      for (const side of mirror ? [-1, 1] : [1]){
        const P = pts.map(p=>side < 0 || !mirror ? p.slice() : [-p[0], p[1], p[2]]);
        const curve = new T.CatmullRomCurve3(P.map(mniV), false, 'centripetal'), seg = Math.max(12, P.length*14);
        const b = new T.Mesh(new T.TubeGeometry(curve, seg, r*0.92, 8), type ? blue : red); b.renderOrder = 3; HF.add(b); W.base.push(b);
        const left = side < 0 || !mirror, art = !type;
        if ((art && grp === 'ICA' && left) || type){
          const c = new T.Mesh(new T.TubeGeometry(curve, seg, r, 10), W.ink); c.renderOrder = 4; c.geometry.setDrawRange(0, 0); HF.add(c);
          W.cv.push({m:c, n:c.geometry.index.count, curve, r, art, win:art ? (gen[name] || [0.34, 0.45]) : (name === 'ICV' ? [0.6, 0.74] : name === 'SSS' ? [0.62, 0.8] : name === 'SS' ? [0.7, 0.82] : [0.72, 0.86])});
        }
      }
    }
  };
  /* ---------- panels: mask, live frame, subtracted ---------- */
  const PN = immPanels(scene); W.maskP = PN.make('MASK · BEFORE CONTRAST'); W.liveP = PN.make('CONTRAST FRAME'); W.subP = PN.make('SUBTRACTED'); W.subP.keepLab = true;
  W.skull = (c, s, ox = 0, oy = 0) => {   // a stylised skull in the frontal (AP) projection
    const X = x => ox + (90 - x)/180*s, Y = z => oy + (100 - z)/200*s;
    c.save(); c.fillStyle = '#d7dcdf'; c.fillRect(ox, oy, s, s);
    const g = c.createRadialGradient(X(0), Y(20), s*0.1, X(0), Y(20), s*0.42); g.addColorStop(0, 'rgba(70,80,86,.25)'); g.addColorStop(0.82, 'rgba(70,80,86,.35)'); g.addColorStop(0.92, 'rgba(40,48,52,.75)'); g.addColorStop(1, 'rgba(70,80,86,0)');
    c.fillStyle = g; c.beginPath(); c.ellipse(X(0), Y(14), s*0.4, s*0.46, 0, 0, Math.PI*2); c.fill();
    c.fillStyle = 'rgba(40,48,52,.35)'; for (const sx of [-1, 1]){ c.beginPath(); c.ellipse(X(sx*32), Y(-38), s*0.08, s*0.07, 0, 0, Math.PI*2); c.fill(); c.beginPath(); c.ellipse(X(sx*42), Y(-62), s*0.12, s*0.025, sx*0.3, 0, Math.PI*2); c.fill(); }
    c.fillStyle = 'rgba(40,48,52,.25)'; c.beginPath(); c.ellipse(X(0), Y(-92), s*0.22, s*0.06, 0, 0, Math.PI); c.fill(); c.restore();
  };
  W.vessels2D = (c, s, ph, ox = 0, oy = 0) => {
    const X = x => ox + (90 - x)/180*s, Y = z => oy + (100 - z)/200*s, pxmm = s/180;
    const art = 1 - ismooth(0.45, 0.62, ph), ven = ismooth(0.6, 0.72, ph)*(1 - 0.6*ismooth(0.92, 1, ph)), blush = ismooth(0.44, 0.56, ph)*(1 - ismooth(0.66, 0.82, ph));
    c.save(); c.lineCap = 'round';
    if (blush > 0.01){ const g = c.createRadialGradient(X(-38), Y(20), s*0.04, X(-38), Y(20), s*0.32); g.addColorStop(0, `rgba(12,22,27,${0.22*blush})`); g.addColorStop(1, 'rgba(12,22,27,0)'); c.fillStyle = g; c.fillRect(ox, oy, s, s); }
    for (const v of W.cv){ const f = iclamp((ph - v.win[0])/(v.win[1] - v.win[0])), a = v.art ? art : ven; if (f <= 0 || a <= 0.01) continue;
      const n = 30, k = Math.max(2, Math.round(n*f)); c.strokeStyle = `rgba(12,22,27,${0.88*a})`; c.lineWidth = Math.max(1, 2*v.r*pxmm); c.beginPath();
      for (let i = 0; i < k; i++){ const q = v.curve.getPoint(i/(n - 1)); i ? c.lineTo(X(q.x), Y(q.z)) : c.moveTo(X(q.x), Y(q.z)); } c.stroke(); }
    c.restore();
  };
  // where things are, in the world (the patient never moves here)
  scene.updateMatrixWorld(true);
  const wpt = f => root.localToWorld(W.cathC.getPoint(f)), K = v => [v.x, v.y, v.z];
  const g0 = wpt(0.06), aM = wpt(0.45), arch = wpt(0.74), neck = wpt(0.97), headC = HF.localToWorld(new T.Vector3(0, -18, 12));
  W.headC = headC;
  const cam = immCamPath(R, [
    [0.00, [-360, 160, 400], [0, -30, -20]],
    [0.10, [-210, 110, 240], [0, -10, 20]],
    [0.16, K(g0.clone().add(new T.Vector3(-46, 40, 30))), K(g0)],
    [0.22, K(g0.clone().add(new T.Vector3(-40, 34, 10))), K(g0.clone().add(new T.Vector3(3, 0, -10)))],
    [0.30, K(aM.clone().add(new T.Vector3(-46, 40, 6))), K(aM)],
    [0.36, K(arch.clone().add(new T.Vector3(-36, 30, 18))), K(arch)],
    [0.43, K(neck.clone().add(new T.Vector3(-30, 24, 16))), K(neck)],
    [0.50, K(headC.clone().add(new T.Vector3(-22, 24, 17))), K(headC)],
    [0.60, K(headC.clone().add(new T.Vector3(-26, 20, 9))), K(headC)],
    [0.70, K(headC.clone().add(new T.Vector3(-20, 27, -13))), K(headC)],
    [0.78, [-170, 70, 150], [10, 0, 0]],
    [0.86, [-120, 40, 120], [0, 0, 0]],
    [1.00, [-80, 30, 100], [0, 0, 0]],
  ], {drift:0.09});
  W.vec = new T.Vector3();
  W.update = (p, t, dt) => {
    const P = W.P; W.brain.build(); W.lazyV();
    cam(p, t, ilerp(36, 42, ismooth(0.12, 0.2, p)), p < 0.12 ? 6 : 1);
    R.saoOn = false;
    // the body turns to glass to show the route
    const glass = ismooth(0.11, 0.16, p)*(1 - 0.35*ismooth(0.74, 0.8, p));
    P.fadeBody(0.88*glass); P.fadeTable(0.3*glass);
    red.opacity = 0.32*glass; blue.opacity = 0.22*glass*ismooth(0.5, 0.6, p);
    W.brain.set(0.85*ismooth(0.42, 0.5, p));
    // the catheter advances
    const f = 0.18*ismooth(0.12, 0.22, p) + 0.54*ismooth(0.23, 0.36, p) + 0.28*ismooth(0.37, 0.47, p);
    W.cath.geometry.setDrawRange(0, Math.floor(W.cathN*f/6)*6); W.cath.visible = f > 0.002;
    W.cathC.getPoint(Math.max(0.001, f), W.tip.position); W.tip.material.opacity = 0.9*iwin(p, 0.11, 0.13, 0.46, 0.5); W.tip.visible = W.tip.material.opacity > 0.01;
    // the run: arterial → capillary → venous; later it loops for the X-ray frames, then holds in the arterial phase
    let ph = ismooth(0.49, 0.71, p);
    if (p > 0.72) ph = ilerp((t/6) % 1, 0.45, ismooth(0.82, 0.85, p));
    W.ph = ph;
    const art = 1 - ismooth(0.45, 0.62, ph), ven = ismooth(0.6, 0.72, ph)*(1 - 0.6*ismooth(0.92, 1, ph));
    W.cv.forEach(v=>{ const fr = iclamp((ph - v.win[0])/(v.win[1] - v.win[0])); v.m.geometry.setDrawRange(0, Math.floor(v.n*fr/6)*6); v.m.visible = fr > 0 && (v.art ? art : ven) > 0.02 && p > 0.48; });
    W.ink.opacity = 1; W.blushOv.uniforms.uBlush.value = ismooth(0.3, 0.45, ph)*(1 - ismooth(0.62, 0.8, ph));
    // X-ray beam on during the frames
    const xr = iwin(p, 0.72, 0.75, 0.82, 0.85); W.beamMat.opacity = 0.14*xr*(0.8 + 0.2*Math.sin(t*18)); W.beam.visible = xr > 0.01;
    // monitors: live fluoroscopy and the subtracted run
    if (!W.monT || t - W.monT > 1/10){ W.monT = t; const c = W.monCv.getContext('2d'); c.fillStyle = '#05080b'; c.fillRect(0, 0, 1024, 512);
      W.skull(c, 480, 16, 16); W.vessels2D(c, 480, ph, 16, 16); c.fillStyle = '#ffffff'; c.fillRect(528, 16, 480, 480); W.vessels2D(c, 480, ph, 528, 16);
      c.fillStyle = '#5f8dff'; c.font = '20px monospace'; c.fillText('LIVE', 28, 44); c.fillText('DSA · L ICA', 540, 44); W.monTex.needsUpdate = true; }
    // panels
    const camO = R.camera, pA = ismooth(0.83, 0.86, p), hand = ismooth(0.93, 0.97, p);
    if (pA > 0.002){ const key = Math.round(ph*200); if (W.pk !== key){ W.pk = key;
        W.maskP.ctx.fillStyle = '#000'; W.skull(W.maskP.ctx, 256); W.maskP.dirty();
        W.skull(W.liveP.ctx, 256); W.vessels2D(W.liveP.ctx, 256, ph); W.liveP.dirty();
        W.subP.ctx.fillStyle = '#f4f6f7'; W.subP.ctx.fillRect(0, 0, 256, 256); W.vessels2D(W.subP.ctx, 256, ph); W.subP.dirty(); }
      const land = camO.aspect >= 1.05;
      if (land){ const w = ilerp(0.3, 0.8, hand), gap = (1 - hand)*0.34; PN.place(W.maskP, camO, -gap*1.02 + 0.06, 0.06*(1 - hand), w); PN.place(W.liveP, camO, 0.06, 0.06*(1 - hand), w); PN.place(W.subP, camO, gap*1.02 + 0.06 - 0.06*hand, 0.06*(1 - hand), w); }
      else { const w = ilerp(0.22, 0.6, hand)*Math.min(1, camO.aspect*1.6), gap = (1 - hand)*w*1.14; PN.place(W.maskP, camO, 0, 0.12 + gap, w); PN.place(W.liveP, camO, 0, 0.12, w); PN.place(W.subP, camO, 0, 0.12 - gap + 0.04*hand, w); }
      const lab = Math.pow(1 - hand, 3); W.maskP.show(pA*(1 - hand), pA*lab*(1 - hand)); W.liveP.show(pA*(1 - hand), pA*lab*(1 - hand)); W.subP.show(pA, pA);
    } else { W.maskP.show(0); W.liveP.show(0); W.subP.show(0); }
  };
  W.labels = p => {
    const a = iwin(p, 0.02, 0.04, 0.09, 0.105), b = iwin(p, 0.15, 0.17, 0.21, 0.225), c = iwin(p, 0.33, 0.35, 0.36, 0.37), d = iwin(p, 0.42, 0.44, 0.47, 0.49), e = iwin(p, 0.54, 0.56, 0.6, 0.61), f = iwin(p, 0.66, 0.68, 0.71, 0.72), g = iwin(p, 0.75, 0.77, 0.81, 0.83);
    const RW = v => root.localToWorld(new T.Vector3(...v)), H = v => HF.localToWorld(new T.Vector3(...v));
    return [
      {pos:new T.Vector3(0, 0, -RC - 6), text:'C-arm', a, left:true},
      {pos:W.mons.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 36, 0)), text:'Live images on the ceiling monitors', a},
      {pos:RW([-9.8, 78, 5.2]), text:'Right femoral artery', a:b, left:true},
      {pos:RW([0, 146.6, 1.2]), text:'Aortic arch', a:c, left:true},
      {pos:RW([2.6, 153, 1.9]), text:'Left common carotid artery', a:d},
      {pos:H([-34, 4, -9]), text:'Middle cerebral artery', a:e},
      {pos:H([-3, 36, 24]), text:'Anterior cerebral artery', a:e, left:true},
      {pos:H([0, -60, 72]), text:'Superior sagittal sinus', a:f},
      {pos:W.tubeH.getWorldPosition(new T.Vector3()), text:'X-ray tube under the table', a:g, left:true},
      {pos:W.det.getWorldPosition(new T.Vector3()), text:'Flat-panel detector', a:g},
    ];
  };
  immLinearize(scene);
  return W;
}
