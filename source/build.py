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
# 1) the Claude artifact preview: three.js from public CDNs (artifacts must load scripts that way)
open(os.path.join(H, 'artifact.html'), 'w', encoding='utf8').write(src)

# 2) the public website: three.js served from this site, social preview tags, and a strict
#    Content-Security-Policy that allows only this page's own script (pinned by its hash)
import hashlib, base64
site = src
for old, new in [('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'vendor/three/three.min.js'),
                 ('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js', 'vendor/three/CopyShader.js')] + \
                [(f'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/{n}.js', f'vendor/three/{n}.js') for n in ['EffectComposer', 'RenderPass', 'ShaderPass', 'MaskPass']]:
    site = rep(site, f'<script src="{old}"></script>', f'<script src="{new}"></script>')
scripts = re.findall(r'<script>(.*?)</script>', site, re.S)
hashes = ' '.join("'sha256-" + base64.b64encode(hashlib.sha256(x.encode('utf8')).digest()).decode() + "'" for x in scripts)
URL = 'https://app.neurolightbox.workers.dev'
DESC = 'Step inside the scanner: interactive 3D walkthroughs of MRI, CT, PET, SPECT, fMRI, EEG, MEG, ultrasound and angiography, real brain scans to read, and a Brain Lab to stimulate the cortex.'
csp = ("default-src 'self'; script-src 'self' " + hashes + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; "
       "worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests")
head = f"""<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#0d1519">
<link rel="canonical" href="{URL}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Neuro Lightbox">
<meta property="og:title" content="Neuro Lightbox: brain imaging you can explore in 3D">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{URL}/">
<meta property="og:image" content="{URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Neuro Lightbox: brain imaging you can explore in 3D">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{URL}/og.png">
"""
anchor = '<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
site = rep(site, anchor, anchor + head)
open(os.path.join(H, '..', 'site', 'index.html'), 'w', encoding='utf8').write(site)
print('built', len(src), 'site', len(site), 'scripts hashed', len(scripts))
