src = rep(src, "const dt = Math.min(0.1, (now - R.last)/1000); R.last = now;", "const dt = Math.max(0, Math.min(0.1, (now - R.last)/1000)); R.last = Math.max(R.last, now);")
