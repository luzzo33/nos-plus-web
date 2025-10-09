export function roundUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '$0';
  const v = Number(value);
  const abs = Math.abs(v);
  if (abs === 0) return '$0';
  if (abs < 0.01) return `$${v.toFixed(4)}`;
  if (abs < 1) return `$${v.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  if (abs < 1000) return `$${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '0';
  const v = Number(value);
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs < 0.001) return '<0.001';
  if (abs < 1) return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (abs < 1000) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (abs < 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (v / 1_000_000).toFixed(2) + 'M';
}
