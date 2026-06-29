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

## Optional: automate with GitHub Actions

`10up/action-wordpress-plugin-deploy` deploys `trunk` + a tag to WordPress.org
SVN on every GitHub release, and `action-wordpress-plugin-asset-update` syncs the
`.wordpress-org/` assets. Ask and I'll add the workflow.
