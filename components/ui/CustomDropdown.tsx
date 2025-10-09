'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  align?: 'left' | 'right';
  portal?: boolean;
}

const CustomDropdown = memo(function CustomDropdown({
  options,
  value,
  onSelect,
  placeholder = 'Select option...',
  className,
  triggerClassName,
  menuClassName,
  disabled = false,
  icon,
  size = 'md',
  variant = 'default',
  align = 'left',
  portal = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        triggerRef.current &&
        menuRef.current &&
        !triggerRef.current.contains(target) &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    },
    [isOpen],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, { passive: true });
      document.addEventListener('keydown', handleKeyDown, { passive: false });
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleClickOutside]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onSelect(optionValue);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [onSelect],
  );

  const toggleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const sizeStyles = {
    sm: {
      trigger: 'px-2 py-1 text-xs',
      menu: 'text-xs',
      option: 'px-2 py-1',
    },
    md: {
      trigger: 'px-3 py-2 text-sm',
      menu: 'text-sm',
      option: 'px-3 py-2',
    },
    lg: {
      trigger: 'px-4 py-3 text-base',
      menu: 'text-base',
      option: 'px-4 py-3',
    },
  };

  const variantStyles = {
    default:
      'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border',
    outline: 'bg-transparent hover:bg-muted/50 text-foreground border border-border',
    ghost: 'bg-transparent hover:bg-muted/50 text-foreground border-0',
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        onClick={toggleOpen}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20',
          currentSize.trigger,
          currentVariant,
          disabled && 'opacity-50 cursor-not-allowed',
          triggerClassName,
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex-1 text-left truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 mt-1 min-w-full max-w-xs bg-card border border-border rounded-lg shadow-lg backdrop-blur-sm overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0',
              currentSize.menu,
              menuClassName,
            )}
            role="listbox"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full text-left flex items-center gap-2 transition-colors duration-150 hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
                    currentSize.option,
                    value === option.value && 'bg-primary/10 text-primary',
                  )}
                  role="option"
                  aria-selected={value === option.value}
                >
                  {option.icon && <span className="flex-shrink-0 w-4 h-4">{option.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CustomDropdown;
