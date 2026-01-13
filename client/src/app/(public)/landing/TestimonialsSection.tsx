import { Card, CardContent } from '@/components/ui/card'
import { Quote } from 'lucide-react'
import { LandingContainer } from './LandingContainer'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

const testimonials = [
  {
    quote:
      'Conference Master transformed how we organize our annual symposium. What used to take weeks now takes hours. The drag-and-drop scheduler alone is worth it!',
    author: 'Dr. Sarah Chen',
    role: 'Program Chair',
    institution: 'International AI Research Conference',
    avatar: 'SC',
  },
  {
    quote:
      'As a researcher submitting to multiple conferences, having one consistent platform is a game-changer. No more confusing submission portals!',
    author: 'Prof. Michael Rodriguez',
    role: 'Associate Professor',
    institution: 'MIT Computer Science',
    avatar: 'MR',
  },
  {
    quote:
      'The review management system streamlined our entire peer review process. We processed 300+ submissions in half the time compared to last year.',
    author: 'Dr. Aisha Patel',
    role: 'Conference Organizer',
    institution: 'Global Health Summit',
    avatar: 'AP',
  },
  {
    quote:
      'Our attendees love the personalized schedule feature. Conference engagement has increased by 40% since we started using Conference Master.',
    author: 'Prof. James Anderson',
    role: 'Department Head',
    institution: 'Stanford Engineering',
    avatar: 'JA',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <LandingContainer>
        {/* Header – unchanged */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Loved by Conference Organizers
          </h2>
          <p className="text-lg text-muted-foreground">
            Don&rsquo;t just take our word for it, here&rsquo;s what our community has to say
          </p>
        </div>

        {/* Carousel */}
        <Carousel
          opts={{ align: 'start', loop: true }}
          className="w-full"
        >
          <CarouselContent>
            {testimonials.map(
              ({ quote, author, role, institution, avatar }) => (
                <CarouselItem
                  key={author}
                  className="px-3 md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-2">
                    <CardContent className="pt-6 px-6 pb-6 flex flex-col h-full">
                      {/* Quote icon */}
                      <div className="mb-4">
                        <Quote className="h-8 w-8 text-primary opacity-50" />
                      </div>

                      {/* Quote text */}
                      <p className="text-muted-foreground italic mb-6 leading-relaxed">
                        &ldquo;{quote}&rdquo;
                      </p>

                      {/* Author info */}
                      <div className="flex items-center gap-3 mt-auto">
                        {/* Avatar */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {avatar}
                        </div>

                        {/* Name and role */}
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {author}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {role}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {institution}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ),
            )}
          </CarouselContent>

          {/* Controls */}
          <div className="flex justify-center gap-4 mt-10">
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </Carousel>
      </LandingContainer>
    </section>
  )
}
