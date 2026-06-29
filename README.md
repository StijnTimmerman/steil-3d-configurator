# Steil 3D Configurator

A WordPress plugin that adds a **3D product configurator** Gutenberg block. Upload a glTF/GLB or FBX model, map its parts to colour palettes in the CMS, and let visitors rotate the product, pick colours and a finish, and request a quote — with a screenshot of their configuration attached.

Built on [Three.js](https://threejs.org). The rendering engine is generalised from the open-source [mini-configurator](https://github.com/StijnTimmerman/mini-configurator) (MIT, Steil Digital): instead of a fixed primitive model it loads any glTF/GLB or FBX model and recolours named parts. Three.js is **bundled locally** (no CDN), so the plugin is WordPress.org-ready.

## Features (v0.0.1)

- **Configurator products** (Custom Post Type): upload a glTF/GLB or FBX model, auto-detect its mesh/material names, and assign each part a colour palette, finishes and defaults. Reusable across pages.
- **The block** (`steil/configurator`): choose a product, set height and controls position, toggle the finish selector / reset button / quote form. Works in classic and block (FSE) themes; styles scoped under `.steil-cfg`.
- **Quote requests**: visitors submit name/email/message; the chosen configuration and a PNG screenshot are emailed to the admin. Honeypot spam protection.
- **Bundled sample**: a "Lounge chair" product is seeded on activation so the block works out of the box.

## Architecture

```
steil-3d-configurator.php   # plugin bootstrap (GPLv2+)
includes/                   # PHP
  class-plugin.php          #   wires components
  class-product-cpt.php     #   CPT + editor meta box
  class-product-store.php   #   config schema, defaults, sanitisation
  class-rest.php            #   REST: product list/config + quote
  class-quote.php           #   quote validation + email + screenshot
  class-assets.php          #   admin enqueue + GLB/FBX upload support
  class-block.php           #   block registration + front-end runtime
src/
  configurator/             # the block (block.json, edit, view, render.php, styles)
  engine/                   # configurator-engine.js (recolour/finish/screenshot) + load-model.js (glTF/GLB + FBX)
  admin/                    # product-editor.js — model introspection + palette mapping
scripts/make-sample-glb.mjs # generates assets/models/lounge-chair.glb
```

**Data flow:** admin defines a product (model + parts + palettes) → block picks a product → `render.php` inlines the config + a canvas → `view.js` boots the engine, builds the control panel, and posts quote requests to the REST API.

## Develop

Requires Node 18+ and a local WordPress (e.g. `@wordpress/env` or the Podman setup in `gutenberg-blocks`).

```bash
npm install
npm run make:sample   # generate the bundled sample GLB
npm run build         # or: npm run start (watch)
```

Symlink/copy the folder into `wp-content/plugins/` and activate.

### Preview

- **Local:** drop into your dev WordPress and add the block.
- **Share:** a [WordPress Playground](https://playground.wordpress.net) Blueprint can load the built plugin straight from a release — a one-click in-browser demo (WebGL works).

## Build a distributable plugin

```bash
npm run build
npm run plugin-zip    # → steil-3d-configurator.zip (installable via Plugins → Upload)
```

## Licence

[GPL-2.0-or-later](./LICENSE). Bundles Three.js (MIT) and code adapted from mini-configurator (MIT); see [NOTICE](./NOTICE).

Built by [Steil Digital](https://steildigital.nl).
