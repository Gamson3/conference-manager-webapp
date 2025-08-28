import React, { ReactNode } from 'react';

interface DashboardPageLayoutProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  breadcrumbs?: ReactNode;
  // actions?: ReactNode;
}

export default function DashboardPageLayout({ 
  children, 
  className = "",
  title,
  description,
  breadcrumbs,
}: DashboardPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        {(title || description ) && (
          <div className="mb-6">
            <div className="space-y-1">
              {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
              {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
              {description && <p className="text-muted-foreground max-w-2xl">{description}</p>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}