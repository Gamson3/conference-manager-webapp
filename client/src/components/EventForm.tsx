"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { CustomFormField } from "@/components/FormField";

const eventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().min(3, "Location is required"),
});

type EventFormValues = z.infer<typeof eventSchema>;

type EventFormProps = {
  initialValues?: Partial<EventFormValues>;
  onSubmit: (data: EventFormValues) => void;
  onCancel?: () => void; // Add cancel handler prop
  isLoading?: boolean;
};

export function EventForm({
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading,
}: EventFormProps) {
  const methods = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      ...initialValues,
    },
  });

  const {
    formState: { errors },
  } = methods;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 rounded shadow"
      >
        <div>
          <CustomFormField
            name="name"
            label="Event Name"
            placeholder="Enter event name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <CustomFormField
            name="description"
            label="Description"
            type="textarea"
            placeholder="Describe your event"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CustomFormField
              name="startDate"
              label="Start Date & Time"
              type="text"
              inputProps={{ type: "datetime-local" }}
              placeholder="Select start date and time"
            />
            {errors.startDate && (
              <p className="text-red-500 text-sm mt-1">
                {errors.startDate.message}
              </p>
            )}
          </div>
          <div>
            <CustomFormField
              name="endDate"
              label="End Date & Time"
              type="text"
              inputProps={{ type: "datetime-local" }}
              placeholder="Select end date and time"
            />
            {errors.endDate && (
              <p className="text-red-500 text-sm mt-1">
                {errors.endDate.message}
              </p>
            )}
          </div>
        </div>
        <div>
          <CustomFormField
            name="location"
            label="Location"
            placeholder="Event location"
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">
              {errors.location.message}
            </p>
          )}
        </div>

        {/* Updated button section with cancel button */}
        <div className="flex justify-end space-x-4 pt-4">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={isLoading}
              className="border hover:bg-gray-100 cursor-pointer min-w-[120px]"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="border bg-primary-700 text-white hover:bg-primary-800 cursor-pointer min-w-[120px]"
          >
            {isLoading ? "Saving..." : "Save Event"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
