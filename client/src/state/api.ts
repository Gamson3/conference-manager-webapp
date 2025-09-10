// This file is for redux toolkit
// To make any Api calls

import { withToast } from "@/lib/utils";
import {
  CategoryItem,
  ConferenceDetail,
  ConferenceListResponse,
  ConferenceQueryParams,
  ConferenceSummary,
  FeaturedConferences,
} from "@/types/conference";
import { User, Conference } from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { toast } from "sonner";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      try {
        const session = await fetchAuthSession();
        const { idToken } = session.tokens ?? {};
        if (idToken) {
          console.log('[API] Setting auth token'); // Debug log
          headers.set("Authorization", `Bearer ${idToken}`);
        } else {
          console.log('[API] No auth token available'); // Debug log
        }
      } catch (error) {
        console.error('[API] Error getting auth token:', error);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: ["User", "Conference", "Presentation", "ConferenceDetails"],
  endpoints: (build) => ({
    getAuthUser: build.query<AuthUser, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = await getCurrentUser();
          const userRole = idToken?.payload["custom:role"] as Role;

          // Use Cognito sub for lookup
          const endpoint = `/users/cognito/${user.userId}`; // You only need one universal endpoint to fetch user info

          let userDetailsResponse = await fetchWithBQ(endpoint); // This should call the endpoint depending on the user type

          // If there's an error getting the user, handle it
          if (userDetailsResponse.error) {
            console.error(
              "Error fetching user details:",
              userDetailsResponse.error
            );
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
    >({
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

    getOrganizerEvents: build.query<Conference[], { organizerId: number }>({
      query: ({ organizerId }) =>
        `/api/conferences/management/organizer/${organizerId}`,
    }),

    createEvent: build.mutation<
      Conference,
      Partial<Conference> & { createdById: number }
    >({
      query: (eventData) => ({
        url: `/api/conferences/management`,
        method: "POST",
        body: eventData,
      }),
    }),
    updateEvent: build.mutation<
      Conference,
      { id: number; data: Partial<Conference> }
    >({
      query: ({ id, data }) => ({
        url: `/api/conferences/management/${id}`,
        method: "PUT",
        body: data,
      }),
    }),
    deleteEvent: build.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/api/conferences/management/${id}`,
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
        };
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

    // Attendee-specific mutations
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

    // Get attendee profile
    getAttendeeProfile: build.query<User, void>({
      query: () => ({
        url: `/api/attendee/profile`,
      }),
      providesTags: ["User"],
    }),

    // Add these endpoints to our API definition
    conferences: build.query<ConferenceListResponse, ConferenceQueryParams>({
      query: (params) => ({
        url: "/api/attendee/discover",
        params,
      }),
      transformResponse: (raw: any): ConferenceListResponse => {
        const page = Number(raw?.pagination?.page ?? 1);
        const pages = Number(raw?.pagination?.pages ?? 1);
        const total = Number(raw?.pagination?.total ?? 0);
        // Normalize fields so ConferenceCard can read createdBy.name and _count.attendances
        const conferences = (raw?.conferences ?? []).map((c: any) => ({
          ...c,
          createdBy: c.createdBy ?? (c.organizer ? { name: c.organizer } : undefined),
          _count: c._count ?? (typeof c.attendeeCount === 'number' ? { attendances: c.attendeeCount } : undefined),
        }));
        return {
          conferences,
          pagination: {
            currentPage: page,
            totalPages: pages,
            totalCount: total,
            hasMore: page < pages,
          },
        };
      },
      // Add providesTags to ensure proper invalidation
        providesTags: (result) => 
          result
            ? [
                // Provide a tag for the entire list
                { type: 'Conference', id: 'LIST' },
                // Provide tags for each conference
                ...result.conferences.map(conference => ({ 
                  type: 'Conference' as const, 
                  id: conference.id 
                }))
              ]
            : [{ type: 'Conference', id: 'LIST' }],
      }),

    conferenceDetails: build.query<ConferenceDetail, string>({
      query: (id) => `/api/conferences/${id}`,
      providesTags: (result, error, id) => [
        { type: "ConferenceDetails", id: Number(id) }
      ],
    }),

    featuredConferences: build.query<FeaturedConferences, void>({
      query: () => "/api/conferences/featured",
      // Add providesTags to ensure proper invalidation
      providesTags: (result) => 
        result
          ? [
              { type: 'Conference', id: 'FEATURED' },
              // Tag each conference in popular and upcoming lists
              ...(result.popular || []).map(conference => ({ 
                type: 'Conference' as const, 
                id: conference.id 
              })),
              ...(result.upcoming || []).map(conference => ({ 
                type: 'Conference' as const, 
                id: conference.id 
              }))
            ]
          : [{ type: 'Conference', id: 'FEATURED' }],
    }),

    conferenceCategories: build.query<CategoryItem[], void>({
      query: () => "/api/conferences/categories",
    }),

    // Fetch favorited conferences
    conferenceFavorites: build.query<ConferenceSummary[], void>({
      query: () => `/api/favorites/conferences`,
      providesTags: ["User", "Conference"],
    }),

    // Fetch favorited presentations
    getUserFavoritePresentations: build.query<
      {
        id: number;
        presentation: {
          id: number;
          title: string;
          conferenceId: number;
          conference: {
            id: number;
            name: string;
          };
          authors: {
            id: number;
            authorName: string;
            isPresenter: boolean;
          }[];
          category?: {
            id: number;
            name: string;
            color?: string;
          };
        };
        createdAt: string;
      }[],
      void
    >({
      query: () => `/api/favorites/presentations`,
      providesTags: ["User", "Presentation"],
    }),

    // Add these mutations for user interactions
    togglePresentationFavorite: build.mutation<
      { id: number; success: boolean },
      { presentationId: number; isFavorite: boolean }
    >({
      query: ({ presentationId, isFavorite }) => ({
        url: `/api/favorites/presentations/${presentationId}`,
        method: "POST",
        body: { isFavorite },
      }),
      // Invalidate relevant tags when this mutation runs
      invalidatesTags: (result, error, arg) => [
        { type: "Presentation", id: arg.presentationId },
        { type: "User" },
      ],
    }),

    toggleConferenceFavorite: build.mutation<
      { id: number; success: boolean },
      { conferenceId: number; isFavorite: boolean }
    >({
      query: ({ conferenceId, isFavorite }) => ({
        url: `/api/favorites/conferences/${conferenceId}`,
        method: "POST",
        body: { isFavorite },
      }),
      // Invalidate the relevant tags when we toggle a favorite
      invalidatesTags: (result, error, arg) => [
        { type: "Conference", id: arg.conferenceId },
        { type: "Conference", id: "LIST" },
        { type: "Conference", id: "FEATURED" },
        { type: "ConferenceDetails", id: arg.conferenceId },
        "User",
      ],
    }),

    registerForConference: build.mutation<
      { id: number; status: string },
      { conferenceId: number }
    >({
      query: ({ conferenceId }) => ({
        url: `api/attendee/register-conference`,
        method: "POST",
        body: { conferenceId },
      }),
      // Invalidate BOTH ConferenceDetails and Conference tags when we register
      invalidatesTags: (result, error, arg) => [
        { type: "Conference", id: arg.conferenceId },
        { type: "ConferenceDetails", id: arg.conferenceId }
      ],
    }),

    unregisterFromConference: build.mutation<
      { message: string },
      { conferenceId: number }
    >({
      query: ({ conferenceId }) => ({
        url: `/api/attendee/unregister-conference/${conferenceId}`,
        method: "DELETE",
      }),
      // Invalidate BOTH ConferenceDetails and Conference tags when we unregister
      invalidatesTags: (result, error, arg) => [
        { type: "Conference", id: arg.conferenceId },
        { type: "ConferenceDetails", id: arg.conferenceId }
      ],
      // Add toast handling here to give better feedback
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          toast.success("Successfully unregistered from this conference");
        } catch (error) {
          toast.error("Failed to unregister from this conference. Please try again.");
        }
      }
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
  useConferencesQuery,
  useConferenceDetailsQuery,
  useFeaturedConferencesQuery,
  useConferenceCategoriesQuery,
  useConferenceFavoritesQuery,
  useGetUserFavoritePresentationsQuery,
  useToggleConferenceFavoriteMutation,
  useTogglePresentationFavoriteMutation,
  useRegisterForConferenceMutation,
  useUnregisterFromConferenceMutation,
} = api;
