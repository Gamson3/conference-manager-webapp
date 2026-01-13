import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import type { Conference } from '@/types/conference';
import { forceTokenRefresh } from '@/features/auth/api/authApi';
import type { AxiosRequestConfig } from 'axios';

export type CreateConferenceInput = {
  name: string;
  description?: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  location?: string;
  timezone?: string;
  topics?: string[];
  isPublic?: boolean;
  websiteUrl?: string;
  venue?: string;
  capacity?: number;
  bannerImageUrl?: string;
};

/** Response from conference creation includes upgrade hints per ADR-008 */
type CreateConferenceResponse = Conference & {
  _userUpgraded?: boolean;
  _requiresTokenRefresh?: boolean;
};

type ApiRequestConfig = AxiosRequestConfig & {
  suppress403Redirect?: boolean;
};

export const createConference = async (payload: CreateConferenceInput): Promise<Conference> => {
  const config: ApiRequestConfig = {
    headers: { 'X-Suppress-403-Redirect': '1' },
    suppress403Redirect: true,
  };

  const response = await apiClient.post<CreateConferenceResponse>(
    API_ENDPOINTS.CONFERENCES.BASE,
    payload,
    config
  );
  const data = response.data;

  // ADR-008 Phase 7: force token refresh so future requests have updated cognito:groups
  if (data._requiresTokenRefresh === true) {
    await forceTokenRefresh();
  }

  return data;
};

export const listMyConferences = async (): Promise<Conference[]> => {
  const { data } = await apiClient.get<Conference[]>(API_ENDPOINTS.CONFERENCES.MINE);
  return data;
};

export const getConferenceById = async (id: number): Promise<Conference> => {
  const resp = await apiClient.get<Conference>(API_ENDPOINTS.CONFERENCES.PRIVATE_BY_ID(id));
  return resp.data as Conference;
};

export type UpdateConferenceInput = Partial<{
  name: string;
  description: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  location: string;
  timezone: string;
  topics: string[];
  isPublic: boolean;
  websiteUrl: string;
  venue: string;
  capacity: number;
  // Organizer profile
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  organizerWebsite: string;
  organizerLogoUrl: string;
  // Windows & visibility
  submissionsOpenFrom: string | null;
  submissionsOpenUntil: string | null;
  registrationOpenFrom: string | null;
  registrationOpenUntil: string | null;
}>;

export const updateConference = async (id: number, payload: UpdateConferenceInput): Promise<Conference> => {
  // Use unified conferences path for updates (delegates to same controller server-side)
  const resp = await apiClient.put<Conference>(API_ENDPOINTS.CONFERENCES.BY_ID(id), payload);
  return resp.data as Conference;
};

export const deleteConference = async (id: number): Promise<{ message: string } | void> => {
  // Use new organizer route: DELETE /api/organizer/conferences/:id
  const resp = await apiClient.delete(API_ENDPOINTS.ORGANIZER.CONFERENCE(id));
  return resp.data as { message: string };
};

// ----- Publishing & Visibility -----
export const publishConference = async (id: number) => {
  const resp = await apiClient.post(API_ENDPOINTS.ORGANIZER.PUBLISH(id), {});
  return resp.data as Conference;
};

export const unpublishConference = async (id: number) => {
  const resp = await apiClient.post(API_ENDPOINTS.ORGANIZER.UNPUBLISH(id), {});
  return resp.data as Conference;
};

export const publishSchedule = async (conferenceId: number) => {
  const resp = await apiClient.post(API_ENDPOINTS.ORGANIZER.SCHEDULE_PUBLISH(conferenceId), {});
  return resp.data as { message?: string };
};

export const unpublishSchedule = async (conferenceId: number) => {
  const resp = await apiClient.post(API_ENDPOINTS.ORGANIZER.SCHEDULE_UNPUBLISH(conferenceId), {});
  return resp.data as { message?: string };
};

// ----- Windows (CFP / Registration) -----
export const openCfpWindow = async (conferenceId: number) => {
  const resp = await apiClient.patch(API_ENDPOINTS.ORGANIZER.CFP_OPEN(conferenceId), {});
  return resp.data;
};

export const closeCfpWindow = async (conferenceId: number) => {
  const resp = await apiClient.patch(API_ENDPOINTS.ORGANIZER.CFP_CLOSE(conferenceId), {});
  return resp.data;
};

export const openRegistrationWindow = async (conferenceId: number) => {
  const resp = await apiClient.patch(API_ENDPOINTS.ORGANIZER.REG_OPEN(conferenceId), {});
  return resp.data;
};

export const closeRegistrationWindow = async (conferenceId: number) => {
  const resp = await apiClient.patch(API_ENDPOINTS.ORGANIZER.REG_CLOSE(conferenceId), {});
  return resp.data;
};
