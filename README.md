# App Screens

A clickable prototype of the Executive Log app: 46 screens across five views (Admin phone, Individual phone, Laptop Admin, Laptop Individual, Laptop Finance), with sample data.

**Live preview:** open `index.html` (on GitHub Pages: `https://shalord98.github.io/app-screens/`).

## How it works

- `index.html` is the start page. It lists every screen and loads them in place, so links inside a screen (Add log, side menu, bottom menu, contacts) move straight to the next screen.
- Each `*.dc.html` file is one screen exported from the design. Markup lives inside `<x-dc>`; the `<script type="text/x-dc">` block at the bottom holds the screen logic and sample data.
- `support.js` is a small runtime that renders those screens in any browser: `{{bindings}}`, `<sc-for>` loops, `<sc-if>` conditions, click handlers and state.
- `canvas.json` lists every screen, its view and its size.

Jump straight to a screen by adding its name to the URL, for example `index.html#Laptop_Today` or `index.html#Main`.

All names and figures are examples. Changes made while clicking around reset when the page reloads.

## Run locally

Screens are loaded with `fetch`, so serve the folder rather than opening the file directly:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Finance screens

The five `Finance_*.dc.html` screens (to-do, budget overview, budget plan, expenses, income) share one set of sample data, so their figures agree. They are generated from the templates in `tools/finance/`:

```sh
node tools/finance/build.js .
```

Edit a `*.tpl.html` template or the sample data in `build.js`, then rerun the command to regenerate the screens.
