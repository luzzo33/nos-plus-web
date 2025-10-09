import { cn } from '@/lib/utils';

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn('relative skeleton overflow-hidden', className)}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}
