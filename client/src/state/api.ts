// This file is for redux toolkit
// To make any Api calls

import { createNewUserInDatabase, withToast } from "@/lib/utils";
import { User } from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { idToken } = session.tokens ?? {};
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: ["User"],
  endpoints: (build) => ({
    getAuthUser: build.query<AuthUser, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = await getCurrentUser();
          const userRole = idToken?.payload["custom:role"] as Role;

          // Use Cognito sub for lookup
          const endpoint = `/users/cognito/${user.userId}`;  // You only need one universal endpoint to fetch user info

          let userDetailsResponse = await fetchWithBQ(endpoint); // This should call the endpoint depending on the user type

          // (Placeholder) if user doesn't exist, create a new user
          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            // Create a new user in the database
            const createResponse = await createNewUserInDatabase(
              user,
              idToken,
              userRole,
              fetchWithBQ
            );

            if (createResponse.error) {
              return { error: createResponse.error };
            }

            userDetailsResponse = createResponse;
          }

          if (userDetailsResponse.error) {
            return { error: userDetailsResponse.error };
          }

          return {
            data: {
              cognitoInfo: { ...user },
              userInfo: userDetailsResponse.data as User, // all the information we get back from our own database would go here
              userRole,
            },
          };
        } catch (error: any) {
          return { error: error.message || "Could not fetch user data" };
        }
      },
    }),

    updateOrganizerSettings: build.mutation<
      User, // The returned type (adjust if you have a more specific Organizer type)
      { cognitoId: string } & Partial<User>
    >
      ({
        query: ({ cognitoId, ...updatedFields }) => ({
          url: `/users/cognito/${cognitoId}`,
          method: "PUT",
          body: updatedFields,
        }),
        // Optionally, you can invalidate tags or handle optimistic updates here
        invalidatesTags: (result) => [{ type: "User", id: result?.id }],
        // Optionally, add toast notifications here if you have a utility for it
        async onQueryStarted(_, { queryFulfilled }) {
          await withToast(queryFulfilled, {
            success: "Settings updated successfully!",
            error: "Failed to update settings.",
          });
        },
      }),

    getOrganizerEvents: build.query<Event[], { organizerId: number }>({
      query: ({ organizerId }) => `/events?organizerId=${organizerId}`,
    }),

    createEvent: build.mutation<Event, Partial<Event> & { createdById: number }>({
      query: (eventData) => ({
        url: `/events`,
        method: "POST",
        body: eventData,
      }),
    }),
    updateEvent: build.mutation<Event, { id: number; data: Partial<Event> }>({
      query: ({ id, data }) => ({
        url: `/events/${id}`,
        method: "PUT",
        body: data,
      }),
    }),
    deleteEvent: build.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/events/${id}`,
        method: "DELETE",
      }),
    }),

    updateAttendee: build.mutation<
      User, // Return type is User
      { cognitoId: string } & Partial<User> & {
        preferences?: {
          emailNotifications?: boolean;
          pushNotifications?: boolean;
          marketingEmails?: boolean;
          reminders?: boolean;
        },
        interests?: string[];
      }
    >({
      query: ({ cognitoId, ...updatedFields }) => ({
        url: `/users/cognito/${cognitoId}`,
        method: "PUT",
        body: updatedFields,
      }),
      invalidatesTags: (result) => [{ type: "User", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Profile updated successfully!",
          error: "Failed to update profile.",
        });
      },
    }),

    // ADD: Attendee-specific mutations
    updateAttendeeProfile: build.mutation<
      User,
      { cognitoId: string } & Partial<User>
    >({
      query: ({ cognitoId, ...updatedFields }) => ({
        url: `/api/attendee/profile`,
        method: "PUT", 
        body: updatedFields,
      }),
      invalidatesTags: (result) => [{ type: "User", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Profile updated successfully!",
          error: "Failed to update profile.",
        });
      },
    }),

    // ADD: Get attendee profile
    getAttendeeProfile: build.query<User, void>({
      query: () => ({
        url: `/api/attendee/profile`,
      }),
      providesTags: ["User"],
    }),

  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateOrganizerSettingsMutation,
  useGetOrganizerEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useUpdateAttendeeMutation,
  useUpdateAttendeeProfileMutation,
  useGetAttendeeProfileQuery,
} = api;
