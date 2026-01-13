"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Menu,
  Bell,
  ChevronDown,
  LayoutDashboard,
  CalendarDays,
  FileText,
  Star,
  Settings,
  LogOut,
  Shield,
  Briefcase
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

type NavVariant = 'public' | 'organizer';

// My Activity dropdown items (public variant)
const myActivityLinks = [
  { href: '/account/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/account/my-conferences', label: 'My Conferences', icon: CalendarDays },
  { href: '/account/my-submissions', label: 'My Submissions', icon: FileText },
  { href: '/account/favorites', label: 'Favorites', icon: Star },
];

// Organizer top-level links
const organizerLinks = [
  { href: '/organizer/conferences', label: 'Manage Conferences' },
];

function isMyActivityActive(pathname: string) {
  return pathname.startsWith('/account/');
}

function capitalizeFirstLetter(str: string | undefined) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}


interface MainNavProps {
  variant?: NavVariant;
}

export const MainNav: React.FC<MainNavProps> = ({ variant = 'public' }) => {
  const { isAuthenticated, isOrganizer, isAdmin, logout, user, loading } = useAuth();
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);

  const authReady = loading === false;
  const showAuthenticated = authReady && isAuthenticated;
  const showGuest = authReady && !isAuthenticated;

  const userName = user?.name?.trim() ?? '';
  const displayName = userName.length > 0 ? userName : (showAuthenticated ? 'User' : '');
  const userInitial = displayName.length > 0 ? displayName[0]?.toUpperCase() ?? '' : '';

  const hostHref = showAuthenticated
    ? '/conferences/new'
    : `/login?redirect=${encodeURIComponent('/conferences/new')}`;
  const hostLabel = 'Host Conference';

  return (
    <header
      className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40"
    >
      <div
        className="app-container h-[var(--navbar-height)] flex items-center gap-4"
      >
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
          <Link
            href="/"
            className="font-semibold text-lg tracking-tight flex-shrink-0 flex items-center gap-2"
          >
            {/* Keep full logo visible: fixed height, auto width (preserve aspect ratio) */}
            <Image
              src="/CMlogo.png"
              alt="Conference Master logo"
              width={160}
              height={40}
              className="h-7 w-auto"
              sizes="160px"
              priority
            />
            <span className="hidden sm:inline">
              {variant === 'organizer' ? 'Organizer Console' : 'Conference Master'}
            </span>
          </Link>
          
        </div>
        <div className="flex items-center gap-3">
          {/* Desktop Navigation (right-aligned, before divider/notifications) */}
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {variant === 'public' && (
              <>
                <Link
                  href="/conferences"
                  className={pathname.startsWith('/conferences') && !pathname.startsWith('/conferences/new') 
                    ? 'text-primary font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'}
                >
                  Explore
                </Link>
                {showGuest && (
                  <Link
                    href="/about"
                    className={pathname === '/about' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}
                  >
                    About
                  </Link>
                )}
                {showAuthenticated && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`flex items-center gap-1 ${isMyActivityActive(pathname) ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        My Activity
                        <ChevronDown size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {myActivityLinks.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-2 ${active ? 'bg-muted' : ''}`}
                            >
                              <Icon size={16} />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}

            {variant === 'organizer' && (
              organizerLinks.map(l => {
                const active = pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}
                  >
                    {l.label}
                  </Link>
                );
              })
            )}

            <Link
              href={hostHref}
              className={pathname.startsWith('/conferences/new')
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'}
            >
              {hostLabel}
            </Link>
          </nav>

          {showGuest && (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" className="bg-transparent hover:bg-transparent">
                <Link href="/login" className="text-lg text-muted-foreground">Sign in</Link>
              </Button>
              <Button size="default" asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          )}
          {showAuthenticated && (
            <div className="hidden md:flex items-center gap-3">
              <span className="hidden md:inline h-6 w-px bg-border" aria-hidden="true" />
              {/* Notifications placeholder */}
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell size={18} />
              </Button>
              {/* Avatar / user dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 px-2 py-1 bg-transparent hover:bg-transparent hover:text-foreground border shadow">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                      {userInitial}
                    </span>
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-lg font-semibold">
                        {capitalizeFirstLetter(displayName)}
                    </span>
                    {user?.email && <span className="text-sm text-muted-foreground truncate">{user.email}</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings" className="flex items-center gap-2">
                      <Settings size={16} />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isOrganizer && (
                    <DropdownMenuItem asChild>
                      <Link href="/organizer/conferences" className="flex items-center gap-2">
                        Organizer Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="flex items-center gap-2">
                        <Shield size={16} />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(isOrganizer || isAdmin) && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => logout()} className="flex items-center gap-2 text-destructive focus:text-destructive">
                    <LogOut size={16} />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t bg-white/95 backdrop-blur">
          <nav className="px-4 py-3 flex flex-col gap-2 text-sm">
            <Link
              href={hostHref}
              onClick={() => setOpen(false)}
              className={pathname.startsWith('/conferences/new') ? 'text-primary font-semibold py-1' : 'text-muted-foreground hover:text-foreground py-1'}
            >
              {hostLabel}
            </Link>

            {variant === 'public' && (
              <>
                <Link
                  href="/conferences"
                  onClick={() => setOpen(false)}
                  className={pathname.startsWith('/conferences') ? 'text-primary font-semibold py-1' : 'text-muted-foreground hover:text-foreground py-1'}
                >
                  Explore
                </Link>
                {showGuest && (
                  <Link
                    href="/about"
                    onClick={() => setOpen(false)}
                    className={pathname === '/about' ? 'text-primary font-semibold py-1' : 'text-muted-foreground hover:text-foreground py-1'}
                  >
                    About
                  </Link>
                )}
                {showAuthenticated && (
                  <>
                    <div className="pt-2 border-t mt-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Activity</span>
                    </div>
                    {myActivityLinks.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2 py-1 ${active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Icon size={16} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {variant === 'organizer' && (
              <>
                {organizerLinks.map((l) => {
                  const active = pathname.startsWith(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={active ? 'text-primary font-semibold py-1' : 'text-muted-foreground hover:text-foreground py-1'}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </>
            )}
            
            {/* Auth/Account section */}
            <div className="pt-3 border-t mt-2 flex flex-col gap-1">
              {showGuest && (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="py-1">Sign in</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="py-1">Create account</Link>
                </>
              )}
              {showAuthenticated && (
                <>
                  <Link href="/account/settings" onClick={() => setOpen(false)} className="py-1 flex items-center gap-2">
                    <Settings size={16} />
                    Settings
                  </Link>
                  {isOrganizer && (
                    <Link href="/organizer/conferences" onClick={() => setOpen(false)} className="py-1 flex items-center gap-2">
                      <Briefcase size={16} />
                      Organizer Panel
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="py-1 flex items-center gap-2">
                      <Shield size={16} />
                      Admin Panel
                    </Link>
                  )}
                  <button 
                    onClick={() => { logout(); setOpen(false); }} 
                    className="py-1 text-left flex items-center gap-2 text-destructive"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default MainNav;