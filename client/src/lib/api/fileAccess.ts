/**
 * Utilities for accessing private submission files via signed URLs.
 * Files are stored in R2/S3 and accessed through authorized endpoints.
 */

import apiClient from './client';
import { API_ENDPOINTS } from './endpoints';

export interface FileAccessResponse {
  url: string;
  fileName?: string;
  expiresIn?: number;
}

/**
 * Get a signed URL to access a submission file.
 * Opens the file in a new browser tab for preview.
 * 
 * @param submissionId - The submission ID
 * @param type - 'abstract' or 'fulltext'
 */
export async function openSubmissionFile(
  submissionId: number,
  type: 'abstract' | 'fulltext'
): Promise<void> {
  try {
    const response = await apiClient.get<FileAccessResponse>(
      API_ENDPOINTS.SUBMISSIONS.FILE(submissionId, type)
    );
    
    if (response.data?.url) {
      // Open in new tab for preview
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
    } else {
      throw new Error('No file URL returned');
    }
  } catch (error) {
    console.error(`Failed to open ${type} file:`, error);
    throw error;
  }
}

/**
 * Get a signed URL for downloading a submission file.
 * Forces download instead of preview.
 * 
 * @param submissionId - The submission ID
 * @param type - 'abstract' or 'fulltext'
 */
export async function downloadSubmissionFile(
  submissionId: number,
  type: 'abstract' | 'fulltext'
): Promise<void> {
  try {
    const response = await apiClient.get<FileAccessResponse>(
      API_ENDPOINTS.SUBMISSIONS.FILE_DOWNLOAD(submissionId, type)
    );
    
    if (response.data?.url) {
      // Create a temporary link and click it to trigger download
      const link = document.createElement('a');
      link.href = response.data.url;
      link.download = response.data.fileName || `${type}-${submissionId}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      throw new Error('No file URL returned');
    }
  } catch (error) {
    console.error(`Failed to download ${type} file:`, error);
    throw error;
  }
}

/**
 * Get the signed URL for a submission file without opening it.
 * Useful for embedding in iframes or custom preview components.
 * 
 * @param submissionId - The submission ID
 * @param type - 'abstract' or 'fulltext'
 * @returns The signed URL and metadata
 */
export async function getSubmissionFileUrl(
  submissionId: number,
  type: 'abstract' | 'fulltext'
): Promise<FileAccessResponse> {
  const response = await apiClient.get<FileAccessResponse>(
    API_ENDPOINTS.SUBMISSIONS.FILE(submissionId, type)
  );
  
  if (!response.data?.url) {
    throw new Error('No file URL returned');
  }
  
  return response.data;
}

/**
 * Check if a submission has a file of the given type.
 * This checks for either legacy URL or new R2 key.
 */
export function submissionHasFile(
  submission: {
    abstractFileUrl?: string | null;
    abstractFileKey?: string | null;
    fullTextFileUrl?: string | null;
    fullTextFileKey?: string | null;
  },
  type: 'abstract' | 'fulltext'
): boolean {
  if (type === 'abstract') {
    return Boolean(submission.abstractFileUrl || submission.abstractFileKey);
  }
  return Boolean(submission.fullTextFileUrl || submission.fullTextFileKey);
}
