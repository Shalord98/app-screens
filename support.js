// Minimal stand-in for the design tool's runtime, so the exported *.dc.html
// screens run in a plain browser. Supports what the screens use:
// <x-dc> template, <helmet>, {{dotted.path}} bindings in text and attributes,
// <sc-for list as>, <sc-if value>, onClick / onChange handlers, and a
// <script type="text/x-dc"> Component class extending DCLogic with setState.
//
// Two modes:
// - Standalone: a *.dc.html file opened directly renders its own <x-dc>.
// - Prototype: a page with <div id="dc-screen"> (index.html) loads screens into
//   that element in place, so links between screens work inside one page.
(function () {
  const hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none}x-dc[data-ready]{display:contents}helmet{display:none}';
  document.head.appendChild(hide);

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      this.state = Object.assign({}, this.state, typeof patch === 'function' ? patch(this.state) : patch);
      if (this.__render) this.__render();
    }
  }
  window.DCLogic = DCLogic;

  const WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  const ANY = /\{\{\s*([^}]+?)\s*\}\}/g;
  const EVENTS = { onclick: 'click', onchange: 'input', oninput: 'input', onsubmit: 'submit', onkeydown: 'keydown' };
  const SCREEN = /^([A-Za-z0-9_]+)\.dc\.html$/;

  // Buttons the design left without an action that should still move the flow on.
  const EXTRA_NAV = {
    'Admin_AddLog.dc.html': { 'Save as planned': 'Main.dc.html' },
    'User_AddLog.dc.html': { 'Save as planned': 'User_Today.dc.html' }
  };

  function lookup(scope, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope;
    for (const key of path.split('.')) {
      if (v == null) return undefined;
      v = v[key];
    }
    return v;
  }
  const str = (v) => (v == null || v === false ? '' : String(v));
  const interp = (text, scope) => text.replace(ANY, (_, p) => str(lookup(scope, p)));

  function build(node, scope, out) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.appendChild(document.createTextNode(node.data.includes('{{') ? interp(node.data, scope) : node.data));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.localName;
    if (tag === 'sc-for') {
      const list = lookup(scope, (node.getAttribute('list') || '').replace(WHOLE, '$1')) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, index) => {
        const inner = Object.assign(Object.create(scope), { [as]: item, index });
        node.childNodes.forEach((c) => build(c, inner, out));
      });
      return;
    }
    if (tag === 'sc-if') {
      const raw = node.getAttribute('value') || '';
      const m = raw.match(WHOLE);
      if (m ? lookup(scope, m[1]) : raw && raw !== 'false') node.childNodes.forEach((c) => build(c, scope, out));
      return;
    }
    const el = document.importNode(node, false);
    for (const { name, value } of Array.from(node.attributes)) {
      if (name.startsWith('hint-')) { el.removeAttribute(name); continue; }
      if (!value.includes('{{')) continue;
      const m = value.match(WHOLE);
      const lname = name.toLowerCase();
      if (EVENTS[lname]) {
        el.removeAttribute(name);
        const fn = m && lookup(scope, m[1]);
        if (typeof fn === 'function') el.addEventListener(EVENTS[lname], (e) => fn(e));
      } else if (m && (lname === 'disabled' || lname === 'checked' || lname === 'selected')) {
        const v = lookup(scope, m[1]);
        if (v) el.setAttribute(name, ''); else el.removeAttribute(name);
        if (lname === 'checked') el.checked = !!v;
      } else if (lname === 'value' && (tag === 'textarea' || tag === 'input' || tag === 'select')) {
        const v = str(m ? lookup(scope, m[1]) : interp(value, scope));
        el.removeAttribute(name);
        el.__value = v;
      } else {
        el.setAttribute(name, m ? str(lookup(scope, m[1])) : interp(value, scope));
      }
    }
    // Template content of <textarea> is text; keep it only if no bound value.
    if (tag === 'textarea') {
      el.textContent = el.__value !== undefined ? '' : interp(node.textContent, scope);
    } else {
      node.childNodes.forEach((c) => build(c, scope, el));
    }
    if (el.__value !== undefined) el.value = el.__value;
    out.appendChild(el);
  }

  function loadComponent(script) {
    if (!script) return class extends DCLogic { renderVals() { return {}; } };
    // Load the screen logic as an inline script (works where eval is blocked by CSP).
    window.__dcComponent = null;
    const s = document.createElement('script');
    s.textContent = '(function(){' + script.textContent + '\n;window.__dcComponent = Component;})();';
    document.head.appendChild(s);
    s.remove();
    return window.__dcComponent || new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic);
  }

  function propsOf(script) {
    const props = {};
    try {
      const declared = JSON.parse((script && script.getAttribute('data-props')) || '{}');
      for (const [k, v] of Object.entries(declared)) if (!k.startsWith('$') && v && 'default' in v) props[k] = v.default;
    } catch (e) { console.warn('data-props', e); }
    return props;
  }

  // Render template `tpl` (a node whose children are the <x-dc> content) into `root`.
  function mount(root, tpl, script, file) {
    const Component = loadComponent(script);
    const comp = new Component(propsOf(script));
    const extra = EXTRA_NAV[file] || {};

    comp.__render = function () {
      const active = document.activeElement;
      const focusId = active && active.id && root.contains(active) ? active.id : null;
      const sel = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
      const scrolled = Array.from(root.querySelectorAll('*')).map((e) => e.scrollTop);

      const out = document.createDocumentFragment();
      const vals = comp.renderVals() || {};
      tpl.childNodes.forEach((c) => build(c, vals, out));
      out.querySelectorAll('button').forEach((b) => {
        const target = extra[b.textContent.trim()];
        if (target) b.addEventListener('click', () => go(target));
      });
      root.replaceChildren(out);
      root.setAttribute('data-ready', '');

      const now = root.querySelectorAll('*');
      scrolled.forEach((t, i) => { if (t && now[i]) now[i].scrollTop = t; });
      if (focusId) {
        const el = document.getElementById(focusId);
        if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
      }
    };
    comp.__render();
    return comp;
  }

  function takeHelmet(helmet, marker) {
    if (!helmet) return;
    Array.from(helmet.children).forEach((c) => {
      if (c.localName === 'link' || c.localName === 'style' || c.localName === 'meta') {
        const n = document.importNode(c, true);
        if (marker) n.setAttribute('data-dc-screen', '');
        document.head.appendChild(n);
      }
    });
  }

  // Centre phone-sized screens like a device on a desk.
  function present(root) {
    const frame = root.firstElementChild;
    const w = frame ? parseInt(frame.style.width, 10) : 0;
    const phone = w && w <= 500;
    document.body.classList.toggle('dc-phone', !!phone);
    if (phone) {
      frame.style.borderRadius = '28px';
      frame.style.boxShadow = '0 12px 40px rgba(20,33,61,0.18)';
    }
  }

  function chrome() {
    const css = document.createElement('style');
    css.textContent =
      'body.dc-phone{background:#E7E3DA!important;display:flex;justify-content:center;padding:24px 16px 80px}' +
      '.dc-home{position:fixed;left:max(16px, env(safe-area-inset-left, 0px));bottom:calc(16px + env(safe-area-inset-bottom, 0px));z-index:50;' +
      'background:#14213D;color:#FFFFFF;font:700 13px "Plus Jakarta Sans",system-ui,sans-serif;padding:10px 14px;border-radius:20px;' +
      'text-decoration:none;box-shadow:0 6px 18px rgba(20,33,61,0.3);border:none;cursor:pointer}' +
      '.dc-home:focus-visible{outline:3px solid #0F766E;outline-offset:2px}';
    document.head.appendChild(css);
  }

  // ---- Prototype mode: one page, screens swapped in place ----
  let host, home, homeBtn;
  const cache = {};
  let current = null;
  const homeTitle = document.title;

  function showHome(push) {
    current = null;
    document.title = homeTitle;
    document.querySelectorAll('[data-dc-screen]').forEach((n) => n.remove());
    document.body.classList.remove('dc-phone');
    host.hidden = true; host.replaceChildren();
    home.hidden = false; homeBtn.hidden = true;
    if (push) history.pushState({ screen: null }, '', location.pathname + location.search);
    window.scrollTo(0, 0);
  }

  async function show(file, push) {
    if (!SCREEN.test(file)) return;
    let text = cache[file];
    if (!text) {
      const res = await fetch(file);
      if (!res.ok) throw new Error('Could not load ' + file);
      text = cache[file] = await res.text();
    }
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const xdc = doc.querySelector('x-dc');
    const script = doc.querySelector('script[type="text/x-dc"]');
    const helmet = xdc.querySelector('helmet');
    if (helmet) helmet.remove();

    document.querySelectorAll('[data-dc-screen]').forEach((n) => n.remove());
    takeHelmet(helmet, true);
    if (doc.title) document.title = doc.title + ' \u00B7 Executive Log';

    home.hidden = true; homeBtn.hidden = false; host.hidden = false;
    current = file;
    mount(host, xdc, script, file);
    present(host);
    if (push) history.pushState({ screen: file }, '', '#' + file.match(SCREEN)[1]);
    window.scrollTo(0, 0);
  }

  function go(file) {
    if (host) show(file, true).catch((e) => console.error(e));
    else location.href = file;
  }

  function startPrototype() {
    host = document.getElementById('dc-screen');
    home = document.getElementById('dc-home') || document.querySelector('main');
    host.setAttribute('data-ready', '');
    chrome();
    homeBtn = document.createElement('button');
    homeBtn.className = 'dc-home';
    homeBtn.type = 'button';
    homeBtn.textContent = '\u2190 All screens';
    homeBtn.hidden = true;
    homeBtn.addEventListener('click', () => showHome(true));
    document.body.appendChild(homeBtn);

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!SCREEN.test(href)) return;
      e.preventDefault();
      go(href);
    });
    window.addEventListener('hashchange', () => {
      const t = location.hash.slice(1);
      if (!t) showHome(false);
      else if (/^[A-Za-z0-9_]+$/.test(t) && t + '.dc.html' !== current) show(t + '.dc.html', false).catch(() => showHome(false));
    });
    window.addEventListener('popstate', (e) => {
      const f = e.state && e.state.screen;
      if (f) show(f, false); else showHome(false);
    });

    const start = location.hash.slice(1);
    if (start && /^[A-Za-z0-9_]+$/.test(start)) {
      history.replaceState({ screen: start + '.dc.html' }, '');
      show(start + '.dc.html', false).catch(() => showHome(false));
    } else {
      history.replaceState({ screen: null }, '');
    }
  }

  // ---- Standalone mode: this file is itself a screen ----
  function startStandalone() {
    const root = document.querySelector('x-dc');
    if (!root) return;
    const helmet = root.querySelector('helmet');
    if (helmet) { takeHelmet(helmet, false); helmet.remove(); }
    const tpl = document.createDocumentFragment();
    while (root.firstChild) tpl.appendChild(root.firstChild);
    const file = decodeURIComponent(location.pathname.split('/').pop());
    mount(root, tpl, document.querySelector('script[type="text/x-dc"]'), file);
    present(root);
    chrome();
    const back = document.createElement('a');
    back.className = 'dc-home';
    back.href = 'index.html';
    back.textContent = '\u2190 All screens';
    document.body.appendChild(back);
  }

  function start() {
    if (document.getElementById('dc-screen')) startPrototype();
    else startStandalone();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
