import { Card, CardContent } from '@/components/ui/card';
import { LandingContainer } from './LandingContainer';
import { Target, Users2, Timer, TrendingUp } from 'lucide-react';

const benefits = [
  {
    title: 'For Conference Organizers',
    description: 'Save 10+ hours per conference with automated workflows',
    items: [
      'One centralized platform for all conference tasks',
      'Eliminate spreadsheet chaos and email overload',
      'Professional presentation with minimal effort',
      'Real-time collaboration with your organizing committee',
    ],
    icon: Target,
    gradient: 'from-blue-500 to-purple-600',
  },
  {
    title: 'For Researchers & Authors',
    description: 'Submit abstracts and track progress effortlessly',
    items: [
      'Simple, guided submission forms',
      'Track submission status in real-time',
      'Manage multiple co-authors easily',
      'Receive instant confirmation and updates',
    ],
    icon: Users2,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    title: 'For Conference Attendees',
    description: 'Discover and engage with content that matters',
    items: [
      'Browse schedules with advanced search',
      'Build personalized conference agendas',
      'Get notified about favorite sessions',
      'Access materials and recordings post-event',
    ],
    icon: Timer,
    gradient: 'from-green-500 to-cyan-600',
  },
  {
    title: 'For Institutions',
    description: 'Scale your conference portfolio with confidence',
    items: [
      'Host unlimited conferences on one platform',
      'Consistent branding across all events',
      'Track metrics and measure success',
      'Professional reputation with attendees',
    ],
    icon: TrendingUp,
    gradient: 'from-orange-500 to-red-600',
  },
];

export default function BenefitsSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <LandingContainer>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Built for Everyone in the Academic Community
          </h2>
          <p className="text-lg text-muted-foreground">
            Whether you&rsquo;re organizing, presenting, or attending&mdash;we&rsquo;ve got you covered
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map(({ title, description, items, icon: Icon, gradient }) => (
            <Card key={title} className="border-2 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <div className={`h-2 bg-gradient-to-r ${gradient}`} />
              <CardContent className="pt-8 px-6 pb-6">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl font-bold mb-2">{title}</h3>
                <p className="text-muted-foreground mb-6 text-sm">{description}</p>

                {/* Benefits list */}
                <ul className="space-y-3">
                  {items.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
