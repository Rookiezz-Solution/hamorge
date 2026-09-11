'use client';

import Script from 'next/script';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_ID, META_PIXEL_ID, trackPageView } from '@/lib/analytics';

/**
 * Loads GA4 (gtag.js) and the Meta Pixel, and reports a page view on every
 * client-side route change.
 *
 * The command queues (`gtag`, `fbq`) are defined in inline scripts that run while
 * the HTML is parsed — before React hydrates — so any event fired from an effect
 * is queued rather than dropped. The heavy library files then load
 * `afterInteractive` and flush the queue.
 *
 * Automatic page views are turned OFF in both SDKs: `PageViewTracker` sends them
 * instead, so a soft navigation counts exactly like a hard one and the Pixel copy
 * carries an event_id the server twin can deduplicate against.
 */

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    // React runs effects twice in dev StrictMode — don't double-count.
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export default function Analytics() {
  if (!GA_ID && !META_PIXEL_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <script
            id="ga-queue"
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });`,
            }}
          />
          <Script
            id="ga-lib"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
        </>
      )}

      {META_PIXEL_ID && (
        <>
          <script
            id="meta-queue"
            dangerouslySetInnerHTML={{
              __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document);
fbq('init', '${META_PIXEL_ID}');`,
            }}
          />
          <Script
            id="meta-lib"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/fbevents.js"
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
