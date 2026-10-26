# The walkthroughs and the step-by-step physics run on a dark stage: the white scanners and the text carry the contrast.
src = rep(src, "g.addColorStop(0, '#f7f9fa'); g.addColorStop(0.55, '#e9eef0'); g.addColorStop(1, '#c9d1d5');", "g.addColorStop(0, '#26323b'); g.addColorStop(0.55, '#172128'); g.addColorStop(1, '#0a1014');")
src = rep(src, "scene.fog = new T.Fog(0xe2e8eb, 1200, 3400);", "scene.fog = new T.Fog(0x10181d, 1200, 3400);")
src = rep(src, "new T.MeshPhysicalMaterial({color:LIN(0xdde3e6), roughness:0.5, clearcoat:0.3, clearcoatRoughness:0.35, alphaMap:floorFade", "new T.MeshPhysicalMaterial({color:LIN(0x1c252c), roughness:0.75, clearcoat:0.08, envMapIntensity:0.35, clearcoatRoughness:0.35, alphaMap:floorFade")
src = rep(src, "x.fillStyle = '#0050ff'; x.font = '500 26px monospace'; x.fillText(label, 0, 32);", "x.fillStyle = '#9db8ff'; x.font = '500 26px monospace'; x.fillText(label, 0, 32);")
src = rep(src, "renderer.setClearColor(0xf1f4f5, 1);", "renderer.setClearColor(0x0d1519, 1);")
src = rep(src, "\n</style>\n</head><body>", """
/* ---------- dark stage for the walkthroughs and the physics steps ---------- */
.imm,.imm-pin{background:#0d1519}
.imm{border-bottom-color:#1d2a31}
.imm-cap{background:rgba(8,14,18,.84);border:1px solid rgba(255,255,255,.14);border-left:3px solid #5f8dff;color:#d6dfe4;font-size:clamp(16px,1.3vw,18px);line-height:1.5;box-shadow:0 18px 44px -14px rgba(0,0,0,.7)}
.imm-cap b{color:#fff}
.imm-hud{color:#9fb0b8}
.imm-hud span:first-child{color:#9db8ff;text-shadow:0 0 10px rgba(95,141,255,.45)}
.imm-lbl span{color:#fff;background:rgba(9,15,19,.9);border-color:rgba(255,255,255,.24)}
.imm-lbl i{background:#5f8dff;box-shadow:0 0 0 3px rgba(95,141,255,.3),0 0 12px rgba(95,141,255,.8)}
.imm-msg{color:#c5d0d5}
.imm-prog{box-shadow:0 0 10px rgba(95,141,255,.8)}
.deep-head{background:#0d1519;border-bottom-color:#1d2a31}
.deep-head h2{color:#fff}
.deep-head .eb{color:#9db8ff}
.chap-body{background:#0d1519}
.chap-pin{background:#e4eaee;border-right:1px solid #1d2a31}
.step .stc{opacity:.45}
.step.on .stc{opacity:1}
.step h3{color:#fff}
.step p{color:#d0dadf;font-size:17.5px;line-height:1.6}
.step .n{color:#9db8ff}
.facts{border-top-color:rgba(255,255,255,.16)}
.facts dt{color:#93a4ac}
.facts dd{color:#eef3f5}
.ctl{background:#15212a;border-color:rgba(255,255,255,.14);box-shadow:none}
.ctl.live{border-color:#5f8dff}
.ctl-h{color:#9db8ff}
.ctl-note{color:#c5d0d5}
.ctl-l,.ctl-row output{color:#eef3f5}
.ctl-reset{color:#a9b8bf;border-color:rgba(255,255,255,.22)}
.ctl-reset:hover{color:#fff;border-color:#fff}
.ctl-pre button{background:#0e181e;color:#dfe7eb;border-color:rgba(255,255,255,.2)}
.ctl-pre button:hover{background:#1c2c36;border-color:#5f8dff}
@media (max-width:820px){ .step .stc{opacity:.55} .step.on .stc{opacity:1} .chap-pin{border-bottom-color:#1d2a31} }
</style>
</head><body>""")
