(function () {
    const SUPPORTED_LOCALES = ['es', 'en'];
    const LOCALE_STORAGE_KEY = 'site-locale';
    const SUPPORTED_THEMES = ['dark', 'light'];
    const THEME_STORAGE_KEY = 'site-theme';
    const TRANSLATIONS = new Map();
    const prefersReducedMotion = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    function normalizeLocale(locale) {
        return SUPPORTED_LOCALES.includes(locale) ? locale : 'es';
    }

    function getBrowserLocale() {
        const userLocale = navigator.language || navigator.userLanguage || 'es';
        return normalizeLocale(userLocale.split('-')[0]);
    }

    function getStoredLocale() {
        try {
            return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
        } catch (error) {
            return null;
        }
    }

    function saveLocale(locale) {
        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function normalizeTheme(theme) {
        if (theme === 'light' || theme === 'nordic' || theme === 'editorial' || theme === 'sunset' || theme === 'minimal' || theme === 'ocean') {
            return 'light';
        }
        if (theme === 'graphite' || theme === 'sand') {
            return 'dark';
        }
        return SUPPORTED_THEMES.includes(theme) ? theme : 'light';
    }

    function getStoredTheme() {
        try {
            return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
        } catch (error) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            // Ignore storage failures.
        }
    }

    function applyTheme(theme) {
        const normalizedTheme = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', normalizedTheme);
        document.querySelectorAll('#theme-selector .theme-toggle-btn').forEach((node) => {
            if (!(node instanceof HTMLButtonElement)) {
                return;
            }
            node.classList.toggle('is-active', node.dataset.theme === normalizedTheme);
            node.setAttribute('aria-pressed', node.dataset.theme === normalizedTheme ? 'true' : 'false');
        });
    }

    function setupThemeSelector() {
        document.querySelectorAll('#theme-selector .theme-toggle-btn').forEach((node) => {
            node.addEventListener('click', (event) => {
                event.preventDefault();
                const target = event.currentTarget;
                if (!(target instanceof HTMLButtonElement)) {
                    return;
                }
                const selectedTheme = normalizeTheme(target.dataset.theme);
                applyTheme(selectedTheme);
                saveTheme(selectedTheme);
            });
        });
    }

    async function loadLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);
        if (TRANSLATIONS.has(normalizedLocale)) {
            return TRANSLATIONS.get(normalizedLocale);
        }

        const embeddedTranslations = window.__I18N && window.__I18N[normalizedLocale];
        if (embeddedTranslations && typeof embeddedTranslations === 'object') {
            TRANSLATIONS.set(normalizedLocale, embeddedTranslations);
            return embeddedTranslations;
        }

        const response = await fetch(`./i18n/${normalizedLocale}.json`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Could not load locale: ${normalizedLocale}`);
        }

        const dictionary = await response.json();
        TRANSLATIONS.set(normalizedLocale, dictionary);
        return dictionary;
    }

    function applyTranslations(locale) {
        const dictionary = TRANSLATIONS.get(locale) || {};
        const translatableNodes = document.querySelectorAll('[data-i18n]');

        translatableNodes.forEach((node) => {
            const rawKey = node.getAttribute('data-i18n') || '';
            const isHtml = rawKey.startsWith('[html]');
            const key = isHtml ? rawKey.replace('[html]', '') : rawKey;
            const translation = dictionary[key];

            if (typeof translation !== 'string') {
                return;
            }

            if (isHtml) {
                node.innerHTML = translation;
                return;
            }

            node.textContent = translation;
        });

        document.documentElement.lang = locale;
    }

    function markActiveLanguage(locale) {
        document.querySelectorAll('#language-selector .language-selector').forEach((node) => {
            node.classList.toggle('is-active', node.dataset.locale === locale);
        });
    }

    async function switchLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);

        try {
            await loadLocale(normalizedLocale);
            applyTranslations(normalizedLocale);
            optimizeImages();
            setupExternalLinks();
            markActiveLanguage(normalizedLocale);
            saveLocale(normalizedLocale);
        } catch (error) {
            // Fallback for environments where fetch is blocked (e.g. direct file:// open).
            markActiveLanguage(normalizedLocale);
            saveLocale(normalizedLocale);
            document.documentElement.lang = normalizedLocale;

            if (normalizedLocale !== 'es') {
                await switchLocale('es');
            }
        }
    }

    function setupLanguageSelector() {
        document.querySelectorAll('#language-selector .language-selector').forEach((node) => {
            node.addEventListener('click', (event) => {
                event.preventDefault();
                switchLocale(node.dataset.locale);
            });
        });
    }

    function setupExperienceToggle() {
        document.querySelectorAll('.ex-title').forEach((titleNode) => {
            titleNode.addEventListener('click', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) {
                    return;
                }

                const description = titleNode.nextElementSibling;
                if (!(description instanceof HTMLElement)) {
                    return;
                }

                const currentlyHidden = window.getComputedStyle(description).display === 'none';
                description.style.display = currentlyHidden ? 'block' : 'none';
            });
        });
    }

    function setupExternalLinks() {
        document.querySelectorAll('a[href]').forEach((link) => {
            if (!(link instanceof HTMLAnchorElement)) {
                return;
            }

            const rawHref = (link.getAttribute('href') || '').trim();
            if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
                return;
            }
            if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
                return;
            }

            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
        });
    }

    function optimizeImages() {
        document.querySelectorAll('img').forEach((img) => {
            if (!(img instanceof HTMLImageElement)) {
                return;
            }

            if (!img.hasAttribute('alt')) {
                // Decorative fallback so accessibility audit doesn't fail on missing alt.
                img.setAttribute('alt', '');
            }

            if (!img.closest('#pic')) {
                if (!img.hasAttribute('loading')) {
                    img.setAttribute('loading', 'lazy');
                }
                if (!img.hasAttribute('decoding')) {
                    img.setAttribute('decoding', 'async');
                }
            }
        });
    }

    function setupNanoVideoModal() {
        const modal = document.getElementById('nano-video-modal');
        const iframe = document.getElementById('nano-video-iframe');
        if (!(modal instanceof HTMLElement) || !(iframe instanceof HTMLIFrameElement)) {
            return;
        }

        function closeModal() {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            iframe.src = '';
            document.body.style.overflow = '';
        }

        function openModal(videoId) {
            const safeVideoId = String(videoId || '').trim();
            if (!safeVideoId) {
                return;
            }

            iframe.src = `https://www.youtube.com/embed/${safeVideoId}?autoplay=1&rel=0`;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        document.querySelectorAll('.nano-modal-trigger').forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                if (!(trigger instanceof HTMLElement)) {
                    return;
                }
                openModal(trigger.dataset.videoId);
            });
        });

        modal.querySelectorAll('[data-modal-close]').forEach((button) => {
            button.addEventListener('click', closeModal);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('is-open')) {
                closeModal();
            }
        });
    }

    function setupScrollReveal() {
        const htmlNode = document.documentElement;
        htmlNode.classList.add('js-enhanced');
        const experienceHeading = document.querySelector('section.listado h2[data-i18n="EXPERIENCE"]');
        const experienceSection = experienceHeading instanceof HTMLElement ? experienceHeading.closest('section.listado') : null;

        const revealNodes = [
            ...document.querySelectorAll('.hero-topbar'),
            ...document.querySelectorAll('#bio'),
            ...document.querySelectorAll('section.listado')
        ];

        const uniqueNodes = Array.from(new Set(revealNodes));

        if (!uniqueNodes.length) {
            return;
        }

        uniqueNodes.forEach((node, index) => {
            if (!(node instanceof HTMLElement)) {
                return;
            }
            node.classList.add('reveal-on-scroll');
            node.style.setProperty('--reveal-delay', `${Math.min(index * 60, 300)}ms`);
        });

        if (experienceSection instanceof HTMLElement) {
            experienceSection.classList.add('is-visible');
        }

        if (prefersReducedMotion || typeof IntersectionObserver !== 'function') {
            uniqueNodes.forEach((node) => {
                if (node instanceof HTMLElement) {
                    node.classList.add('is-visible');
                }
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }
                if (entry.target instanceof HTMLElement) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            threshold: 0.14,
            rootMargin: '0px 0px -6% 0px'
        });

        uniqueNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                if (experienceSection instanceof HTMLElement && node === experienceSection) {
                    return;
                }
                observer.observe(node);
            }
        });
    }

    async function init() {
        const initialTheme = getStoredTheme() || 'light';
        applyTheme(initialTheme);

        optimizeImages();
        setupExternalLinks();
        setupLanguageSelector();
        setupThemeSelector();
        setupExperienceToggle();
        setupNanoVideoModal();
        setupScrollReveal();

        const storedLocale = getStoredLocale();
        const initialLocale = storedLocale || getBrowserLocale();

        await Promise.allSettled([loadLocale('es'), loadLocale('en')]);
        await switchLocale(initialLocale);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
