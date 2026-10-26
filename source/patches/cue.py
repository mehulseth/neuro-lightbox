# A prominent scroll cue for every 3D walkthrough: a dark glass pill with an animated mouse wheel and
# chevrons; after the first scroll it shrinks into a small progress ring that jumps to the next stage.
src = rep(src, """<div class="imm-hud"><span id="immStage">${D.caps[0][2]}</span><span>${D.hud || 'Scroll to move through the scanner'}</span></div>""",
"""<div class="imm-hud"><span id="immStage">${D.caps[0][2]}</span></div>
      <button type="button" class="imm-cue" id="immCue" title="Jump to the next stage" aria-label="${D.hud || 'Scroll to move through the scanner'}. Press to jump to the next stage.">
        <span class="cue-ico" aria-hidden="true"><span class="cue-mouse"><i></i></span>
          <svg class="cue-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" class="cr-bg"/><circle cx="18" cy="18" r="16" class="cr-fg" id="immCueRing"/></svg><span class="cue-mini"></span></span>
        <span class="cue-txt">${D.hud || 'Scroll to move through the scanner'}</span>
        <span class="cue-chev" aria-hidden="true"><i></i><i></i></span>
      </button>""")

src = rep(src, ".imm-msg{position:absolute;inset:auto 16px 16px 16px;font-size:13px;color:var(--ink-2)}", """.imm-msg{position:absolute;inset:auto 16px 16px 16px;font-size:13px;color:var(--ink-2)}
/* scroll cue */
.imm-cue{position:absolute;top:12px;right:16px;z-index:4;display:flex;align-items:center;gap:11px;max-width:calc(100% - 32px);padding:8px 16px 8px 10px;border-radius:20px;
  background:rgba(0,0,0,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);color:#fff;
  font-family:var(--f-mono);font-size:11px;font-weight:600;letter-spacing:.17em;text-transform:uppercase;line-height:1;cursor:pointer;
  box-shadow:0 10px 30px -8px rgba(0,20,70,.45);transition:padding .5s var(--ease),gap .5s var(--ease),opacity .45s,transform .5s var(--ease),box-shadow .3s;
  animation:cueIn .7s var(--ease) .35s both,cueGlow 2.6s ease-in-out 1.2s infinite}
.imm-cue:hover{box-shadow:0 10px 30px -8px rgba(0,20,70,.5),0 0 0 3px rgba(95,141,255,.4)}
.imm-cue:focus-visible{outline:2px solid #8fb0ff;outline-offset:3px}
@keyframes cueIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@keyframes cueGlow{0%,100%{box-shadow:0 10px 30px -8px rgba(0,20,70,.45),0 0 0 0 rgba(95,141,255,0)}50%{box-shadow:0 10px 30px -8px rgba(0,20,70,.45),0 0 0 4px rgba(95,141,255,.28),0 0 22px rgba(80,130,255,.35)}}
.cue-txt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:64ch;color:#fff;text-shadow:0 0 14px rgba(120,160,255,.7);transition:max-width .5s var(--ease),opacity .3s}
.cue-ico{position:relative;flex:none;width:20px;height:28px;transition:width .5s var(--ease),height .5s var(--ease)}
.cue-mouse{position:absolute;inset:0;border:1.7px solid rgba(255,255,255,.92);border-radius:10px;transition:opacity .3s}
.cue-mouse i{position:absolute;left:50%;top:5px;width:3px;height:6px;margin-left:-1.5px;border-radius:2px;background:#8fb0ff;box-shadow:0 0 8px #5f8dff;animation:cueWheel 1.7s var(--ease) infinite}
@keyframes cueWheel{0%{transform:translateY(0);opacity:0}15%{opacity:1}75%{transform:translateY(10px);opacity:0}100%{opacity:0}}
.imm-cue.touch .cue-mouse{border-radius:6px;width:14px;left:3px}
.imm-cue.touch .cue-mouse i{top:auto;bottom:4px;animation-name:cueSwipe}
@keyframes cueSwipe{0%{transform:translateY(0);opacity:0}15%{opacity:1}75%{transform:translateY(-12px);opacity:0}100%{opacity:0}}
.cue-chev{display:flex;flex-direction:column;align-items:center;width:10px;flex:none;transition:width .4s,opacity .3s}
.cue-chev i{display:block;width:7px;height:7px;border-right:2px solid #8fb0ff;border-bottom:2px solid #8fb0ff;transform:rotate(45deg);opacity:0;animation:cueChev 1.7s ease-in-out infinite;filter:drop-shadow(0 0 3px #5f8dff)}
.cue-chev i+i{margin-top:-1px;animation-delay:.22s}
@keyframes cueChev{0%{opacity:0;transform:translateY(-4px) rotate(45deg)}45%{opacity:1}100%{opacity:0;transform:translateY(5px) rotate(45deg)}}
.cue-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);opacity:0;transition:opacity .35s}
.cue-ring circle{fill:none;stroke-width:2.6}
.cue-ring .cr-bg{stroke:rgba(255,255,255,.18)}
.cue-ring .cr-fg{stroke:#8fb0ff;stroke-linecap:round;stroke-dasharray:100.53;stroke-dashoffset:100.53;filter:drop-shadow(0 0 3px #5f8dff)}
.cue-mini{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-6px 0 0 -4px;border-right:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(45deg);opacity:0;transition:opacity .3s}
/* after the first scroll: a small ring that shows how far through you are */
.imm-cue.min{padding:5px;gap:0;animation:cueIn .7s var(--ease) .35s both}
.imm-cue.min .cue-txt{max-width:0;opacity:0}
.imm-cue.min .cue-chev{width:0;opacity:0}
.imm-cue.min .cue-ico{width:32px;height:32px}
.imm-cue.min .cue-mouse{opacity:0}
.imm-cue.min .cue-ring,.imm-cue.min .cue-mini{opacity:1}
.imm-cue.min .cue-mini{animation:cueNudge 2.4s ease-in-out infinite}
@keyframes cueNudge{0%,70%,100%{transform:translateY(0) rotate(45deg)}80%{transform:translateY(3px) rotate(45deg)}}
.imm-cue.done{opacity:0;pointer-events:none;transform:scale(.8)}
.imm.imm-off .imm-cue{display:none}
@media (max-width:820px){
  .imm-cue:not(.min){top:38px;right:auto;left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);font-size:10px;letter-spacing:.12em;padding:7px 12px 7px 9px;gap:8px}
  @keyframes cueIn{from{opacity:0}to{opacity:1}}
}
@media (prefers-reduced-motion:reduce){ .imm-cue,.cue-mouse i,.cue-chev i,.cue-mini{animation:none!important} .cue-chev i{opacity:1} .cue-mouse i{opacity:1} }""")

# collapse after the first scroll, track progress, finish at the end
src = rep(src, "  $('#immStage').textContent = stage;\n}", """  $('#immStage').textContent = stage;
  const cue = $('#immCue');
  if (cue){ if (R.p > 0.006) R.cueMin = true; cue.classList.toggle('min', !!R.cueMin); cue.classList.toggle('done', R.p > 0.99);
    const ring = $('#immCueRing'); if (ring) ring.style.strokeDashoffset = (100.53*(1 - R.p)).toFixed(2); }
}
// the cue is also a button: it scrolls to the next stage of the walkthrough
function immJump(){
  const R = IMM.r, sec = $('#imm'); if (!R || !sec) return;
  const r = sec.getBoundingClientRect(), pinH = $('#immPin').offsetHeight, span = Math.max(1, r.height - pinH), top = window.scrollY + r.top;
  const nx = R.D.caps.find(c=>c[0] > R.p + 0.004);
  const y = nx ? top + (nx[0] + Math.min(0.02, (nx[1] - nx[0])*0.3))*span : top + r.height - 40;
  window.scrollTo({top:y, behavior:reduceMotion ? 'auto' : 'smooth'});
}""")
src = rep(src, "  R.caps = [...sec.querySelectorAll('.imm-cap')];", """  R.caps = [...sec.querySelectorAll('.imm-cap')];
  { const cue = $('#immCue');
    if (cue){ if (matchMedia('(hover: none)').matches){ cue.classList.add('touch'); const tx = cue.querySelector('.cue-txt'); tx.textContent = tx.textContent.replace(/^Scroll/i, 'Swipe up'); }
      cue.addEventListener('click', immJump); } }""")
src = rep(src, "  .imm-hud span:last-child{display:none}\n", "")
