'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Tag, Globe, CheckCircle } from 'lucide-react';

const CREATION_STEPS = [
  { id: 1, path: '', title: 'Event Details', description: 'Basic conference information', icon: Calendar },
  { id: 2, path: 'sessions', title: 'Sessions & Schedule', description: 'Create rooms, keynotes, breaks', icon: Clock },
  { id: 3, path: 'categories', title: 'Categories & Types', description: 'Define presentation categories', icon: Tag },
  { id: 4, path: 'publish', title: 'Publish Settings', description: 'Configure submission settings', icon: Globe },
];

interface CreateEventWorkflowProps {
  currentStep: number;
  eventId?: string;
  showCancelButton?: boolean;
}

export default function CreateEventWorkflow({ 
  currentStep, 
  eventId, 
  showCancelButton = true 
}: CreateEventWorkflowProps) {
  const router = useRouter();

  const handleStepClick = (step: typeof CREATION_STEPS[0]) => {
    if (!eventId || step.id > currentStep) return; // Don't allow forward navigation or navigation without eventId
    
    // Allow navigation back to previous steps if we have an eventId
    if (step.id <= currentStep) {
      const path = step.path ? `/organizer/create-event/${step.path}` : '/organizer/create-event';
      router.push(`${path}?eventId=${eventId}`);
    }
  };

  return (
    <Card className="mb-8 border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Create New Conference</CardTitle>
          {showCancelButton && (
            <Button
              variant="outline"
              onClick={() => router.push('/organizer/events')}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel Setup
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {CREATION_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = eventId && step.id <= currentStep;

            return (
              <div
                key={step.id}
                className={`relative p-4 rounded-lg border transition-all ${
                  isCurrent ? 'border-blue-300 bg-blue-50' :
                  isCompleted ? 'border-green-300 bg-green-50' :
                  'border-gray-200 bg-gray-50'
                } ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => isClickable ? handleStepClick(step) : undefined}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isCurrent ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}