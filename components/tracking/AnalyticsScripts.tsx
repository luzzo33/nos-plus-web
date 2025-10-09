'use client';

import Script from 'next/script';

const SEO_MODE = process.env.NEXT_PUBLIC_SEO_MODE ?? 'beta';
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export function AnalyticsScripts() {
  if (SEO_MODE !== 'live') {
    return null;
  }

  const hasGtm = Boolean(GTM_ID);
  const hasGa = Boolean(GA_MEASUREMENT_ID);

  if (!hasGtm && !hasGa) {
    return null;
  }

  return (
    <>
      {hasGtm ? (
        <Script id="gtm-loader" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id=' + i + dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      ) : null}
      {hasGa ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-loader" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      ) : null}
    </>
  );
}
