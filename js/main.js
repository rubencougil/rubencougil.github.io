(function () {
    const SUPPORTED_LOCALES = ['es', 'en'];
    const LOCALE_STORAGE_KEY = 'site-locale';
    const SUPPORTED_THEMES = ['dark', 'graphite', 'nordic'];
    const THEME_STORAGE_KEY = 'site-theme';
    const TRANSLATIONS = new Map();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        if (theme === 'editorial' || theme === 'sunset' || theme === 'minimal' || theme === 'ocean') {
            return 'nordic';
        }
        if (theme === 'sand') {
            return 'graphite';
        }
        return SUPPORTED_THEMES.includes(theme) ? theme : 'nordic';
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

        const selector = document.getElementById('theme-selector');
        if (selector instanceof HTMLSelectElement) {
            selector.value = normalizedTheme;
        }
    }

    function setupThemeSelector() {
        const selector = document.getElementById('theme-selector');
        if (!(selector instanceof HTMLSelectElement)) {
            return;
        }

        selector.addEventListener('change', () => {
            const selectedTheme = normalizeTheme(selector.value);
            applyTheme(selectedTheme);
            saveTheme(selectedTheme);
        });
    }

    async function loadLocale(locale) {
        const normalizedLocale = normalizeLocale(locale);
        if (TRANSLATIONS.has(normalizedLocale)) {
            return TRANSLATIONS.get(normalizedLocale);
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
                observer.observe(node);
            }
        });
    }

    function ensureHtml2PdfLoaded() {
        if (typeof window.html2pdf === 'function') {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[data-html2pdf-fallback="true"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve());
                existingScript.addEventListener('error', () => reject(new Error('Could not load PDF library')));
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.async = true;
            script.dataset.html2pdfFallback = 'true';
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () => reject(new Error('Could not load PDF library')));
            document.head.appendChild(script);
        });
    }

    async function setupPdfDownload() {
        const pdfButton = document.getElementById('pdf-download');
        if (!(pdfButton instanceof HTMLButtonElement)) {
            return;
        }

        pdfButton.addEventListener('click', async () => {
            const profileNode = document.getElementById('main');
            if (!(profileNode instanceof HTMLElement)) {
                return;
            }

            const originalButtonText = pdfButton.textContent || '';
            const loadingText = document.documentElement.lang === 'en' ? 'Generating PDF...' : 'Generando PDF...';
            const hiddenSections = [];

            document.querySelectorAll('.ex-description').forEach((section) => {
                if (!(section instanceof HTMLElement)) {
                    return;
                }
                if (window.getComputedStyle(section).display === 'none') {
                    hiddenSections.push(section);
                    section.style.display = 'block';
                }
            });

            pdfButton.disabled = true;
            pdfButton.textContent = loadingText;
            document.body.classList.add('pdf-exporting');

            try {
                await ensureHtml2PdfLoaded();
                // Wait two frames so PDF styles are fully applied before canvas capture.
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                const options = {
                    margin: [0.24, 0.28, 0.34, 0.28],
                    filename: 'ruben_cougil_profile.pdf',
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        scrollY: 0,
                        backgroundColor: '#ffffff',
                        windowWidth: profileNode.scrollWidth,
                        windowHeight: profileNode.scrollHeight
                    },
                    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: ['css', 'legacy', 'avoid-all'] }
                };

                await window.html2pdf().set(options).from(profileNode).save();
            } catch (error) {
                console.error(error);
            } finally {
                hiddenSections.forEach((section) => {
                    section.style.display = 'none';
                });
                document.body.classList.remove('pdf-exporting');
                pdfButton.disabled = false;
                pdfButton.textContent = originalButtonText;
            }
        });
    }

    async function init() {
        const initialTheme = getStoredTheme() || 'nordic';
        applyTheme(initialTheme);

        optimizeImages();
        setupExternalLinks();
        setupLanguageSelector();
        setupThemeSelector();
        setupExperienceToggle();
        setupNanoVideoModal();
        setupScrollReveal();
        await setupPdfDownload();

        const storedLocale = getStoredLocale();
        const initialLocale = storedLocale || getBrowserLocale();

        await Promise.allSettled([loadLocale('es'), loadLocale('en')]);
        await switchLocale(initialLocale);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
