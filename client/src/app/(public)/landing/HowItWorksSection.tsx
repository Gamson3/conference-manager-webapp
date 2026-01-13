import { Card, CardContent } from '@/components/ui/card';
import { Settings, FileCheck, Calendar, Rocket } from 'lucide-react';
import { LandingContainer } from './LandingContainer';

const steps = [
  {
    number: '01',
    title: 'Configure Your Conference',
    description: 'Set up your conference basics, define presentation categories, and customize submission requirements. Takes less than 10 minutes.',
    icon: Settings,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: '02',
    title: 'Collect & Review Submissions',
    description: 'Authors submit abstracts through your custom form. Review and provide feedback with our intuitive scoring system.',
    icon: FileCheck,
    color: 'from-purple-500 to-pink-500',
  },
  {
    number: '03',
    title: 'Build Your Schedule',
    description: 'Drag accepted presentations into time slots. Our smart system detects conflicts and helps you create the perfect program.',
    icon: Calendar,
    color: 'from-green-500 to-emerald-500',
  },
  {
    number: '04',
    title: 'Publish & Share',
    description: 'With one click, publish your conference schedule. Attendees can browse, search, and save their favorite sessions.',
    icon: Rocket,
    color: 'from-orange-500 to-red-500',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-muted/50">
      <LandingContainer>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From setup to success in four simple steps
          </p>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map(({ number, title, description, icon: Icon, color }) => (
              <div key={number} className="relative">
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 border-2">
                  <CardContent className="pt-6 px-6 pb-8">
                    {/* Step number with gradient */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${color} text-white font-bold text-2xl mb-4 shadow-lg`}>
                      {number}
                    </div>
                    
                    {/* Icon */}
                    <div className="mb-4">
                      <Icon className={`h-8 w-8 bg-gradient-to-br ${color} bg-clip-text text-transparent`} />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-semibold mb-3">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </CardContent>
                </Card>

                {/* Connecting arrow (hidden on mobile and last item) */}
                {/* {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-4 h-4 rotate-45 border-r-2 border-t-2 border-primary" />
                  </div>
                )} */}
              </div>
            ))}
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
