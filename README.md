# Waseem Sajjadh — Portfolio

A static portfolio site built with plain HTML, CSS and JavaScript. No build step, no
framework, no dependencies — it can be dropped onto GitHub Pages as-is.

## Structure

```
index.html                 All markup (hero, about, skills, experience, work, contact)
css/styles.css             Design tokens + every style rule
js/projects.js             Project catalogue — edit this to change case studies
js/main.js                 Theme toggle, nav, filters, modal gallery, contact form
assets/img/<project>/      Screenshots, WebP, max 1600px wide
assets/Waseem-Sajjadh-Resume.pdf
docs/                      Source material (resume + original screenshots) — not published
.nojekyll                  Tells GitHub Pages to serve the files verbatim
```

## Running locally

Any static server works, because the page loads `js/projects.js` as a plain script:

```bash
python -m http.server 8000
# then open http://127.0.0.1:8000
```

Opening `index.html` directly from the filesystem also works.

## Deploying to GitHub Pages

1. Create a repository and push this folder to it:

   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```

2. In the repository: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)**

3. The site goes live at `https://<your-username>.github.io/<repo>/` in a minute or two.

To serve it at `https://<your-username>.github.io/` instead, name the repository
`<your-username>.github.io`.

### Custom domain

Add a `CNAME` file at the root containing just the domain (e.g. `waseemsajjadh.com`),
then point the DNS at GitHub Pages.

## Editing content

**Projects** live in `js/projects.js` as one object each:

| Field | Purpose |
| --- | --- |
| `id` | Unique slug |
| `category` | Must match an id in `CATEGORIES` (`saas`, `web`, `mobile`) |
| `categoryLabel` | Free text shown in the modal's "Type" field |
| `portrait` | `true` renders the card image as a centred phone frame |
| `cover` | Index into `shots` used as the card image |
| `highlights` | Bullet list in the modal; inline `<strong>` is allowed |
| `note` | Optional confidentiality note shown at the bottom of the modal |

Filter tabs and their counts are generated from `CATEGORIES` automatically.

**Everything else** — hero copy, about, skills, experience — is plain markup in
`index.html`, so it is edited directly.

## Adding screenshots

Drop new images into `assets/img/<project>/` and reference them from `shots`. Convert to
WebP and cap the width around 1600px first — the current set went from 28 MB of PNGs to
2.7 MB that way.

## Notes

- Theme respects the OS setting until the visitor toggles it, then the choice is stored in
  `localStorage`.
- The contact form composes a `mailto:` link — nothing is sent or stored by the page. To
  take real submissions, point the form at a service like Formspree instead.
- Fonts load from Google Fonts, with a system font stack as fallback.
