'use client';

import Script, { type ScriptProps } from 'next/script';

type StructuredDataProps = {
  id: string;
  data: unknown;
  strategy?: ScriptProps['strategy'];
};

export function StructuredData({ id, data, strategy = 'afterInteractive' }: StructuredDataProps) {
  if (!data) {
    return null;
  }

  const json = JSON.stringify(data, null, 2);

  return (
    <Script id={id} strategy={strategy} type="application/ld+json">
      {json}
    </Script>
  );
}
