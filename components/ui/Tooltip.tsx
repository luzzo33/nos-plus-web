'use client';

import React from 'react';
import {
  useFloating,
  flip,
  shift,
  offset,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  useClick,
  safePolygon,
  arrow as floatingArrow,
} from '@floating-ui/react';

export type TooltipProps = {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offsetPx?: number;
  asChild?: boolean;
  trigger?: 'auto' | 'hover' | 'click';
  className?: string;
  closeOnScroll?: boolean;
};

export function Tooltip({
  children,
  content,
  placement = 'top',
  offsetPx = 6,
  asChild = true,
  trigger = 'auto',
  className = '',
  closeOnScroll = true,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [isHoverCapable, setIsHoverCapable] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setIsHoverCapable(mq.matches);
    mq.addEventListener?.('change', onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const arrowRef = React.useRef<HTMLDivElement | null>(null);

  const {
    refs,
    floatingStyles,
    context,
    placement: finalPlacement,
    middlewareData,
  } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [
      offset(offsetPx),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
      floatingArrow({ element: arrowRef, padding: 6 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const enableHover =
    trigger === 'hover' ||
    (trigger === 'auto' && isHoverCapable) ||
    (trigger === 'click' && isHoverCapable);
  const enableClick = trigger === 'click' || (trigger === 'auto' && !isHoverCapable);
  const hover = useHover(context, {
    enabled: enableHover,
    handleClose: safePolygon({ buffer: 2 }),
    move: false,
    delay: { open: 80, close: 80 },
  });
  const click = useClick(context, { enabled: enableClick, toggle: true });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    focus,
    dismiss,
    role,
  ]);

  React.useEffect(() => {
    if (!closeOnScroll || !open || typeof window === 'undefined') return;
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as any);
      window.removeEventListener('resize', onResize);
    };
  }, [open, closeOnScroll]);

  const reference = (
    <span
      ref={refs.setReference}
      {...getReferenceProps()}
      className="inline-flex align-middle cursor-help"
    >
      {children}
    </span>
  );

  return (
    <span className="inline-flex align-middle">
      {reference}
      <FloatingPortal>
        {open && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={`z-[1000] max-w-[20rem] text-left bg-card border border-border rounded-md p-2 shadow-lg relative ${className}`}
          >
            {/* Arrow */}
            <div
              ref={arrowRef}
              className="absolute w-2.5 h-2.5 bg-card border border-border rotate-45"
              style={
                {
                  left: middlewareData.arrow?.x != null ? `${middlewareData.arrow.x}px` : '',
                  top: middlewareData.arrow?.y != null ? `${middlewareData.arrow.y}px` : '',
                  [({ top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const)[
                    finalPlacement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left'
                  ]]: '-5px',
                } as React.CSSProperties
              }
            />
            <div className="text-[11px] sm:text-xs text-muted-foreground">{content}</div>
          </div>
        )}
      </FloatingPortal>
    </span>
  );
}
