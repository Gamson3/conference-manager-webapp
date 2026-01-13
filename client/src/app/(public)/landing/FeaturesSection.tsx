import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingContainer } from './LandingContainer';
import { 
  FileText, 
  Users, 
  Calendar, 
  CheckSquare, 
  BarChart3, 
  Globe,
  Clock,
  Search,
  Star,
  MessageSquare,
  Shield,
  Zap
} from 'lucide-react';

const features = [
  {
    title: 'Abstract Submission System',
    description: 'Complete submission workflow with multi-author support, keyword tracking, and file uploads. Authors can save drafts and track status in real-time.',
    icon: FileText,
    color: 'text-blue-600',
  },
  {
    title: 'Smart Review Management',
    description: 'Streamline your peer review process with scoring, comments, and decision tracking. Accept, reject, or request revisions with ease.',
    icon: CheckSquare,
    color: 'text-purple-600',
  },
  {
    title: 'Visual Schedule Builder',
    description: 'Drag-and-drop presentations into sessions with automatic conflict detection. Organize by days, rooms, and time slots effortlessly.',
    icon: Calendar,
    color: 'text-green-600',
  },
  {
    title: 'Participant Management',
    description: 'Track attendees, presenters, reviewers, and sponsors. Custom registration forms with flexible questions and bulk operations.',
    icon: Users,
    color: 'text-orange-600',
  },
  {
    title: 'Public Conference Website',
    description: 'Automatically generate beautiful public pages for your conference. Share schedules, materials, and program details with attendees.',
    icon: Globe,
    color: 'text-pink-600',
  },
  {
    title: 'Real-Time Analytics',
    description: 'Track submissions, registrations, and engagement metrics. Export data for reporting and analysis.',
    icon: BarChart3,
    color: 'text-cyan-600',
  },
  {
    title: 'Advanced Search & Discovery',
    description: 'Powerful search by author, affiliation, keywords, or title. Attendees can quickly find presentations of interest.',
    icon: Search,
    color: 'text-indigo-600',
  },
  {
    title: 'Favorites & Personalization',
    description: 'Attendees can bookmark sessions and build personal schedules. Never miss a presentation that matters.',
    icon: Star,
    color: 'text-yellow-600',
  },
  {
    title: 'Automated Notifications',
    description: 'Keep everyone informed with automatic email alerts for submission updates, review decisions, and schedule changes.',
    icon: MessageSquare,
    color: 'text-red-600',
  },
  {
    title: 'Flexible Deadlines',
    description: 'Set submission windows, review periods, and registration deadlines. Extend or close at any time with one click.',
    icon: Clock,
    color: 'text-teal-600',
  },
  {
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with AWS Cognito authentication. Your conference data is safe and always available.',
    icon: Shield,
    color: 'text-slate-600',
  },
  {
    title: 'Lightning Fast',
    description: 'Optimized for performance with instant search, quick loads, and responsive design. Works perfectly on any device.',
    icon: Zap,
    color: 'text-amber-600',
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-muted/50">
      <LandingContainer size="wide">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to Run a Successful Conference
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed specifically for academic and professional conference organizers.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ title, description, icon: Icon, color }) => (
            <Card key={title} className="h-full hover:shadow-lg transition-shadow duration-300 border-2">
              <CardHeader className="space-y-3">
                <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
