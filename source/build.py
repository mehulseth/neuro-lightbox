import re, glob, sys, os
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H,'orig.html'), encoding='utf8').read()
def rep(s, old, new, count=1):
    n = s.count(old)
    assert n == count, (old[:80], n)
    return s.replace(old, new)
code = '\n'.join(open(f, encoding='utf8').read() for f in sorted(glob.glob(os.path.join(H,'src/*.js'))))
anchor = "/* =====================================================================\n   Small 3D views inside the 2D chapter scenes"
src = rep(src, anchor, code + '\n' + anchor)
src = rep(src, "<span>Scroll to move through the scanner</span>", "<span>${D.hud || 'Scroll to move through the scanner'}</span>")
for f in sorted(glob.glob(os.path.join(H,'patches/*.py'))):
    exec(open(f, encoding='utf8').read())
open(os.path.join(H,'..','site','index.html'), 'w', encoding='utf8').write(src)
print('built', len(src))
