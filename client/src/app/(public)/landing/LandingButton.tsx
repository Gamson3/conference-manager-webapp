import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LandingButtonProps {
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'lg' | 'xl';
}

export function LandingButton({
  href,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'right',
  children,
  className,
  size = 'lg',
}: LandingButtonProps) {
  const sizeClasses = {
    default: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl border-0',
    secondary: 'bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl',
    outline: 'bg-white/10 text-current border-2 border-current/30 hover:bg-white/20 backdrop-blur-sm',
    ghost: 'bg-transparent text-current hover:bg-current/10',
  };

  return (
    <Button 
      asChild 
      className={cn(
        'h-auto font-semibold transition-all duration-200 rounded-lg',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Link href={href} className="inline-flex items-center justify-center gap-2">
        {Icon && iconPosition === 'left' && <Icon className="h-5 w-5" />}
        {children}
        {Icon && iconPosition === 'right' && <Icon className="h-5 w-5" />}
      </Link>
    </Button>
  );
}

export default LandingButton;
