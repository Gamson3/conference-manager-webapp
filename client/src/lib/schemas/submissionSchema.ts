import * as z from 'zod';

export const submissionFormSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z.string()
    .min(100, 'Abstract must be at least 100 characters'),
  keywords: z.array(z.string())
    .min(3, 'Please add at least 3 keywords')
    .max(15, 'Maximum 15 keywords allowed'),
  presentationTypeId: z.number({
    required_error: 'Please select a presentation type'
  }),
  requestedDuration: z.number().optional(),
  biography: z.string()
    .min(50, 'Biography must be at least 50 characters')
    .optional(),
  fileUrl: z.string().optional(),
  consentToTerms: z.boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions')
});

export type SubmissionFormData = z.infer<typeof submissionFormSchema>;