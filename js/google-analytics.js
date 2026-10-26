(function () {
    if (!['ruben.cougil.com', 'rubencougil.github.io'].includes(window.location.hostname)) {
        return;
    }

    const measurementId = 'G-XP27FQB93K';
    const pageLocation = new URL(window.location.href);
    pageLocation.pathname = pageLocation.pathname.replace(/\/index\.html$/, '/');
    pageLocation.hash = '';

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { page_location: pageLocation.href });

    window.trackProjectEvent = function (name, method) {
        try {
            window.gtag('event', name, {
                project_id: pageLocation.pathname,
                ...(method ? { method } : {})
            });
        } catch (error) {
            // Analytics must not interrupt the project.
        }
    };

    function loadAnalyticsScript() {
        if (document.querySelector('script[data-gtag-loader="true"]')) {
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        script.dataset.gtagLoader = 'true';
        document.head.appendChild(script);
    }

    function scheduleAnalytics() {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(loadAnalyticsScript, { timeout: 4000 });
        } else {
            window.setTimeout(loadAnalyticsScript, 1200);
        }
    }

    if (document.readyState === 'complete') {
        scheduleAnalytics();
    } else {
        window.addEventListener('load', scheduleAnalytics, { once: true });
    }
})();
