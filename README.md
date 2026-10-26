# Maths & Physics simulations

A growing library of interactive simulations for pupils.

## Share with pupils

Main catalogue: https://enigmaldc.github.io/simulations/

- Yo-yo lab: https://enigmaldc.github.io/simulations/physics/yoyo/
- Spool paradox: https://enigmaldc.github.io/simulations/physics/spool/

These links become available after GitHub Pages is enabled and deployment succeeds.
Pupils need internet and a modern browser with WebGL 2. No accounts or installations
are needed. The physics runs in the browser; there are no paid AI calls or API keys.

## Repository structure

```text
index.html                 # Main catalogue, search and subject filters
simulations.json           # Catalogue entries: add future simulations here
.nojekyll                  # Serve the files directly, without Jekyll processing
physics/
  yoyo/index.html          # Yo-yo simulation
  spool/index.html         # Spool simulation
mathematics/               # Create this folder when adding a maths experiment
```

Each experiment lives in its own folder and opens at a stable address. Relative
links work under the `/simulations/` GitHub Pages project path. The catalogue
loads `simulations.json`; no build step or separate deployment framework is needed.
The simulations pin Three.js and OrbitControls to the same version, 0.180.0.

## Enable GitHub Pages once

1. Open https://github.com/enigmaldc/simulations/settings/pages
2. Choose **Deploy from a branch**.
3. Choose branch **main**, folder **/(root)**, then **Save**.
4. Wait for the Pages build to succeed in the **Actions** tab.
5. Use **Visit site** in Pages settings to confirm the main catalogue URL.

Subsequent commits on `main` publish automatically. GitHub Pages supports public
repositories with GitHub Free. Keep the repository public for that setup.

## Add another simulation

1. Create a descriptive folder, such as `physics/pendulum/` or
   `mathematics/trigonometry/`.
2. Put the simulation's entry file at `index.html` inside that folder. Keep any
   supporting assets in the same folder and use relative asset URLs.
3. Add one entry to the JSON list in `simulations.json`, for example:

```json
{
  "id": "pendulum",
  "title": "Pendulum lab",
  "subject": "Physics",
  "topic": "Oscillations",
  "description": "Explore how length and gravity affect the period of a pendulum.",
  "path": "physics/pendulum/",
  "icon": "generic",
  "tags": ["period", "gravity", "oscillations"]
}
```

4. Use a unique `id`. Keep `path` relative: no starting `/` and no `..` segments.
   JSON entries are comma-separated, with no trailing comma after the last one.
5. Add a visible link back to the catalogue. For an experiment nested two folders
   deep, use `<a href="../../">All simulations</a>`.
6. Commit the new folder and the JSON change together. The home page updates
   from the list automatically; new subjects get their own filter automatically.
7. Check the published page and every control before sharing it with pupils.

Available card illustrations are `yoyo`, `spool` and `generic`. Unknown icon names
also use the generic illustration. No home-page HTML edits are needed for new
catalogue entries.

## Local preview on Windows

Open PowerShell in this repository folder and run:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Then open http://localhost:8000/. Local file URLs cannot reliably load the JSON
catalogue; use this local server or the published website.

The previous `YoYoSim` repository is independent. Existing shared links there
continue to work; the files in this repository are the library copies to update
for the new catalogue.

## References

- [GitHub Pages publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [UMass Amherst: Walking the Spool](https://people.umass.edu/plecprep/mech/1k1030.html)
