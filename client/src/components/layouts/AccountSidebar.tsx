"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Star,
  Settings,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
}

const mainLinks: SidebarLink[] = [
  { 
    href: '/account/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    description: 'Overview & quick actions'
  },
  { 
    href: '/account/my-conferences', 
    label: 'My Conferences', 
    icon: CalendarDays,
    description: 'Registered events'
  },
  { 
    href: '/account/my-submissions', 
    label: 'My Submissions', 
    icon: FileText,
    description: 'Papers & abstracts'
  },
  { 
    href: '/account/favorites', 
    label: 'Favorites', 
    icon: Star,
    description: 'Saved presentations'
  },
];

const accountLinks: SidebarLink[] = [
  { 
    href: '/account/assistance', 
    label: 'Submission Assistance', 
    icon: UserCheck,
    description: 'Organizer permissions'
  },
  { 
    href: '/account/settings', 
    label: 'Settings', 
    icon: Settings,
    description: 'Preferences & notifications'
  },
];

export function AccountSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/account/dashboard') {
      return pathname === '/account/dashboard' || pathname === '/account';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-muted/30 flex-shrink-0 hidden lg:block">
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Activity
            </h3>
            {mainLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn(active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-medium", active && "text-primary-foreground")}>
                      {link.label}
                    </div>
                    {link.description && (
                      <div className={cn(
                        "text-xs truncate",
                        active ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {link.description}
                      </div>
                    )}
                  </div>
                  {active && <ChevronRight size={16} className="text-primary-foreground/70" />}
                </Link>
              );
            })}
          </div>

          {/* Account Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Account
            </h3>
            {accountLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn(active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className={cn("font-medium", active && "text-primary-foreground")}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <Link
              href="/conferences"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <CalendarDays size={16} />
              Browse Conferences
            </Link>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

export default AccountSidebar;
