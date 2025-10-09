'use client';

import { useEffect, useMemo, useRef } from 'react';
import Script from 'next/script';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { buildNosApiUrl } from '@/lib/api/monitorConfig';

const SPEC_URL = '/v3/swagger.json';

function localizeValue(val: unknown, t: (k: string) => string): unknown {
  if (typeof val === 'string' && val.startsWith('i18n:')) {
    const key = val.slice(5);
    try {
      return t(key);
    } catch {
      return key;
    }
  }
  return val;
}

function deepLocalize(obj: any, t: (k: string) => string): any {
  if (Array.isArray(obj)) return obj.map((v) => deepLocalize(v, t));
  if (obj && typeof obj === 'object') {
    const out: any = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$ref') {
        out[k] = v;
        continue;
      }
      if (typeof v === 'string') out[k] = localizeValue(v, t);
      else out[k] = deepLocalize(v, t);
    }
    return out;
  }
  return localizeValue(obj, t);
}

export default function ApiDocsPage() {
  const t = useTranslations('docs');
  const tOpen = useTranslations();
  const tStoplight = useTranslations('docs.stoplight');
  const elementsRef = useRef<HTMLElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const id = 'stoplight-elements-styles';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/@stoplight/elements/styles.min.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const local = await fetch(SPEC_URL, { cache: 'no-store' });
        const remoteSpecUrl = buildNosApiUrl('/v3/swagger.json');
        const specResponse = local.ok ? local : await fetch(remoteSpecUrl, { cache: 'no-store' });
        if (!specResponse.ok) return;
        const spec = await specResponse.json();
        if (cancelled) return;
        const localized = deepLocalize(spec, (k) => tOpen(k));
        await (customElements?.whenDefined?.('elements-api') ?? Promise.resolve());
        const el = elementsRef.current as any;
        if (el) {
          el.apiDescriptionDocument = localized;
          el.router = 'hash';
          el.layout = 'responsive';
        }
      } catch (e) {}
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tOpen]);

  useEffect(() => {
    const el = elementsRef.current;
    if (!el) return;
    const isDark = resolvedTheme === 'dark';
    const labelTranslations = new Map<string, string>([
      ['Request', tStoplight('request')],
      ['Query Parameters', tStoplight('queryParameters')],
      ['Responses', tStoplight('responses')],
      ['Response Example', tStoplight('responseExample')],
      ['Endpoints', tStoplight('endpoints')],
      ['Schemas', tStoplight('schemas')],
      ['ENDPOINTS', tStoplight('endpoints')],
      ['SCHEMAS', tStoplight('schemas')],
      ['powered by Stoplight', tStoplight('poweredBy')],
      ['Powered by Stoplight', tStoplight('poweredBy')],
      ['POWERED BY STOPLIGHT', tStoplight('poweredBy')],
      ['Send API Request', tStoplight('sendRequest')],
      ['SEND API REQUEST', tStoplight('sendRequest')],
      ['Allowed values:', tStoplight('allowedValues')],
      ['Allowed values', tStoplight('allowedValues')],
      ['ALLOWED VALUES:', tStoplight('allowedValues')],
      ['Body', tStoplight('body')],
      ['BODY', tStoplight('body')],
      ['Not Set', tStoplight('notSet')],
      ['NOT SET', tStoplight('notSet')],
      ['select an option', tStoplight('selectAnOption')],
      ['Select an option', tStoplight('selectAnOption')],
      ['SELECT AN OPTION', tStoplight('selectAnOption')],
    ]);

    const localizeLabels = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null = walker.currentNode;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const parent = (node as Text).parentElement;
          const raw = node.textContent?.trim();
          const translated = raw && labelTranslations.get(raw);
          if (parent && translated && node.textContent !== translated) {
            if (!['CODE', 'PRE'].includes(parent.tagName)) {
              node.textContent = translated;
            }
          }
        }
        node = walker.nextNode();
      }
    };
    el.setAttribute('data-theme', isDark ? 'dark' : 'light');
    el.classList.toggle('sl-theme--dark', isDark);
    el.classList.toggle('sl-theme--light', !isDark);

    const setVar = (k: string, v: string) => (el as HTMLElement).style.setProperty(k, v);
    if (isDark) {
      setVar('--sl-color-text', '#e5e7eb');
      setVar('--sl-color-body', '#e5e7eb');
      setVar('--sl-color-muted', '#9ca3af');
      setVar('--sl-color-primary', '#0ea5e9');
      setVar('--sl-color-border', '#1f2937');
      setVar('--sl-color-canvas-50', '#101826');
      setVar('--sl-color-canvas-100', '#0b0f17');
      setVar('--sl-color-canvas-200', '#0f172a');
    } else {
      setVar('--sl-color-text', '#111827');
      setVar('--sl-color-body', '#111827');
      setVar('--sl-color-muted', '#6b7280');
      setVar('--sl-color-primary', '#0ea5e9');
      setVar('--sl-color-border', '#e5e7eb');
      setVar('--sl-color-canvas-50', '#ffffff');
      setVar('--sl-color-canvas-100', '#f8fafc');
      setVar('--sl-color-canvas-200', '#f1f5f9');
    }

    const cssDark = `
      :host { --sl-color-text: #e5e7eb; }
      .sl-panel__content-wrapper, .sl-code-viewer, .sl-code, pre, code { background-color: #0b0f17 !important; color: #e5e7eb !important; }
      .sl-code-highlight__ln { color: #9ca3af !important; }
      .token.plain { color: #e5e7eb !important; }
      .token.string { color: #86efac !important; }
      .token.number { color: #fca5a5 !important; }
      .token.boolean { color: #fde68a !important; }
      .token.null { color: #a5b4fc !important; }
      .token.property, .token.key { color: #93c5fd !important; }
      .token.operator { color: #f472b6 !important; }
      .token.punctuation { color: #9ca3af !important; }
    `;
    const cssLight = `
      .sl-panel__content-wrapper, .sl-code-viewer, .sl-code, pre, code { background-color: #f8fafc !important; color: #111827 !important; }
      .sl-code-highlight__ln { color: #6b7280 !important; }
      .token.plain { color: #111827 !important; }
      .token.string { color: #166534 !important; }
      .token.number { color: #991b1b !important; }
      .token.boolean { color: #854d0e !important; }
      .token.null { color: #1e40af !important; }
      .token.property, .token.key { color: #1d4ed8 !important; }
      .token.operator { color: #a21caf !important; }
      .token.punctuation { color: #6b7280 !important; }
    `;

    const STYLE_ID = 'nos-custom-code-theme';

    const visited = new Set<ShadowRoot>();
    const injectIntoRoot = (root: ShadowRoot) => {
      if (visited.has(root)) return;
      visited.add(root);
      let style = root.getElementById(STYLE_ID) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        root.appendChild(style);
      }
      style.textContent = isDark ? cssDark : cssLight;
      localizeLabels(root);
    };

    const collectShadowRoots = (node: Node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
      let current: Node | null = walker.currentNode;
      while (current) {
        const elNode = current as HTMLElement & { shadowRoot?: ShadowRoot | null };
        if (elNode.shadowRoot) {
          injectIntoRoot(elNode.shadowRoot);
          collectShadowRoots(elNode.shadowRoot as any);
        }
        current = walker.nextNode();
      }
    };

    const topRoot: ShadowRoot | null = (el as any).shadowRoot ?? null;
    if (topRoot) {
      injectIntoRoot(topRoot);
      collectShadowRoots(topRoot as any);

      const observer = new MutationObserver(() => {
        injectIntoRoot(topRoot);
        collectShadowRoots(topRoot as any);
        localizeLabels(topRoot);
      });
      observer.observe(topRoot, { childList: true, subtree: true });
      const t1 = setTimeout(() => {
        injectIntoRoot(topRoot);
        collectShadowRoots(topRoot as any);
        localizeLabels(topRoot);
      }, 300);
      const t2 = setTimeout(() => {
        injectIntoRoot(topRoot);
        collectShadowRoots(topRoot as any);
        localizeLabels(topRoot);
      }, 1000);
      return () => {
        observer.disconnect();
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const globalId = 'nos-sl-global-token-style';
    let globalStyle = document.getElementById(globalId) as HTMLStyleElement | null;
    if (!globalStyle) {
      globalStyle = document.createElement('style');
      globalStyle.id = globalId;
      document.head.appendChild(globalStyle);
    }
    globalStyle.textContent = `
      elements-api pre, elements-api code, elements-api .sl-code-viewer { background-color: ${isDark ? '#0b0f17' : '#f8fafc'} !important; color: ${isDark ? '#e5e7eb' : '#111827'} !important; }
      elements-api .token.plain { color: ${isDark ? '#e5e7eb' : '#111827'} !important; }
      elements-api .token.string { color: ${isDark ? '#86efac' : '#166534'} !important; }
      elements-api .token.number { color: ${isDark ? '#fca5a5' : '#991b1b'} !important; }
      elements-api .token.boolean { color: ${isDark ? '#fde68a' : '#854d0e'} !important; }
      elements-api .token.null { color: ${isDark ? '#a5b4fc' : '#1e40af'} !important; }
      elements-api .token.property, elements-api .token.key { color: ${isDark ? '#93c5fd' : '#1d4ed8'} !important; }
      elements-api .token.operator { color: ${isDark ? '#f472b6' : '#a21caf'} !important; }
      elements-api .token.punctuation { color: ${isDark ? '#9ca3af' : '#6b7280'} !important; }
    `;
    localizeLabels(el);
  }, [resolvedTheme, tStoplight]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <p className="text-xs text-muted-foreground">{t('limitedNotice')}</p>
      </header>

      <div className="rounded-lg border overflow-hidden card-base card-hover">
        {/* Stoplight Elements web component */}
        <Script
          src="https://unpkg.com/@stoplight/elements/web-components.min.js"
          strategy="afterInteractive"
        />
        {/* Elements API component (we set apiDescriptionDocument via ref) */}
        {useMemo(() => {
          const Elem = 'elements-api' as any;
          return (
            <Elem
              ref={elementsRef as any}
              className="block min-h-[70vh] bg-card text-foreground"
              layout="responsive"
            />
          );
        }, [])}
      </div>
    </div>
  );
}
