'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function MultiTabNotice() {
  const [othersActive, setOthersActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const id = useMemo(() => uuid(), []);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('nos-monitor') : null;
    channelRef.current = bc;
    const peers = new Map<string, number>();

    function prune() {
      const now = Date.now();
      for (const [k, ts] of peers) {
        if (now - ts > 15000) peers.delete(k);
      }
      setOthersActive(peers.size);
    }

    const onMsg = (ev: MessageEvent) => {
      try {
        const msg = ev.data || {};
        if (!msg || msg.id === id) return;
        if (msg.type === 'hello' || msg.type === 'ping') {
          peers.set(String(msg.id), Date.now());
          prune();
        }
      } catch {}
    };

    bc?.addEventListener('message', onMsg);
    const hello = () => bc?.postMessage({ type: 'hello', id });
    const ping = () => bc?.postMessage({ type: 'ping', id });
    hello();
    const pingId = window.setInterval(() => {
      ping();
      prune();
    }, 5000);

    const key = `nos-monitor:heartbeat:${id}`;
    const beat = () => {
      try {
        localStorage.setItem(key, String(Date.now()));
      } catch {}
    };
    beat();
    const beatId = window.setInterval(beat, 5000);
    const scan = () => {
      try {
        const now = Date.now();
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) || '';
          if (!k.startsWith('nos-monitor:heartbeat:')) continue;
          const val = Number(localStorage.getItem(k) || '0');
          if (Number.isFinite(val) && now - val <= 15000 && k !== key) count++;
        }
        if (!bc) setOthersActive(count);
      } catch {}
    };
    const scanId = window.setInterval(scan, 6000);
    scan();

    return () => {
      window.clearInterval(pingId);
      window.clearInterval(beatId);
      window.clearInterval(scanId);
      try {
        localStorage.removeItem(key);
      } catch {}
      try {
        bc?.removeEventListener('message', onMsg);
        bc?.close();
      } catch {}
    };
  }, [id]);

  if (dismissed || othersActive <= 0) return null;
  return (
    <div className="fixed bottom-3 right-3 z-40">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 backdrop-blur px-3 py-2 text-[12px] shadow">
        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 mt-1" />
        <div>
          <div className="font-semibold text-foreground">Multiple monitor tabs open</div>
          <div className="text-muted-foreground">
            Live data is heavier with many tabs. Consider closing extra tabs.
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 text-xs text-foreground hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default MultiTabNotice;
