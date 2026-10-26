
/* =====================================================================
   Walkthroughs for the other eight methods. Same contract as buildMRI:
   build(scene, renderer, R) → {update(p, t, dt), labels(p)}.
   Units are centimetres; the isocentre of each machine is the origin.
   Anatomy (brain, scalp, vessels, electrodes) lives in an "MNI frame":
   a group whose children are in MNI millimetres, mapped into the scene
   for a supine (head-first) or an upright patient.
   ===================================================================== */
const iclamp = x => Math.min(1, Math.max(0, x));
const iwin = (p, a, b, c, d) => ismooth(a, b, p)*(1 - ismooth(c, d, p));
const iwrap = a => { a = (a + Math.PI) % (2*Math.PI); if (a < 0) a += 2*Math.PI; return a - Math.PI; };

/* ---------- studio: backdrop, lights, floor (shared look with the MRI film) ---------- */
function immStudio(scene, renderer, o = {}){
  const T = THREE, S = {FLOOR:o.floor ?? -124};
  const bg = immCanvasTex(512, 512, (x, w, h)=>{ const g = x.createRadialGradient(w*0.5, h*0.42, 0, w*0.5, h*0.5, w*0.75); g.addColorStop(0, '#26323b'); g.addColorStop(0.55, '#172128'); g.addColorStop(1, '#0a1014'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  bg.encoding = T.sRGBEncoding; scene.background = bg;
  scene.fog = new T.Fog(0x10181d, o.fogNear || 1200, o.fogFar || 3400);
  scene.environment = immStudioEnv(renderer, {top:0.55, floor:0.22, horizon:0.6, panel:2.6});
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  scene.add(new T.HemisphereLight(0xffffff, 0xb9c3c9, 0.2));
  const key = new T.DirectionalLight(0xfff8f0, 1.6); key.position.set(-380, 520, 460); key.castShadow = true;
  const sr = o.shadow || 330;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, {left:-sr, right:sr, top:sr, bottom:-sr, near:100, far:1600});
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.6; scene.add(key); S.key = key;
  if (o.target){ key.target.position.set(...o.target); scene.add(key.target); key.position.add(new T.Vector3(...o.target)); }
  const rim = new T.DirectionalLight(0xdfe9ff, 0.6); rim.position.set(420, 260, -360); scene.add(rim);
  const fill = new T.DirectionalLight(0xe8f0ff, 0.25); fill.position.set(500, 120, 300); scene.add(fill);
  const fade = immCanvasTex(512, 512, (x, w)=>{ const g = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#fff'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const floor = new T.Mesh(new T.CircleGeometry(1500, 96), new T.MeshPhysicalMaterial({color:new T.Color(0x1c252c), roughness:0.75, clearcoat:0.08, envMapIntensity:0.35, clearcoatRoughness:0.35, alphaMap:fade, transparent:true, depthWrite:false}));
  floor.rotation.x = -Math.PI/2; floor.position.y = S.FLOOR; floor.receiveShadow = true; scene.add(floor);
  const aoTex = immCanvasTex(256, 256, (x, w)=>{ const g = x.createRadialGradient(w/2, w/2, 0, w/2, w/2, w/2); g.addColorStop(0, 'rgba(20,30,36,.55)'); g.addColorStop(0.45, 'rgba(20,30,36,.22)'); g.addColorStop(1, 'rgba(20,30,36,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  S.blob = (x, z, sx, sz) => { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({map:aoTex, transparent:true, depthWrite:false})); m.rotation.x = -Math.PI/2; m.position.set(x, S.FLOOR + 0.4, z); m.scale.set(sx, sz, 1); scene.add(m); return m; };
  S.glow = immGlowTex();
  return S;
}
const ishadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const iring = (w, h, r, hole) => { const s = immRoundRect(w, h, r); const p = new THREE.Path(); p.absarc(0, 0, hole, 0, Math.PI*2, true); s.holes.push(p); return s; };
// a lathe that flares from the bore out to the face of a cover, along z
function iflare(r0, r1, depth, seg = 128){ const pts = []; for (let i = 0; i <= 20; i++){ const u = i/20; pts.push(new THREE.Vector2(r0 + (r1 - r0)*Math.pow(u, 2.2), -depth + depth*Math.pow(u, 0.8))); } const g = new THREE.LatheGeometry(pts, seg); g.rotateX(Math.PI/2); return g; }
// a small glass touch screen with text, like the ones on the MRI covers
function iscreen(lines, w = 26, h = 16.25, prog = 0.6){
  const T = THREE, tex = immCanvasTex(512, 320, (x, W, H)=>{ x.fillStyle = '#0d1418'; x.fillRect(0, 0, W, H); x.fillStyle = '#5f8dff'; x.font = '500 30px monospace'; x.fillText(lines[0], 30, 62);
    x.fillStyle = '#c8d4da'; x.font = '400 24px monospace'; lines.slice(1).forEach((l, i)=>x.fillText(l, 30, 120 + i*42));
    x.strokeStyle = '#2a63ff'; x.lineWidth = 4; x.beginPath(); x.moveTo(30, 250); x.lineTo(W - 30, 250); x.stroke(); x.strokeStyle = '#5f8dff'; x.beginPath(); x.moveTo(30, 250); x.lineTo(30 + (W - 60)*prog, 250); x.stroke(); });
  const g = new T.Group();
  g.add(new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map:tex, toneMapped:false})));
  const bez = new T.Mesh(new T.BoxGeometry(w + 2, h + 2, 1.2), new T.MeshPhysicalMaterial({color:0x0d1418, roughness:0.12, metalness:0.1, clearcoat:1})); bez.position.z = -0.8; g.add(bez);
  return g;
}
function iplate(text, w = 56, h = 9){ return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({transparent:true, map:immCanvasTex(512, 82, (x, W, H)=>{ x.fillStyle = '#7d8b92'; x.font = '500 34px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W/2, H/2 + 2); })})); }
// fade a material between solid and see-through without sorting artefacts
function ifade(m, a, floor = 0){ const op = floor + (1 - floor)*a, tr = op < 0.995; if (m.transparent !== tr){ m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = !tr; return op; }

/* ---------- camera: a keyframed path, exactly like the MRI film ---------- */
function immCamPath(R, K, o = {}){
  const T = THREE, n = K.length - 1, curve = new T.CatmullRomCurve3(K.map(k=>new T.Vector3(...k[1])), false, 'centripetal');
  const pos = new T.Vector3(), tgt = new T.Vector3();
  return (p, t, fovBase = 38, near = 6) => {
    let i = 0; while (i < n - 1 && p > K[i + 1][0]) i++;
    const f = iclamp((p - K[i][0])/(K[i + 1][0] - K[i][0])), e = f*f*(3 - 2*f);
    curve.getPoint((i + e)/n, pos); tgt.set(...imix(K[i][2], K[i + 1][2], e));
    const cam = R.camera, d = o.drift ? Math.sin(t*0.22)*14*(1 - ismooth(0, o.drift, p)) : 0;
    cam.position.set(pos.x + d, pos.y, pos.z); cam.lookAt(tgt);
    const portrait = cam.aspect < 0.95 ? Math.min(1.75, 1.05/Math.max(0.45, cam.aspect)) : 1;
    const fov = Math.min(88, fovBase*portrait);
    if (Math.abs(cam.fov - fov) > 0.01 || cam.near !== near){ cam.fov = fov; cam.near = near; cam.updateProjectionMatrix(); }
    return {pos, tgt};
  };
}

/* ---------- presentation panels that hang in front of the camera ---------- */
function immPanels(scene){
  const T = THREE, fwd = new T.Vector3(), right = new T.Vector3(), up = new T.Vector3();
  const make = (label, w = 256, h = 256) => {
    const g = new T.Group(), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.minFilter = T.LinearFilter;
    const asp = h/w;
    const face = new T.Mesh(new T.PlaneGeometry(1, asp), new T.MeshBasicMaterial({map:tex, transparent:true, opacity:0, toneMapped:false, depthTest:false}));
    const frame = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(1.03, asp + 0.03)), new T.LineBasicMaterial({color:0x0050ff, transparent:true, opacity:0, depthTest:false}));
    const lab = new T.Mesh(new T.PlaneGeometry(1, 0.09), new T.MeshBasicMaterial({transparent:true, opacity:0, depthTest:false, toneMapped:false, map:immCanvasTex(512, 46, (x)=>{ x.fillStyle = '#9db8ff'; x.font = '500 26px monospace'; x.fillText(label, 0, 32); })}));
    lab.position.y = asp/2 + 0.075; face.renderOrder = frame.renderOrder = lab.renderOrder = 10;
    face.material.userData.linear = frame.material.userData.linear = lab.material.userData.linear = true;
    g.add(face, frame, lab); g.visible = false; scene.add(g);
    return {g, cv, ctx:cv.getContext('2d'), tex, asp, lab,
      show(a, la = a){ g.visible = a > 0.002; face.material.opacity = a; frame.material.opacity = 0.9*a; lab.material.opacity = la; },
      dirty(){ tex.needsUpdate = true; }};
  };
  // x, y: offsets of the panel centre from the view centre, in view heights; size: panel width in view heights
  const place = (P, cam, x, y, size, dist = 20) => {
    size = Math.min(size, cam.aspect*0.92);   // never wider than the screen
    cam.getWorldDirection(fwd); right.crossVectors(fwd, cam.up).normalize(); up.crossVectors(right, fwd).normalize();
    const H = 2*dist*Math.tan(cam.fov*Math.PI/360);
    P.g.position.copy(cam.position).addScaledVector(fwd, dist).addScaledVector(right, x*H).addScaledVector(up, y*H);
    P.g.quaternion.copy(cam.quaternion); P.g.scale.setScalar(size*H);
  };
  // two panels side by side that merge into one large one as `hand` goes 0 → 1 (portrait: stacked)
  const pair = (A, B, cam, hand, aA = 1, aB = 1) => {
    const asp = cam.aspect, land = asp >= 1.05;
    if (land){ const s = ilerp(0.42, 0.84, hand), w = Math.min(s, asp*0.5), gap = w*0.56*(1 - hand), dx = ilerp(0.06, 0, hand)*Math.min(1, asp - 1);
      place(A, cam, dx - gap - w*0.3*hand, 0.04*(1 - hand), w); place(B, cam, dx + gap, 0.04*(1 - hand), w); }
    else { const w = ilerp(0.36, 0.62, hand)*Math.min(1, asp*1.5), gap = w*0.56*(1 - hand);
      place(A, cam, 0, 0.14 + gap*0.95, w); place(B, cam, 0, 0.14 - gap*0.95 + 0.06*hand, w); }
    const lab = Math.pow(1 - hand, 3);
    A.show(aA*(1 - hand), aA*lab*(1 - hand)); B.show(aB, aB*(B.keepLab ? 1 : lab));
  };
  return {make, place, pair};
}

/* ---------- MNI frame: children in MNI mm, mapped into the scene ---------- */
// supine head-first: right → −x, anterior → +y, superior → −z.  upright, facing +z: right → −x, superior → +y, anterior → +z
function immMNIFrame(kind, centre = [0, -18, 12], at = [0, 0, 0]){
  const T = THREE, g = new T.Group(), B = new T.Matrix4();
  if (kind === 'upright') B.makeBasis(new T.Vector3(-1, 0, 0), new T.Vector3(0, 0, 1), new T.Vector3(0, 1, 0));
  else B.makeBasis(new T.Vector3(-1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, -1));
  const c = new T.Vector3(...centre).applyMatrix4(B).multiplyScalar(0.1);
  g.matrix.copy(B).scale(new T.Vector3(0.1, 0.1, 0.1)).setPosition(at[0] - c.x, at[1] - c.y, at[2] - c.z);
  g.matrixAutoUpdate = false; g.matrixWorldNeedsUpdate = true;
  return g;
}
const mniV = p => new THREE.Vector3(p[0], p[1], p[2]);

/* ---------- shader overlays on the brain / scalp (positions are MNI mm × 64 in the raw mesh) ---------- */
function immOverlay(mat, o){
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, o.uniforms);
    sh.vertexShader = 'varying vec3 vMni;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMni = position*' + (o.scale || '1.0/64.0') + ';');
    sh.fragmentShader = 'varying vec3 vMni;\n' + (o.decl || '') + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (o.code || ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + (o.emit || ''));
  };
  mat.customProgramCacheKey = () => 'imm-' + o.key;
}
const GLSL_RAMPS = `
vec3 iHot(float x){ x = clamp(x, 0.0, 1.0); return vec3(clamp(x*2.6, 0.0, 1.0), clamp(x*2.6 - 0.9, 0.0, 1.0), clamp(x*3.0 - 2.0, 0.0, 1.0)); }
vec3 iRdBu(float x){ x = clamp(x, -1.0, 1.0); vec3 n = mix(vec3(0.96,0.96,0.97), vec3(0.13,0.33,0.75), smoothstep(0.0, 1.0, -x)); vec3 p = mix(vec3(0.96,0.96,0.97), vec3(0.78,0.15,0.16), smoothstep(0.0, 1.0, x)); return x < 0.0 ? n : p; }
vec3 iAct(float z){ return mix(vec3(0.86,0.1,0.04), vec3(1.0,0.95,0.38), smoothstep(0.32, 0.9, z)); }
vec3 iSpect(float v){ v = clamp(v, 0.0, 1.0); vec3 c0 = vec3(0.0), c1 = vec3(0.1,0.17,1.0), c2 = vec3(0.0,0.78,1.0), c3 = vec3(0.24,1.0,0.42), c4 = vec3(1.0,0.9,0.0), c5 = vec3(1.0,0.23,0.0);
  return v < 0.2 ? mix(c0, c1, v/0.2) : v < 0.4 ? mix(c1, c2, (v - 0.2)/0.2) : v < 0.6 ? mix(c2, c3, (v - 0.4)/0.2) : v < 0.8 ? mix(c3, c4, (v - 0.6)/0.2) : mix(c4, c5, (v - 0.8)/0.2); }
`;

/* ---------- the real brain surface (Colin 27), built once the mesh data has loaded ---------- */
function immBrain(frame, o = {}){
  const T = THREE, B = {mesh:null};
  B.mat = new T.MeshStandardMaterial({vertexColors:true, roughness:0.5, metalness:0, transparent:true, opacity:0, depthWrite:false, emissive:new T.Color(0x000000)});
  B.mat.userData.linear = true;
  if (o.overlay) immOverlay(B.mat, o.overlay);
  B.build = () => {
    if (B.mesh) return true; if (typeof MESHRAW === 'undefined' || !MESHRAW) return false;
    const Mr = MESHRAW, n = Mr.nv, g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(Mr.pos.subarray(0, n*3), 3));
    const nr = new Int8Array(n*3), col = new Uint8Array(n*3), lin = v => 255*Math.pow(v/255, 2.2);
    for (let i = 0; i < n; i++){ nr[i*3] = Mr.nrm[i*4]; nr[i*3 + 1] = Mr.nrm[i*4 + 1]; nr[i*3 + 2] = Mr.nrm[i*4 + 2];
      const c = Math.max(0, Math.min(1, (Mr.nrm[i*4 + 3]/127 + 0.1)/0.95)), r = Mr.reg[i], vent = (r >= 97 && r <= 98) || r >= 117;
      if (vent){ col[i*3] = lin(70); col[i*3 + 1] = lin(120); col[i*3 + 2] = 255; } else { const k = 0.42 + 0.58*c; col[i*3] = lin(232*k); col[i*3 + 1] = lin(206*k); col[i*3 + 2] = lin(198*k + 14*(1 - c)); } }
    g.setAttribute('normal', new T.BufferAttribute(nr, 3, true)); g.setAttribute('color', new T.BufferAttribute(col, 3, true));
    g.setIndex(new T.BufferAttribute(Mr.idx.subarray(0, Mr.brainCount), 1));
    g.boundingSphere = new T.Sphere(new T.Vector3(0, -18*64, 12*64), 120*64);
    B.mesh = new T.Mesh(g, B.mat); B.mesh.scale.setScalar(1/64); B.mesh.renderOrder = o.order || 0; frame.add(B.mesh);
    return true;
  };
  B.set = a => { const solid = a > 0.985; if (B.mat.transparent === solid){ B.mat.transparent = !solid; B.mat.depthWrite = solid; B.mat.needsUpdate = true; } B.mat.opacity = a; if (B.mesh) B.mesh.visible = a > 0.01; };
  return B;
}
/* the scalp surface from the same MRI (the last mesh piece); optional cut keeps only the triangles above a line */
function immScalp(frame, mat, o = {}){
  const T = THREE, S = {mesh:null, mat};
  S.build = () => {
    if (S.mesh) return true; if (typeof MESHRAW === 'undefined' || !MESHRAW) return false;
    const Mr = MESHRAW, v0 = Mr.nv, nv = Mr.pos.length/3 - v0, all = Mr.idx.subarray(Mr.brainCount);
    const pos = new Float32Array(nv*3), nrm = new Float32Array(nv*3), c = o.centre || [0, -18, 5];
    for (let i = 0; i < nv; i++){
      let x = Mr.pos[(v0 + i)*3]/64, y = Mr.pos[(v0 + i)*3 + 1]/64, z = Mr.pos[(v0 + i)*3 + 2]/64;
      const nx = Mr.nrm[(v0 + i)*4]/127, ny = Mr.nrm[(v0 + i)*4 + 1]/127, nz = Mr.nrm[(v0 + i)*4 + 2]/127;
      if (o.offset){ x += nx*o.offset; y += ny*o.offset; z += nz*o.offset; }
      if (o.shrink){ x = c[0] + (x - c[0])*o.shrink; y = c[1] + (y - c[1])*o.shrink; z = c[2] + (z - c[2])*o.shrink; }
      pos.set([x, y, z], i*3); nrm.set([nx, ny, nz], i*3);
    }
    const keep = o.keep || null, idx = [];
    for (let k = 0; k < all.length; k += 3){ const a = all[k] - v0, b = all[k + 1] - v0, d = all[k + 2] - v0;
      if (keep && !(keep(pos, a) && keep(pos, b) && keep(pos, d))) continue; idx.push(a, b, d); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nrm, 3)); g.setIndex(idx);
    if (o.flip){ const ia = g.index.array; for (let k = 0; k < ia.length; k += 3){ const t = ia[k + 1]; ia[k + 1] = ia[k + 2]; ia[k + 2] = t; } }
    g.computeBoundingSphere();
    S.mesh = new T.Mesh(g, mat); S.mesh.renderOrder = o.order || 0; S.mesh.castShadow = !!o.shadow; frame.add(S.mesh);
    return true;
  };
  return S;
}
// the cap / helmet region of the head: above a line from the brow over the ears to the inion
const icapKeep = (zc = -6, slope = 0.12) => (P, i) => P[i*3 + 2] > zc - slope*Math.max(0, -P[i*3 + 1]);

/* ---------- a supine patient on a sliding table (same build as the MRI film) ---------- */
function immTable(scene, o = {}){
  const T = THREE, P = {}, FLOOR = o.floor ?? -124;
  const tblMat = new T.MeshPhysicalMaterial({color:new T.Color(0xf6f8f9), roughness:0.26, clearcoat:0.7, clearcoatRoughness:0.12});
  const plinth = new T.MeshStandardMaterial({color:new T.Color(0x56636a), roughness:0.45, metalness:0.2});
  const steel = new T.MeshStandardMaterial({color:new T.Color(0xaeb8be), roughness:0.26, metalness:0.92});
  const z0 = o.pedZ ?? 140;
  const ped = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(58, 96, 12), {depth:170, bevelEnabled:true, bevelThickness:4, bevelSize:4, bevelSegments:6}), tblMat)); ped.position.set(0, -76, z0); scene.add(ped);
  const base = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(66, 176, 10), {depth:6, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:3}), plinth)); base.rotation.x = -Math.PI/2; base.position.set(0, FLOOR, z0 + 86); scene.add(base);
  P.table = new T.Group(); scene.add(P.table);
  const top = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(54, 6, 3), {depth:240, bevelEnabled:true, bevelThickness:2, bevelSize:1.2, bevelSegments:4, curveSegments:12}), tblMat)); top.geometry.translate(0, -4, -12); P.table.add(top);
  for (const sx of [-1, 1]){ const rail = ishadow(new T.Mesh(new T.BoxGeometry(1.6, 2.4, 232), steel)); rail.position.set(sx*28.4, -3, 108); P.table.add(rail); }
  const pad = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(48, 5, 2.4), {depth:226, bevelEnabled:true, bevelThickness:1.6, bevelSize:1.2, bevelSegments:4}), new T.MeshStandardMaterial({color:new T.Color(0x9fb1bc), roughness:0.85}))); pad.position.set(0, 1.6, -4); P.table.add(pad);
  P.man = buildMannequin(T, {shadows:true}); poseSupine(P.man); P.man.group.position.set(0, 18.6, 181); P.table.add(P.man.group);
  P.mat = P.man.mat;
  if (o.blanket !== false){ P.blanket = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(42, 12, 6), {depth:90, bevelEnabled:true, bevelThickness:4, bevelSize:2, bevelSegments:8, curveSegments:16}), new T.MeshStandardMaterial({color:new T.Color(0xbfcdd6), roughness:0.95, transparent:true}))); P.blanket.position.set(0, 20.5, 92); P.table.add(P.blanket); }
  // anatomy anchor: the brain centre (MNI 0, −18, 12) inside the mannequin's head
  P.mni = immMNIFrame('supine', [0, -18, 12], [0, 20, 15.5]); P.table.add(P.mni);
  const tblParts = [tblMat, pad.material];
  P.fadeTable = a => { for (const m of tblParts) ifade(m, 1 - a); };
  P.fadeBody = a => { const f = a > 0.01; if (P.mat.transparent !== f){ P.mat.transparent = f; P.mat.needsUpdate = true; } P.mat.opacity = 1 - a; P.mat.depthWrite = !f; P.man.group.visible = a < 0.995;
    if (P.blanket){ P.blanket.material.opacity = 1 - a; P.blanket.material.depthWrite = !f; P.blanket.visible = a < 0.995; } };
  return P;
}
// the mannequin sitting upright on a chair (EEG, MEG); the pelvis sits at y = seat + 8
function poseSeated(M, seat = 46){
  M.j.root.position.y = seat + 8 - 96;
  for (const s of ['L', 'R']){ const k = s === 'L' ? 1 : -1;
    M.j['hip' + s].rotation.x = -Math.PI/2; M.j['hip' + s].rotation.z = 0.06*k; M.j['knee' + s].rotation.x = Math.PI/2 - 0.08; M.j['ankle' + s].rotation.x = 0.08;
    M.j['shoulder' + s].rotation.x = -0.32; M.j['shoulder' + s].rotation.z = 0.1*k; M.j['elbow' + s].rotation.x = -1.05; M.j['wrist' + s].rotation.y = -0.4*k; }
  return M;
}
// upright MNI frame on the mannequin's head joint, with its egg head swapped for the real scalp
function immSeatedHead(M){
  const head = M.j.head; head.children.forEach(c=>{ if (c.isMesh) c.visible = false; });
  const F = immMNIFrame('upright', [0, -15, -5], [0, 10.5, 1.6]); head.add(F);
  return F;
}
function ichair(T, mat, seat = 46){
  const g = new T.Group(), dark = new T.MeshStandardMaterial({color:new T.Color(0x3a454b), roughness:0.55, metalness:0.3});
  const s = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(50, 46, 8), {depth:6, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), mat)); s.rotation.x = -Math.PI/2; s.position.set(0, seat - 6, 23); g.add(s);
  const b = ishadow(new T.Mesh(new T.ExtrudeGeometry(immRoundRect(48, 52, 10), {depth:5, bevelEnabled:true, bevelThickness:2, bevelSize:2, bevelSegments:4}), mat)); b.rotation.x = 0.12; b.position.set(0, seat + 30, -26); g.add(b);
  const col = ishadow(new T.Mesh(new T.CylinderGeometry(2.4, 2.4, seat - 8, 20), dark)); col.position.set(0, (seat - 8)/2, 0); g.add(col);
  for (let i = 0; i < 5; i++){ const a = i/5*Math.PI*2, leg = ishadow(new T.Mesh(new T.BoxGeometry(3, 2.4, 30), dark)); leg.position.set(Math.sin(a)*14, 1.4, Math.cos(a)*14); leg.rotation.y = a; g.add(leg); }
  const post = ishadow(new T.Mesh(new T.BoxGeometry(4, 34, 3), dark)); post.position.set(0, seat + 6, -26); g.add(post);
  return g;
}
// a wavy photon / sound track along a straight line from a to b
function iwiggle(T, color, n = 80){
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n*3), 3));
  const L = new T.Line(g, new T.LineBasicMaterial({color, transparent:true, opacity:0, depthWrite:false})); L.frustumCulled = false; L.renderOrder = 6;
  const a = new T.Vector3(), d = new T.Vector3(), nrm = new T.Vector3(), q = new T.Vector3();
  L.userData.set = (A, B, amp, waves, phase, s0 = 0, s1 = 1, up = new T.Vector3(0, 1, 0)) => {
    a.copy(A); d.copy(B).sub(A); nrm.crossVectors(d, up); if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0); nrm.normalize();
    const arr = g.attributes.position.array;
    for (let i = 0; i < n; i++){ const s = s0 + (s1 - s0)*i/(n - 1); q.copy(a).addScaledVector(d, s).addScaledVector(nrm, amp*Math.sin(s*waves*Math.PI*2 - phase)); arr.set([q.x, q.y, q.z], i*3); }
    g.attributes.position.needsUpdate = true;
  };
  return L;
}

/* a scan image from the viewer's own renderer, for subs whose thumbnail is a chart (TCD has a spectrum thumbnail) */
const IMM_THUMBS = new Map();
function immScanImage(subId, state = 'normal'){
  const key = subId + '|' + state; if (IMM_THUMBS.has(key)) return IMM_THUMBS.get(key);
  if (!ready || !sliceAvailable || !gl) return null;
  const sub = subById(subId), st = STATES[state];
  buildVessels(sub, state);
  const plane = sub.plane, [r, u, f] = basisLook(PLANES[plane].f, PLANES[plane].up);
  gl.bindFramebuffer(gl.FRAMEBUFFER, thumbFbo); gl.viewport(0, 0, TH, TH); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  gl.useProgram(progSlice); gl.bindVertexArray(emptyVao);
  const p = progSlice; bindVolumes(p); setStateUniforms(p, sub, st, true);
  u2f(p, 'uRes', TH, TH); u1i(p, 'uMode', 1); u1f(p, 'uHalf', 108);
  u3(p, 'uTR', r); u3(p, 'uTU', u); u3(p, 'uTF', f); u1f(p, 'uSlice', worldToSlice(plane, sub.at)); u1f(p, 'uSplit', -1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const buf = new Uint8Array(TH*TH*4); gl.readPixels(0, 0, TH, TH, gl.RGBA, gl.UNSIGNED_BYTE, buf); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const c = document.createElement('canvas'); c.width = c.height = TH; const x = c.getContext('2d'), img = x.createImageData(TH, TH);
  for (let y = 0; y < TH; y++) img.data.set(buf.subarray((TH - 1 - y)*TH*4, (TH - y)*TH*4), y*TH*4);
  x.putImageData(img, 0, 0); vesKey = ''; dirty = true;
  IMM_THUMBS.set(key, c); return c;
}
