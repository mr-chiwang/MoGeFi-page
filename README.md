# MoGeFi project page

Static project page for **MoGeFi: Learning Geometric Feedback for Few-Step Human Motion Generation**.

This repository contains only the project website and its media assets.

## Preview and edit

No build step is required. Run from this directory:

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Edit `index.html`, `style.css`, and `app.js`; example metadata lives in `data.json` and `robot.json`. Images, diagrams, and videos are in `assets/`.

The page uses relative URLs and can be hosted from a repository subdirectory. GitHub Pages publishes the `main` branch from `/ (root)`.

## Contents

- Paper abstract, framework diagram, and caption.
- Text-to-motion and sparse joint control comparisons.
- Generated human motion, SONIC simulation, and physical Unitree G1 demonstrations.

AITS labels are benchmark averages, not playback durations. Robot recordings are aligned by action phase.

## Source

Imported from the existing project-page source revision `af9e0779da3e0c8f76d783b8e22d3a153f1fd5f5`. This branch includes the current website assets and does not include hosting credentials or the manuscript working files.
