"use client";
import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const steps = [
  { slug: '', label: 'Overview' },
  { slug: 'categories', label: 'Categories' },
  { slug: 'types', label: 'Types' },
  { slug: 'requirements', label: 'Requirements' },
  { slug: 'timeline', label: 'Timeline' },
];

export default function SetupWizardNav() {
  const params = useParams<{ id?: string | string[] }>();
  const pathname = usePathname();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const base = `/organizer/conferences/${id}/setup`;

  return (
    <nav className="flex flex-wrap gap-2 mb-2" aria-label="Setup wizard">
      {steps.map((s, i) => {
        const href = s.slug ? `${base}/${s.slug}` : base;
        const active = pathname.startsWith(href);
        return (
          <div key={s.slug} className="flex items-center gap-2">
            <Link
              className={cn(
                'px-3 py-1 rounded border text-sm',
                active ? 'bg-primary text-white border-primary' : 'bg-background hover:bg-muted'
              )}
              href={href}
            >
              {i + 1}. {s.label}
            </Link>
            {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
          </div>
        );
      })}
    </nav>
  );
}
