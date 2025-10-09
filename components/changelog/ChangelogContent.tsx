'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export function ChangelogContent() {
  const [markdown, setMarkdown] = useState<string>('');
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  const changelogHeading = tNav('changelog');
  const loadingLabel = tCommon('loading');
  const errorLabel = tCommon('error');
  const sourceLabel = tCommon('source');
  const notAvailableLabel = tCommon('na');
  const baseUrl = process.env.NEXT_PUBLIC_NOS_API_BASE;
  const changelogUrl = useMemo(() => (baseUrl ? `${baseUrl}/v3/changelog` : null), [baseUrl]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!changelogUrl) {
        setErrorMessage('NOS API base URL is not configured.');
        setStatus('error');
        return;
      }

      try {
        const response = await fetch(changelogUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as { markdown?: string } | null;
        if (cancelled) return;

        if (payload?.markdown) {
          setMarkdown(payload.markdown);
          setStatus('success');
        } else {
          setErrorMessage('No changelog content found.');
          setStatus('error');
        }
      } catch (error) {
        if (cancelled) return;
        const reason = error instanceof Error ? error.message : 'Unknown error';
        setErrorMessage(reason);
        setStatus('error');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [changelogUrl]);

  const renderContent = () => {
    if (status === 'loading') {
      return <p className="text-muted-foreground">{loadingLabel}</p>;
    }

    if (status === 'error') {
      return (
        <p className="text-red-400">
          {errorLabel}
          {errorMessage ? `: ${errorMessage}` : null}
        </p>
      );
    }

    if (status === 'success') {
      return <ReactMarkdown>{markdown || ''}</ReactMarkdown>;
    }

    return null;
  };

  return (
    <div className="prose prose-invert mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{changelogHeading}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">{sourceLabel}:</span>{' '}
          {changelogUrl ?? notAvailableLabel}
        </p>
      </header>

      <section>{renderContent()}</section>
    </div>
  );
}
