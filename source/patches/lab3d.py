# Brain Lab: the stimulation panel shows a 3D mannequin (src/k_labbody.js) beside the clinical card
src = rep(src, """    el.innerHTML = `<div class="lh"><span class="eb">Cortical stimulation mapping</span><h2>${s ? s.effect.title : 'Touch the brain'}</h2></div>
      <div class="lb">
        ${s ? `<div class="stim-res"><span class="k">${s.region.name}${s.region.hemi !== 'M' ? ' · ' + HEMI[s.region.hemi] + ' hemisphere' : ''} · MNI ${s.p.map(v=>v.toFixed(0)).join(', ')}</span><p style="margin-top:6px">${s.effect.text}</p></div>` : `<p>Click a spot on the cortex. Stimulating motor cortex moves the opposite side of the body; sensory cortex makes it tingle; visual cortex flashes lights in the opposite visual field; language areas stop speech. The figure faces you, so the patient's right is on your left.</p>`}
        <div class="body-wrap">${bodySVG()}</div>""",
"""    const use3d = typeof lbBuild === 'function' && !!lbBuild();
    el.innerHTML = `<div class="lh"><span class="eb">Cortical stimulation mapping</span><h2>${s ? s.effect.title : 'Touch the brain'}</h2></div>
      <div class="lb">
        <div class="lab-fb">
        ${s ? `<div class="stim-res"><div class="sr-top"><span class="k">Stimulation site</span><span class="sr-mni">MNI ${s.p.map(v=>v.toFixed(0)).join(', ')}</span></div>
          <b class="sr-reg">${s.region.name}</b><span class="sr-hemi">${s.region.hemi !== 'M' ? HEMI[s.region.hemi] + ' hemisphere' : 'midline'}${s.effect.side && s.effect.side !== 'both' && s.region.hemi !== 'M' ? ' → ' + s.effect.side + ' side of the body' : ''}</span>
          <p>${s.effect.text}</p></div>` : `<p class="lab-intro">Click a spot on the cortex. Stimulating motor cortex moves the opposite side of the body; sensory cortex makes it tingle; visual cortex flashes lights in the opposite visual field; language areas stop speech. The figure faces you, so the patient's right is on your left.</p>`}
        ${use3d ? '<div class="lab-body" id="labBody"></div>' : `<div class="body-wrap">${bodySVG()}</div>`}
        </div>""")
src = rep(src, "    if (s) requestAnimationFrame(()=>animateBody(s.effect));\n  } else {",
"    if (use3d) lbMount($('#labBody'), s); else if (s) requestAnimationFrame(()=>animateBody(s.effect));\n  } else {")

src = rep(src, ".stim-res{border:1px solid var(--line);border-radius:4px;padding:10px 12px;background:var(--bg)}", """.stim-res{border:1px solid var(--line);border-left:3px solid var(--signal);border-radius:6px;padding:11px 14px 12px;background:var(--paper);display:grid;gap:3px;box-shadow:0 1px 0 rgba(12,22,27,.03),0 10px 26px -18px rgba(12,22,27,.35)}
.stim-res p{margin:4px 0 0;font-size:13px;line-height:1.45}
.sr-top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.sr-mni{white-space:nowrap;font-family:var(--f-mono);font-size:11px;color:var(--ink);font-variant-numeric:tabular-nums;background:var(--bg);border:1px solid var(--line-soft);border-radius:3px;padding:1px 6px}
.sr-reg{font-family:var(--f-display);font-stretch:112%;font-weight:600;font-size:17px;line-height:1.15;color:var(--ink)}
.sr-hemi{font-size:12px;color:var(--ink-2)}
.lab-fb{display:grid;gap:12px}
.lab-intro{margin:0}
.lab-body{position:relative;height:clamp(300px,52vh,500px);border:1px solid var(--line-soft);border-radius:8px;overflow:hidden;
  background:radial-gradient(ellipse 75% 62% at 50% 44%,#ffffff 0%,#f2f5f6 58%,#e3e9ec 100%)}
.lab-body::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.55;background-image:linear-gradient(var(--line-soft) 1px,transparent 1px),linear-gradient(90deg,var(--line-soft) 1px,transparent 1px);background-size:32px 32px;
  mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,transparent 40%,#000 100%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 50%,transparent 40%,#000 100%)}
.lab-body .lb-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;touch-action:none}
.lab-body .lb-cv.dragging{cursor:grabbing}
.lb-tag{position:absolute;left:10px;top:9px;z-index:1;font-family:var(--f-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--c,var(--signal));background:rgba(255,255,255,.88);border:1px solid currentColor;border-radius:999px;padding:3px 9px;pointer-events:none}
.lb-tag.idle{color:var(--muted)}
.lb-side{position:absolute;left:0;top:0;z-index:1;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-mono);font-size:10px;font-weight:500;color:var(--ink-2);background:rgba(255,255,255,.92);border:1px solid var(--line);pointer-events:none;transition:opacity .2s}
.lb-bub{position:absolute;left:0;top:0;z-index:1;margin:-30px 0 0 0;translate:-50% 0;white-space:nowrap;font-size:12px;color:var(--signal);background:#fff;border:1px solid var(--signal);border-radius:12px;padding:3px 10px;pointer-events:none;box-shadow:0 6px 18px rgba(0,80,255,.15)}
.lb-view{position:absolute;right:10px;top:8px;z-index:2;font-family:var(--f-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);background:rgba(255,255,255,.9);border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer}
.lb-view:hover{color:var(--signal);border-color:var(--signal)}
.lb-hint{position:absolute;right:10px;bottom:8px;z-index:1;font-family:var(--f-mono);font-size:9.5px;letter-spacing:.04em;color:var(--muted);pointer-events:none}
@media (max-width:820px){
  .lab-body{height:clamp(240px,38svh,320px)}
  .stim-res p{font-size:12px}
  .lb-hint{display:none}
}""")
# plural and midline parts read naturally: "Right lips twitch", "Left side of the tongue twitches"
src = rep(src, "title:`${cap(side)} ${PART_LABEL[part]} twitches`", "title:(part === 'tongue' || part === 'face' || part === 'throat') ? `${cap(side)} side of the ${PART_LABEL[part]} twitches` : `${cap(side)} ${PART_LABEL[part]} ${/s$/.test(PART_LABEL[part]) ? 'twitch' : 'twitches'}`")
