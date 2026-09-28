# QSP survey

A side project under `misc/`; see [../README.md](../README.md) for how these folders work. The survey is a Google Form embedded in `index.html` in this folder. Google stores responses; this repo has no survey backend.

## Files and links

- Survey page: [index.html](index.html)
- Public URL: https://simbrain.net/misc/qsp_survey/
- Form script: [create_form.txt](create_form.txt)
- History chart used by the form: [history_chart.png](history_chart.png)
- Google Form (public link): https://docs.google.com/forms/d/e/1FAIpQLScb8LwfMHEEJgPFnSZOIWplt8631o8_7FyM-tqPkqCvx5zZUA/viewform. This started as a test form and is meant to be rebuilt in place by the script.

## Going live

Pushing to `main` deploys the site. The GitHub Action in `.github/workflows/pages.yml` builds Jekyll and publishes to GitHub Pages, usually within a few minutes. Progress is on the repo's **Actions** tab.

1. **Deploy the chart.** Commit and push `history_chart.png`. Check that https://simbrain.net/misc/qsp_survey/history_chart.png loads.
2. **Clear test responses.** Open the existing form, and on the **Responses** tab delete any test responses. The script refuses to rebuild a form that has responses. If a Google Sheet is linked, unlink it, since its columns belong to the old questions.
3. **Rebuild the form.** Set `FORM_ID` in the script and run it as described in [Creating the form](#creating-the-form). The form is already published, so the new questions are live as soon as the script finishes.
4. **Review it.** Open the editing link from the log and use **Preview**. Wording can be fixed directly in the form editor.
5. **Check settings.** Under **Settings → Responses**, confirm that email collection is off and sign-in is not required, so anyone can respond. On the **Responses** tab, use **Link to Sheets** to collect answers in a new spreadsheet.
6. **Update the page.** The form's link is unchanged, but it is much longer now. Use **⋮ → Embed HTML** in the form editor and copy its `height` into the iframe in `index.html`.
7. **Preview locally** (optional). See [Previewing](#previewing).
8. **Deploy the page.** Commit and push `index.html`, then wait for the Action to finish.
9. **Test end to end.** Scan the poster's QR code with a phone, submit a test response, and delete it from the **Responses** tab.

If you make a new form instead (leaving `FORM_ID` empty), it starts unpublished. Publish it, then in `index.html` replace both form URLs (the iframe `src` and the fallback link) as well as the height.

## Creating the form

The script builds the survey that goes with the poster *Clarifying and Contextualizing the Qualia Structure Paradigm* (the poster's QR code links here). Every question is optional. The survey has five pages:

- **About you**: name (with an anonymity box), how the person found the survey, their relationship to and commitment to QSP, and their fields.
- **1. Essential or optional?**: one 1–5 scale per poster slider, each followed by a "Say more" box.
- **2. Open questions**: the poster's three slider questions (with extra examples of complex experiences) and its two open questions.
- **3. Historical precedents**: the history chart, then questions about the y-axis, the narrative, what the threads represent, threads to add, thickness, visual style, and the reference markers.
- **Final thoughts**: an open "anything we missed" question, quoting permission, and an optional follow-up email.

Google Forms uses clickable numbered scales, not draggable sliders.

The history chart is rendered from `historicalTimeline.svg` in the poster's working folder (outside this repo), with a white background. To regenerate it:

```bash
inkscape historicalTimeline.svg --export-type=png --export-width=2000 \
  --export-background=white --export-background-opacity=1 \
  --export-filename=history_chart.png
```

The script fetches it from the live site, so deploy it first. If the fetch fails, the script still creates the form and logs a message; add the image by hand in the form editor.

1. Open the existing project at https://script.google.com/ (or create a new one).
2. Replace the contents of `Code.gs` with `create_form.txt`.
3. Set `FORM_ID` near the top to the ID in the form's edit URL, `https://docs.google.com/forms/d/<FORM_ID>/edit`. This is different from the ID in the public link. Leave `FORM_ID` empty to make a new unpublished form instead.
4. Select `createQspSurvey` and click **Run**, authorizing access when prompted. It may ask for new permissions because it now fetches the chart. No deployment or Web app is needed.
5. Open the editing link in the execution log.

With `FORM_ID` set, each run deletes every question in that form and rebuilds it, keeping the form's links and settings. The script stops without changing anything if the form has responses, so a live survey cannot be wiped by accident. `.gs` is the normal Apps Script extension, but the local file uses `.txt` for easy opening and copying.

Edit the local script and rerun it to iterate, or edit the form directly in Google Forms. Form edits take effect immediately, without a site push. After a direct edit, the local script no longer matches the form, and rerunning it would undo the edit.

## Previewing

Run `bundle exec jekyll serve` from the repo root, then visit http://localhost:4000/misc/qsp_survey/. The embedded form still loads from Google and submissions go to Google, even during local preview.

Responses can be linked to Google Sheets and downloaded for Excel. File-upload questions must be added manually; they require Google sign-in and may affect embedding. Check those requirements before adding uploads.

## Other options and QR codes

Jotform was considered as an alternative because it supports draggable sliders, text answers, uploads, and Excel integration. It has a free plan with usage limits; check current pricing before choosing it. A custom survey on this site would need a backend to save responses and uploads; Jekyll only builds pages.

For sharing, make a plain static QR code pointing directly to https://simbrain.net/misc/qsp_survey/. This keeps the code useful if the embedded form changes. Chrome's built-in QR generator adds a dinosaur. Ensure the survey page is deployed before sharing its QR code.
