(function () {
    function track(name, parameters = {}) {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, {
                ...parameters,
                site_language: document.documentElement.lang
            });
        }
    }

    document.addEventListener('site:language-change', () => {
        track('language_change');
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const link = event.target.closest('a[href]');
        if (link) {
            const url = new URL(link.href, window.location.href);
            if (link.closest('#projects')) {
                track('project_open', { project_id: url.pathname.replace(/\/index\.html$/, '/') });
            } else if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
                track('contact_click', { contact_method: url.protocol === 'mailto:' ? 'email' : 'phone' });
            } else {
                const profiles = {
                    'www.linkedin.com': '/in/rcougil',
                    'github.com': '/rubencougil',
                    'x.com': '/rcougil'
                };
                if (profiles[url.hostname] === url.pathname.replace(/\/$/, '')) {
                    track('social_click', { social_network: url.hostname });
                }
            }
        }

        const toggle = event.target.closest('.ex-title');
        if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
            track('experience_expand', { item_id: toggle.getAttribute('aria-controls') });
        }

        const video = event.target.closest('.nano-modal-trigger');
        if (video) {
            track('project_video_open', { video_id: video.dataset.videoId });
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof IntersectionObserver !== 'function') {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
                    track('section_view', { section_id: entry.target.id });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('main section[id]').forEach((section) => {
            observer.observe(section);
        });
    });
})();
