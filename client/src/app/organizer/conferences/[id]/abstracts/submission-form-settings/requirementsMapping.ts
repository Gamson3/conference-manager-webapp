import type { AbstractUploadMode, SubmissionRequirement } from "@/features/conferences/api/conferenceSetupApi";

/**
 * Maps UI state to backend requirements.
 *
 * Design:
 * - Abstract text is ALWAYS required
 * - File upload is optional/supplementary (can be enabled/disabled)
 * - When file upload is enabled, organizer can make it required or optional
 *
 * Backend mapping:
 * - allowFileUpload=false → TEXT mode, fileFieldRequired=false
 * - allowFileUpload=true + fileRequired=false → BOTH mode, fileFieldRequired=false
 * - allowFileUpload=true + fileRequired=true → BOTH mode, fileFieldRequired=true
 */

export interface UploadRequirementsUiInput {
  allowFileUpload: boolean;
  fileRequired: boolean;
}

export interface UploadRequirementsMapping {
  abstractUploadMode: AbstractUploadMode;
  fileFieldRequired: boolean;
}

export function mapUploadUiToRequirements(
  input: UploadRequirementsUiInput
): UploadRequirementsMapping {
  const { allowFileUpload, fileRequired } = input;

  if (!allowFileUpload) {
    // Text only - no file upload shown
    return { abstractUploadMode: "TEXT", fileFieldRequired: false };
  }

  // File upload allowed - always BOTH mode (text + optional/required file)
  return {
    abstractUploadMode: "BOTH",
    fileFieldRequired: fileRequired,
  };
}

export function buildUploadRequirementPayload(
  input: UploadRequirementsUiInput
): Pick<SubmissionRequirement, "abstractUploadMode" | "fileFieldRequired"> {
  return mapUploadUiToRequirements(input);
}
