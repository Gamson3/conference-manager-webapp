'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/contexts/NavigationContext';

interface CancelButtonProps {
  fallbackPath?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  showIcon?: boolean;
}

export const CancelButton = ({ 
  fallbackPath = '/organizer/events',
  variant = "outline",
  size = "default",
  children,
  disabled = false,
  className = "",
  showIcon = true
}: CancelButtonProps) => {
  const { goToPreviousPage } = useNavigation();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => goToPreviousPage(fallbackPath)}
      disabled={disabled}
      className={className}
    >
      {showIcon && <ArrowLeft className="h-4 w-4 mr-2" />}
      {children || "Cancel"}
    </Button>
  );
};