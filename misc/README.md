# misc

Small standalone side projects hosted on simbrain.net but not really part of the Simbrain site. They are not in the site navigation and are reached by direct link or QR code, e.g. https://simbrain.net/misc/qsp_survey/.

## Conventions

- One folder per project, with an `index.html` served at `/misc/<folder>/`.
- An optional `README.md` in the folder for notes. READMEs under `misc/` are excluded from the build in `_config.yml`, so they are not published on the site (though they are visible in the GitHub repo). Other files in a project folder are published.
- Pushing to `main` deploys the site, including these pages.

## How Jekyll treats these pages

A page with no front matter (the `---` block at the top) is copied to the site exactly as written, with its own styling. To use the site's header and styling instead, add front matter:

```yaml
---
layout: default
title: Page title
---
```
