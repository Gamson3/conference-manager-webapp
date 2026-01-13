import apiClient from '@/lib/api/client';
import API_ENDPOINTS from '@/lib/api/endpoints';
import { type AxiosRequestConfig } from 'axios';

// ---------- Error mapping helper ----------
function mapApiError(action: string, err: unknown): never {
  type ApiErrorBody = { message?: string };
  type ApiErrorResponse = { status: number; data?: unknown };
  type ApiErrorLike = { response?: ApiErrorResponse; message?: string };

  const asObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

  const asApiErrorLike = (value: unknown): ApiErrorLike =>
    asObject(value) ? (value as ApiErrorLike) : {};

  const apiError = asApiErrorLike(err);
  const status = apiError.response?.status;

  const backendMessage = (() => {
    const data = apiError.response?.data;
    if (!asObject(data)) return undefined;
    const message = (data as ApiErrorBody).message;
    return typeof message === 'string' && message.length > 0 ? message : undefined;
  })();

  if (typeof status !== 'number') {
    throw new Error(`Failed to ${action}`);
  }

  if (status === 404) {
    throw new Error('Conference not found');
  }
  if (status === 403) {
    throw new Error('You do not have permission to manage this conference');
  }
  if (status === 400) {
    const msg = backendMessage || apiError.message || 'Bad request';
    throw new Error(msg);
  }
  throw new Error(`Failed to ${action}`);
}

const suppress403: AxiosRequestConfig & { suppress403Redirect: boolean } = {
  headers: { 'X-Suppress-403-Redirect': '1' },
  suppress403Redirect: true,
};

// ---------- Types ----------
export interface ConferenceCategory { id: number; conferenceId: number; name: string; description?: string; presentationsCount?: number; }
export interface PresentationType { id: number; conferenceId: number; name: string; description?: string; defaultDuration?: number | null; presentationsCount?: number; }
export type AbstractUploadMode = "TEXT" | "FILE" | "BOTH";
export type FullTextTiming = "onSubmission" | "afterAcceptance";

export interface SubmissionRequirement {
  conferenceId: number;
  minKeywords?: number | null;
  maxKeywords?: number | null;
  abstractMinLength?: number | null;
  abstractMaxLength?: number | null;
  requiresOrcid?: boolean;
  maxFileSizeMB?: number | null;
  allowedFileTypes?: string[];
   titleMaxWords?: number | null;
   bodyTextLabel?: string | null;
   bodyTextMinWords?: number | null;
   bodyTextMaxWords?: number | null;
   authorsEnabled?: boolean;
   collectAuthorEmail?: boolean;
   collectAuthorAffiliation?: boolean;
   collectAuthorPhone?: boolean;
   collectAuthorOrcid?: boolean;
   abstractUploadMode?: AbstractUploadMode;
   fileFieldLabel?: string | null;
   fileFieldRequired?: boolean;
   collectFullText?: boolean;
   fullTextTiming?: FullTextTiming;
  createdAt?: string; updatedAt?: string;
}
export interface TimelineMilestone { id: number; conferenceId: number; name: string; date: string; description?: string; type?: string | null; }

// ---------- Categories ----------
export const listCategories = async (conferenceId: number): Promise<ConferenceCategory[]> => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.SETUP.CATEGORIES(conferenceId), suppress403);
    return data as ConferenceCategory[];
  } catch (err) {
    mapApiError('load categories', err);
  }
};
export const createCategory = async (conferenceId: number, payload: { name: string; description?: string }) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.SETUP.CATEGORIES(conferenceId), payload, suppress403);
    return data as ConferenceCategory;
  } catch (err) {
    mapApiError('create category', err);
  }
};
export const updateCategory = async (conferenceId: number, categoryId: number, payload: { name?: string; description?: string }) => {
  try {
    const { data } = await apiClient.put(API_ENDPOINTS.SETUP.CATEGORY(conferenceId, categoryId), payload, suppress403);
    return data as ConferenceCategory;
  } catch (err) {
    mapApiError('update category', err);
  }
};
export const deleteCategory = async (conferenceId: number, categoryId: number) => {
  try {
    await apiClient.delete(API_ENDPOINTS.SETUP.CATEGORY(conferenceId, categoryId), suppress403);
  } catch (err) {
    mapApiError('delete category', err);
  }
};

// ---------- Presentation Types ----------
export const listTypes = async (conferenceId: number): Promise<PresentationType[]> => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.SETUP.TYPES(conferenceId), suppress403);
    return data as PresentationType[];
  } catch (err) {
    mapApiError('load presentation types', err);
  }
};
export const createType = async (conferenceId: number, payload: { name: string; description?: string; defaultDuration?: number }) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.SETUP.TYPES(conferenceId), payload, suppress403);
    return data as PresentationType;
  } catch (err) {
    mapApiError('create presentation type', err);
  }
};
export const updateType = async (conferenceId: number, typeId: number, payload: { name?: string; description?: string; defaultDuration?: number }) => {
  try {
    const { data } = await apiClient.put(API_ENDPOINTS.SETUP.TYPE(conferenceId, typeId), payload, suppress403);
    return data as PresentationType;
  } catch (err) {
    mapApiError('update presentation type', err);
  }
};
export const deleteType = async (conferenceId: number, typeId: number) => {
  try {
    await apiClient.delete(API_ENDPOINTS.SETUP.TYPE(conferenceId, typeId), suppress403);
  } catch (err) {
    mapApiError('delete presentation type', err);
  }
};

// ---------- Submission Requirements (Upsert) ----------
export const getRequirements = async (conferenceId: number): Promise<SubmissionRequirement | null> => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.SETUP.REQUIREMENTS(conferenceId), suppress403);
    return data || null;
  } catch (err) {
    mapApiError('load submission requirements', err);
  }
};
export const upsertRequirements = async (conferenceId: number, payload: Partial<SubmissionRequirement>) => {
  try {
    const { data } = await apiClient.put(API_ENDPOINTS.SETUP.REQUIREMENTS(conferenceId), payload, suppress403);
    return data as SubmissionRequirement;
  } catch (err) {
    mapApiError('save submission requirements', err);
  }
};

// ---------- Timeline Milestones ----------
export const listMilestones = async (conferenceId: number): Promise<TimelineMilestone[]> => {
  try {
    const { data } = await apiClient.get(API_ENDPOINTS.SETUP.MILESTONES(conferenceId), suppress403);
    return data as TimelineMilestone[];
  } catch (err) {
    mapApiError('load milestones', err);
  }
};
export const createMilestone = async (conferenceId: number, payload: { name: string; date: string; description?: string; type?: string }) => {
  try {
    const { data } = await apiClient.post(API_ENDPOINTS.SETUP.MILESTONES(conferenceId), payload, suppress403);
    return data as TimelineMilestone;
  } catch (err) {
    mapApiError('create milestone', err);
  }
};
export const updateMilestone = async (conferenceId: number, milestoneId: number, payload: { name?: string; date?: string; description?: string; type?: string }) => {
  try {
    const { data } = await apiClient.put(API_ENDPOINTS.SETUP.MILESTONE(conferenceId, milestoneId), payload, suppress403);
    return data as TimelineMilestone;
  } catch (err) {
    mapApiError('update milestone', err);
  }
};
export const deleteMilestone = async (conferenceId: number, milestoneId: number) => {
  try {
    await apiClient.delete(API_ENDPOINTS.SETUP.MILESTONE(conferenceId, milestoneId), suppress403);
  } catch (err) {
    mapApiError('delete milestone', err);
  }
};

// ---------- Quick Window Actions ----------
export const openCfp = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.CFP_OPEN(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('open CFP window', err);
  }
};
export const closeCfp = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.CFP_CLOSE(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('close CFP window', err);
  }
};
export const openRegistration = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.REG_OPEN(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('open registration window', err);
  }
};
export const closeRegistration = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.REG_CLOSE(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('close registration window', err);
  }
};

// ---------- Schedule publish/unpublish ----------
export const publishSchedule = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.SCHEDULE_PUBLISH(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('publish schedule', err);
  }
};

export const unpublishSchedule = async (conferenceId: number) => {
  try {
    const { data } = await apiClient.patch(API_ENDPOINTS.SETUP.SCHEDULE_UNPUBLISH(conferenceId), {}, suppress403);
    return data;
  } catch (err) {
    mapApiError('unpublish schedule', err);
  }
};
