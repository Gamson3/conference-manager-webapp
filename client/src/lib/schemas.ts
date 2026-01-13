import * as z from "zod";

export const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// Organizer Info Validation
export const organizerInfoSchema = z.object({
  organizerName: z.string().optional(),
  organizerEmail: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional()
    .transform(val => val === "" ? undefined : val),
  organizerPhone: z.string().optional(),
  organizerWebsite: z
    .string()
    .url("Invalid website URL")
    .or(z.literal(""))
    .optional()
    .transform(val => val === "" ? undefined : val),
  organizerLogoUrl: z.string().optional(),
});

export type OrganizerInfoFormData = z.infer<typeof organizerInfoSchema>;

// Deadlines Validation
export const deadlinesSchema = z
  .object({
    submissionsOpenFrom: z.string().optional(),
    submissionsOpenUntil: z.string().optional(),
    reviewStartsAt: z.string().optional(),
    reviewEndsAt: z.string().optional(),
    registrationOpenFrom: z.string().optional(),
    registrationOpenUntil: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.submissionsOpenFrom && data.submissionsOpenUntil) {
        return new Date(data.submissionsOpenFrom) <= new Date(data.submissionsOpenUntil);
      }
      return true;
    },
    {
      message: "Submissions close date must be after open date",
      path: ["submissionsOpenUntil"],
    }
  )
  .refine(
    (data) => {
      if (data.reviewStartsAt && data.reviewEndsAt) {
        return new Date(data.reviewStartsAt) <= new Date(data.reviewEndsAt);
      }
      return true;
    },
    {
      message: "Review end date must be after start date",
      path: ["reviewEndsAt"],
    }
  )
  .refine(
    (data) => {
      if (data.registrationOpenFrom && data.registrationOpenUntil) {
        return new Date(data.registrationOpenFrom) <= new Date(data.registrationOpenUntil);
      }
      return true;
    },
    {
      message: "Registration close date must be after open date",
      path: ["registrationOpenUntil"],
    }
  );

export type DeadlinesFormData = z.infer<typeof deadlinesSchema>;

// Conference Basics Validation
export const conferenceBasicsSchema = z
  .object({
    name: z.string().min(1, "Conference name is required"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    location: z.string().optional(),
    timezone: z.string().min(1, "Timezone is required"),
    venue: z.string().optional(),
    websiteUrl: z
      .string()
      .url("Invalid website URL")
      .or(z.literal(""))
      .optional()
      .transform(val => val === "" ? undefined : val),
    capacity: z.number().int().positive("Capacity must be positive").optional(),
    topics: z.string().optional(),
    bannerImage: z.string().optional(),
  })
  .refine(
    (data) => {
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

export type ConferenceBasicsFormData = z.infer<typeof conferenceBasicsSchema>;