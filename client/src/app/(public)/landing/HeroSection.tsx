import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { LandingButton } from './LandingButton';
import { LandingContainer } from './LandingContainer';

export default function HeroSection() {
  return (
    <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20" />
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
      
      <LandingContainer size="text" className="relative text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            Trusted by Academic Organizers Worldwide
          </Badge>
        </div>

        {/* Main headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            Academic Conference
          </span>
          <br />
          <span className="text-foreground">Management Made Simple</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          From abstract submissions to published schedules - manage your entire conference lifecycle in one powerful platform.
        </p>

        {/* Key benefits */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm md:text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>No technical expertise required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>Free to get started</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>Setup in minutes</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <LandingButton href="/register" variant="primary" icon={Calendar} iconPosition="left">
            Start Your Conference
          </LandingButton>
          <LandingButton href="/conferences" variant="outline" icon={Users} iconPosition="left">
            Browse Conferences
          </LandingButton>
        </div>

        {/* Social proof */}
        <p className="mt-12 text-sm text-muted-foreground">
          Join researchers and organizers from leading institutions worldwide
        </p>
      </LandingContainer>
    </section>
  );
}
