import { Users, Calendar, FileText, Award } from 'lucide-react';
import { LandingContainer } from './LandingContainer';

const stats = [
  {
    icon: Calendar,
    value: '500+',
    label: 'Conferences Hosted',
    description: 'Growing every month',
  },
  {
    icon: FileText,
    value: '10K+',
    label: 'Abstracts Submitted',
    description: 'Peer-reviewed successfully',
  },
  {
    icon: Users,
    value: '50K+',
    label: 'Active Researchers',
    description: 'From 100+ countries',
  },
  {
    icon: Award,
    value: '99.9%',
    label: 'Uptime Guarantee',
    description: 'Always available',
  },
];

export default function StatsSection() {
  return (
    <section className="w-full py-16 md:py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <LandingContainer className="relative text-center">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Trusted by the Academic Community
          </h2>
          <p className="text-lg opacity-90">
            Join thousands of organizers who have streamlined their conferences
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map(({ icon: Icon, value, label, description }) => (
            <div key={label} className="text-center group">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 group-hover:bg-white/20 transition-colors duration-300">
                <Icon className="h-8 w-8" />
              </div>

              {/* Value */}
              <div className="text-4xl md:text-5xl font-bold mb-2">
                {value}
              </div>

              {/* Label */}
              <div className="text-lg font-semibold mb-1">
                {label}
              </div>

              {/* Description */}
              <div className="text-sm opacity-80">
                {description}
              </div>
            </div>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
