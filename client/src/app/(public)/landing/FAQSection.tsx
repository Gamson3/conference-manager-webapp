import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingContainer } from './LandingContainer';

const faqs = [
  {
    question: "Do I need technical skills to use Conference Master?",
    answer: "Not at all! Conference Master is designed to be intuitive and user-friendly. If you can use email, you can organize a conference with our platform. We provide guided setup wizards and helpful tooltips throughout."
  },
  {
    question: "How long does it take to set up a conference?",
    answer: "Most organizers complete their basic conference setup in less than 10 minutes. You can start with the essentials (name, dates, categories) and add details like submission requirements and schedules as you go. Everything is saved automatically."
  },
  {
    question: "Is there a limit on the number of submissions or attendees?",
    answer: "Our free tier supports up to 100 submissions and 500 attendees per conference. For larger events, we offer flexible pricing plans. You can upgrade anytime as your conference grows, with no data migration needed."
  },
  {
    question: "Can authors submit to multiple presentation categories?",
    answer: "Yes! When submitting an abstract, authors can choose from the categories and types you've defined. You have complete control over your conference structure, including oral presentations, posters, workshops, and more."
  },
  {
    question: "How does the peer review process work?",
    answer: "Organizers can review submissions directly in the platform using our scoring and commenting system. You can assign reviewers (coming soon), track review progress, and make accept/reject decisions. Authors receive automatic email notifications at each stage."
  },
  {
    question: "Can I customize the look of my conference website?",
    answer: "Your conference automatically gets a beautiful, professional public page with your branding. You can customize the description, upload materials, control visibility settings, and share the URL with potential attendees."
  },
  {
    question: "What happens after I publish the schedule?",
    answer: "Once published, your conference schedule becomes publicly viewable (if you choose). Attendees can browse sessions, search by author or keyword, save favorites, and build personalized agendas. You can update the schedule anytime and republish."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade AWS infrastructure with Cognito authentication. All data is encrypted in transit and at rest. We comply with GDPR and maintain 99.9% uptime. Your conference data is backed up daily and you can export it anytime."
  },
  {
    question: "Can I export submission data and reports?",
    answer: "Yes! You can export submissions to CSV format for analysis in Excel or other tools. We also provide built-in analytics dashboards showing submission trends, registration statistics, and engagement metrics."
  },
  {
    question: "What support do you offer?",
    answer: "We provide email support for all users, with response times under 24 hours. Premium plans include priority support and onboarding assistance. Our extensive documentation and video tutorials are available to everyone for free."
  },
];

export default function FAQSection() {
  return (
    <section className="w-full py-16 md:py-24 bg-muted/50">
      <LandingContainer >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Conference Master
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <a 
              href="mailto:support@conferencemaster.com" 
              className="text-primary hover:underline font-medium"
            >
              Contact our support team &rarr;
            </a>
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}
