const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../settings');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const locale of ['en', 'fi']) {
  for (const delayed of [false, true]) {
  for (const retry of [false, true]) {
    const errors = [];
    const requests = [];
    let ready = 0;
    const translations = JSON.parse(fs.readFileSync(path.resolve(root, '../locales/' + locale + '.json'), 'utf8'));
    for (const filename of fs.readdirSync(root).filter(name => /\.(html|js)$/.test(name))) {
      const source = fs.readFileSync(path.join(root, filename), 'utf8');
      for (const match of source.matchAll(/(?:__\(['"]|data-i18n=['"])([\w.]+)['"]/g)) {
        if (match[1].endsWith('_')) continue; // Dynamic power_node_1…6 keys are exercised during rendering.
        const value = match[1].split('.').reduce((entry, part) => entry?.[part], translations);
        assert.equal(typeof value, 'string', 'Missing translation: ' + locale + ':' + match[1]);
      }
    }
    const sdk = { language: locale, ready() { ready++; }, __(key) { const value = key.split('.').reduce((entry, part) => entry?.[part], translations); assert.equal(typeof value, 'string', 'Missing translation: ' + locale + ':' + key); return value; },
      api(method, route, body, callback) { requests.push(route); }, get(key, callback) { callback(null, null); } };
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error));
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://homey.test/settings', virtualConsole });
    const window = dom.window;
    window.HTMLElement.prototype.scrollIntoView = function() {};
    window.Homey = delayed ? {} : sdk;
    // Run every local script in document order, including inline initialization.
    for (const script of window.document.querySelectorAll('script')) {
      if (script.src.endsWith('/homey.js')) continue;
      const source = script.hasAttribute('src')
        ? fs.readFileSync(path.join(root, script.getAttribute('src')), 'utf8') : script.textContent;
      if (retry && script.getAttribute('src') === 'studio-init.js') {
        vm.runInContext("const originalRenderUI = renderUI; let failStartup = true; renderUI = function() { if (failStartup) throw new Error('simulated render failure'); return originalRenderUI(); };", dom.getInternalVMContext());
      }
      vm.runInContext(source, dom.getInternalVMContext(), { filename: script.getAttribute('src') || 'index.html' });
    }
    if (delayed) {
      assert.equal(ready, 0);
      assert.equal(requests.length, 0);
      window.onHomeyReady(sdk);
    }
    if (retry) {
      assert.equal(window.document.getElementById('studio-startup-error').hidden, false);
      vm.runInContext('failStartup = false', dom.getInternalVMContext());
      // Execute the real retry button handler in the shared script context.
      const button = window.document.querySelector('#studio-startup-error button');
      vm.runInContext(button.getAttribute('onclick'), dom.getInternalVMContext());
    }
    assert.equal(ready, 1);
    assert.equal(window.document.getElementById('studio-startup-error').hidden, true, window.document.getElementById('studio-startup-error-text').textContent);
    assert(window.document.getElementById('page-select').options.length > 0);
    window.openStudioSettings('panel');
    assert.equal(window.document.getElementById('editor-title').textContent, translations.studio.ux.panel_title);
    window.openStudioSettings('services');
    assert.equal(window.document.getElementById('settings-scope').textContent, translations.studio.ux.shared_scope);
    const initialRequests = requests.length;
    window.startStudio();
    assert.equal(requests.length, initialRequests);
    assert.equal(ready, 1);
    assert.deepEqual(errors, []);
    dom.window.close();
  }
  }
}
console.log('Studio whole-page startup passed (English/Finnish, immediate/delayed SDK).');
