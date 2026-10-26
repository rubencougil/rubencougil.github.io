const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const analytics = readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
const bootstrap = readFileSync(path.join(root, 'js/google-analytics.js'), 'utf8');

function setup() {
    const events = [];
    const listeners = {};
    const sections = [{ id: 'projects' }, { id: 'experience' }];
    let observer;
    class Element {
        constructor(matches = {}) {
            this.matches = matches;
        }
        closest(selector) {
            return this.matches[selector] || null;
        }
    }
    const document = {
        documentElement: { lang: 'es' },
        addEventListener: (name, callback) => { listeners[name] = callback; },
        querySelectorAll: () => sections
    };
    const window = {
        location: { href: 'https://ruben.cougil.com/' },
        gtag: (...args) => events.push(args)
    };
    vm.runInNewContext(analytics, {
        window, document, Element, URL,
        IntersectionObserver: class {
            constructor(callback) {
                observer = { callback, observed: [], removed: [] };
            }
            observe(section) { observer.observed.push(section); }
            unobserve(section) { observer.removed.push(section); }
        }
    });
    return { events, listeners, document, window, Element, sections, getObserver: () => observer };
}

test('project events use stable paths without query strings or fragments', () => {
    const app = setup();
    const link = new app.Element({ '#projects': {} });
    link.href = 'https://ruben.cougil.com/assets/gameboy/index.html?private=value#photo';
    app.listeners.click({ target: new app.Element({ 'a[href]': link }) });
    assert.equal(app.events[0][1], 'project_open');
    assert.equal(app.events[0][2].project_id, '/assets/gameboy/');
    assert.equal(app.events[0][2].site_language, 'es');
});

test('contact events never include the address or phone number', () => {
    const app = setup();
    for (const [href, method] of [['mailto:private@example.com?subject=hello', 'email'], ['tel:+34123456789', 'phone']]) {
        const link = new app.Element();
        link.href = href;
        app.listeners.click({ target: new app.Element({ 'a[href]': link }) });
        const event = app.events.at(-1);
        assert.equal(event[1], 'contact_click');
        assert.equal(event[2].contact_method, method);
        assert.equal(JSON.stringify(event).includes('private'), false);
        assert.equal(JSON.stringify(event).includes('123456789'), false);
    }
});

test('only personal social profiles generate social events', () => {
    const app = setup();
    for (const href of ['https://github.com/rubencougil/', 'https://github.com/other', 'https://www.adobe.com/']) {
        const link = new app.Element();
        link.href = href;
        app.listeners.click({ target: new app.Element({ 'a[href]': link }) });
    }
    assert.equal(app.events.length, 1);
    assert.equal(app.events[0][1], 'social_click');
});

test('expanded details, videos and language changes have distinct events', () => {
    const app = setup();
    let expanded = 'false';
    const toggle = { getAttribute: (name) => name === 'aria-expanded' ? expanded : 'adobe-description' };
    app.listeners.click({ target: new app.Element({ '.ex-title': toggle }) });
    assert.equal(app.events.length, 0);
    expanded = 'true';
    app.listeners.click({ target: new app.Element({ '.ex-title': toggle }) });
    assert.equal(app.events[0][1], 'experience_expand');
    assert.equal(app.events[0][2].item_id, 'adobe-description');
    app.listeners.click({ target: new app.Element({ '.nano-modal-trigger': { dataset: { videoId: 'demo' } } }) });
    assert.equal(app.events[1][1], 'project_video_open');
    app.document.documentElement.lang = 'en';
    app.listeners['site:language-change']();
    assert.equal(app.events[2][1], 'language_change');
    assert.equal(app.events[2][2].site_language, 'en');
});

test('visible sections are unobserved after recording and unavailable analytics is harmless', () => {
    const app = setup();
    app.listeners.DOMContentLoaded();
    const observer = app.getObserver();
    assert.equal(observer.observed.length, 2);
    observer.callback([{ target: app.sections[0], isIntersecting: true, intersectionRatio: 0.1 }]);
    assert.equal(app.events.length, 0);
    observer.callback([{ target: app.sections[0], isIntersecting: true, intersectionRatio: 0.5 }]);
    assert.equal(app.events[0][1], 'section_view');
    assert.equal(observer.removed[0], app.sections[0]);
    delete app.window.gtag;
    assert.doesNotThrow(() => app.listeners['site:language-change']());
});

test('GA bootstrap runs only on production hosts and keeps deferred loading', () => {
    for (const hostname of ['localhost', '127.0.0.1', '', 'preview.example.com', 'ruben.cougil.com', 'rubencougil.github.io']) {
        const callbacks = {};
        const scripts = [];
        const window = {
            location: { hostname, href: `https://${hostname || 'localhost'}/assets/gameboy/index.html?utm_source=test#preview` },
            addEventListener: (name, callback) => { callbacks[name] = callback; },
            setTimeout: (callback) => callback()
        };
        const document = {
            querySelector: () => null,
            createElement: () => ({ dataset: {} }),
            head: { appendChild: (script) => scripts.push(script) }
        };
        vm.runInNewContext(bootstrap, { window, document, URL });
        if (hostname === 'ruben.cougil.com' || hostname === 'rubencougil.github.io') {
            assert.equal(window.dataLayer.length, 2);
            assert.equal(window.dataLayer[1][2].page_location, `https://${hostname}/assets/gameboy/?utm_source=test`);
            assert.equal(scripts.length, 0);
            callbacks.load();
            assert.equal(scripts.length, 1);
            assert.ok(scripts[0].src.includes('G-XP27FQB93K'));
        } else {
            assert.equal(window.gtag, undefined);
            assert.equal(window.trackProjectEvent, undefined);
            assert.equal(scripts.length, 0);
        }
    }
});

test('project events expose only the stable project path and sharing method', () => {
    const window = {
        location: {
            hostname: 'ruben.cougil.com',
            href: 'https://ruben.cougil.com/assets/gameboy/index.html?private=value#photo'
        },
        addEventListener: () => {}
    };
    vm.runInNewContext(bootstrap, { window, document: {}, URL });
    window.trackProjectEvent('image_convert');
    window.trackProjectEvent('share', 'copy_link');
    const events = window.dataLayer.filter(event => event[0] === 'event');
    assert.equal(events.length, 2);
    assert.equal(events[0][1], 'image_convert');
    assert.deepEqual(Object.keys(events[0][2]), ['project_id']);
    assert.equal(events[0][2].project_id, '/assets/gameboy/');
    assert.equal(events[1][2].method, 'copy_link');
    assert.equal(JSON.stringify(events).includes('private'), false);
    window.gtag = () => { throw new Error('Analytics unavailable'); };
    assert.doesNotThrow(() => window.trackProjectEvent('image_download'));
});

test('homepage and all four projects reference the same shared bootstrap exactly once', () => {
    for (const file of ['index.html', ...['gameboy', 'emoji-trainer', 'itsawonderfulworld', 'mochilo-zx'].map(project => `assets/${project}/index.html`)]) {
        const fullPath = path.join(root, file);
        const html = readFileSync(fullPath, 'utf8');
        const references = [...html.matchAll(/<script\b[^>]*src="([^"]*google-analytics\.js)"[^>]*>/g)];
        assert.equal(references.length, 1, file);
        assert.equal(path.resolve(path.dirname(fullPath), references[0][1]), path.join(root, 'js/google-analytics.js'));
        assert.ok(references[0][0].includes('defer'));
        assert.equal(html.includes('googletagmanager.com/gtag/js'), false);
    }
});

test('shared bootstrap supports idle loading, late initialization and an existing loader', () => {
    for (const readyState of ['loading', 'complete']) {
        const callbacks = {};
        const scripts = [];
        const window = {
            location: { hostname: 'ruben.cougil.com', href: 'https://ruben.cougil.com/index.html' },
            addEventListener: (name, callback) => { callbacks[name] = callback; },
            requestIdleCallback: (callback, options) => {
                assert.equal(options.timeout, 4000);
                callbacks.idle = callback;
            }
        };
        const document = {
            readyState,
            querySelector: () => scripts[0] || null,
            createElement: () => ({ dataset: {} }),
            head: { appendChild: (script) => scripts.push(script) }
        };
        vm.runInNewContext(bootstrap, { window, document, URL });
        if (readyState === 'loading') {
            assert.equal(callbacks.idle, undefined);
            callbacks.load();
        }
        assert.equal(scripts.length, 0);
        callbacks.idle();
        callbacks.idle();
        assert.equal(scripts.length, 1);
        assert.equal(window.dataLayer[1][2].page_location, 'https://ruben.cougil.com/');
    }
});
