# Neuro Lightbox

Interactive brain-imaging teaching site: scroll-driven 3D walkthroughs of MRI, CT, PET, SPECT, fMRI, EEG, MEG, ultrasound and angiography, a scan viewer with disease states, practice cases, and Brain Lab (cortical stimulation and dissection).

- `site/` is the finished website that Netlify publishes (`index.html`, `favicon.svg`, and the brain data in `data/`).
- `source/` is what the page is built from: `orig.html` (the base page), `src/*.js` (the 3D walkthroughs and the Brain Lab body), and `patches/*.py` (targeted edits). Run `python3 source/build.py` to regenerate `site/index.html`.

Anatomy: Colin 27 brain in MNI space with Harvard-Oxford, AAL, JHU, Juelich and Yeo atlases. Simulated scans for teaching, not for diagnosis.

## Build outputs

`python3 source/build.py` writes two versions of the page:
- `site/index.html` for the public website: three.js served from `site/vendor/three/`, link-preview tags, and a Content-Security-Policy that only allows this page's own script.
- `source/artifact.html` for the Claude preview page, which loads three.js from public CDNs.

Security headers for the website are in `netlify.toml`.
