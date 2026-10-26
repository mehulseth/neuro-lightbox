old = "  if (VIEW === 'learn' && SC.id === 'us' && SC.i === 3){"
new = """  // the walkthroughs: EPI rattle while fMRI scans, the Doppler voice once the probe finds the artery
  { const Rw = typeof IMM !== 'undefined' ? IMM.r : null;
    if (VIEW === 'learn' && Rw && IMM.visible && SC.id === 'fmri' && Rw.p > 0.4 && Rw.p < 0.99){ knock = Rw.p > 0.85 ? 0.6 : 0.3; tr = 0.08; }
    if (VIEW === 'learn' && Rw && IMM.visible && SC.id === 'us' && Rw.p > 0.67){ vel = tcdVel('normal', performance.now()/1000); dop = 1; } }
""" + old
src = rep(src, old, new)
