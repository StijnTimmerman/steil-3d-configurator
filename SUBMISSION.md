# Submitting to the WordPress.org plugin directory

Everything needed to submit **3D Product Configurator Block** is prepared. This file is
a guide — it is not shipped in the plugin zip.

## What's ready

- `readme.txt` — WordPress.org format (header, short description, sections,
  Screenshots, Changelog, Upgrade Notice).
- `3d-product-configurator-block.php` — complete plugin header, GPLv2-or-later, text
  domain `3d-product-configurator-block`.
- `LICENSE` (GPLv2) + `NOTICE` (bundled Three.js MIT, mini-configurator MIT).
- Built assets in `build/` and the **source** in `src/` are both included in the
  zip (WordPress.org wants human-readable source for compiled JS).
- No external/CDN dependencies — Three.js is bundled locally.
- Directory assets in `.wordpress-org/` (uploaded to SVN `assets/`, not the plugin):
  - `icon-256x256.png`
  - `banner-772x250.png`, `banner-1544x500.png`
  - `screenshot-1.png` (front end), `screenshot-2.png` (admin editor)

## Build the submission zip

```bash
npm install
npm run make:sample   # regenerate the bundled sample model (already committed)
npm run build         # compile build/
npm run plugin-zip    # → 3d-product-configurator-block.zip
```

The zip excludes `node_modules/` and `.wordpress-org/` (controlled by the
`files` field in `package.json`).

## Before you submit — checklist

- [ ] **Contributors**: in `readme.txt`, replace `steildigital` with your real
      WordPress.org username(s) (comma-separated). The account must exist.
- [ ] **Tested up to**: bump to the current stable WordPress version if needed.
- [ ] **Version**: `Version:` (php header), `Stable tag:` (readme), and
      `version` (package.json + block.json) must all match.
- [ ] Optional: generate translations template — `npm run make:pot`
      (requires WP-CLI). Otherwise translate.wordpress.org generates it.

## 1. First submission (manual review)

1. Sign in at https://wordpress.org/ with your account.
2. Go to **https://wordpress.org/plugins/developers/add/**.
3. Upload `3d-product-configurator-block.zip`.
4. Wait for the manual review email (typically a few days to a couple of weeks).
   Reviewers may request changes — reply with a fixed zip.

## 2. After approval (SVN)

You receive an SVN repo at `https://plugins.svn.wordpress.org/3d-product-configurator-block/`.

```bash
svn co https://plugins.svn.wordpress.org/3d-product-configurator-block/ svn-steil
cd svn-steil

# Plugin files go in trunk/ (copy the built plugin contents, not the repo root)
#   trunk/  ← 3d-product-configurator-block.php, includes/, build/, src/, assets/, readme.txt, LICENSE, ...
# Then tag the release:
svn cp trunk tags/0.0.1

# Directory page assets go in assets/ (NOT trunk):
cp ../3d-product-configurator-block/.wordpress-org/icon-256x256.png   assets/
cp ../3d-product-configurator-block/.wordpress-org/banner-772x250.png assets/
cp ../3d-product-configurator-block/.wordpress-org/banner-1544x500.png assets/
cp ../3d-product-configurator-block/.wordpress-org/screenshot-1.png   assets/
cp ../3d-product-configurator-block/.wordpress-org/screenshot-2.png   assets/

svn add --force trunk assets tags
svn ci -m "3D Product Configurator Block 0.0.1"
```

> Note: the `assets/` SVN folder (banners/icons/screenshots) is different from
> the plugin's own `assets/models/` folder. Don't confuse them.

## Releasing updates later

1. Bump the version in all four places (see checklist).
2. Add a `== Changelog ==` entry in `readme.txt`.
3. `npm run build`, copy to `trunk/`, `svn cp trunk tags/<new-version>`, `svn ci`.

## Automated deploys (already set up)

Two GitHub Actions handle WordPress.org for you (in `.github/workflows/`):

- **`deploy.yml`** — on a published **GitHub Release**: installs deps, runs
  `npm run build`, then deploys `trunk` + a `tags/<release-tag>` + the
  `.wordpress-org/` assets to WordPress.org SVN, and attaches the built zip to
  the release.
- **`assets.yml`** — on push to `master` touching `readme.txt` or
  `.wordpress-org/**`: updates the store assets/description without a release.

`.distignore` controls what ships (everything except dev files; the built
`build/` folder IS included because CI builds it first).

### One-time setup (after the plugin is approved)

1. The plugin must be **approved** so the SVN repo exists (auto-deploy can't run
   before that — do the first release via the manual SVN steps above, or just
   publish a GitHub Release once approved).
2. In GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**, add:
   - `SVN_USERNAME` — your WordPress.org username (`stijntimmerman`)
   - `SVN_PASSWORD` — your WordPress.org password
3. Make sure `Stable tag` in `readme.txt` matches the release tag (e.g. `0.0.1`).

### Releasing after that

Create a GitHub Release tagged with the version (e.g. `0.0.1`). The deploy
workflow does the rest. To only refresh banners/screenshots/description, just
push the change to `master`.
