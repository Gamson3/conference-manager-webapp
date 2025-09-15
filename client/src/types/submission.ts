export interface Author {
  id: number;
  authorName: string;
  authorEmail: string;
  affiliation?: string;
  isPresenter: boolean;
  order: number;
}

export interface Submission {
  id: number;
  title: string;
  abstract: string;
  createdAt: string;
  updatedAt: string;
  duration?: number;
  requestedDuration?: number;
  status: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  reviewComments?: string;
  reviewedAt?: string;
  authors: Author[];
  keywords: string[];
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  presentationType?: {
    id: number;
    name: string;
    defaultDuration: number;
  };
  materials?: {
    id: number;
    title: string;
    fileType: string;
    uploadedAt: string;
  }[];
  isLateSubmission?: boolean;
}

export interface SubmissionCardProps {
  submission: Submission;
  onApprove: () => void;
  onReject: () => void;
  onRevisionRequest: () => void;
  onView: () => void;
  onStatusChange: (submission: Submission) => void; // Add this new prop
}

export interface ConferenceMember {
  id: number;
  conferenceId: number;
  userId: number;
  isAttendee: boolean;
  isSpeaker: boolean;
  registeredAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface ConferenceSubmissionInfo {
  conference: {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  submissionSettings: {
    id: number;
    submissionDeadline: string;
    allowLateSubmissions: boolean;
    requireAbstract: boolean;
    maxAbstractLength: number;
    requireFullPaper: boolean;
    allowedFileTypes: string[];
    maxFileSize: number;
    requireAuthorBio: boolean;
    requireAffiliation: boolean;
    maxCoAuthors: number;
    requirePresenterDesignation: boolean;
    requireKeywords: boolean;
    minKeywords: number;
    maxKeywords: number;
    requirePresentationType: boolean;
    allowDurationRequest: boolean;
    reviewProcess: string;
    enableSubmissions: boolean;
    allowMultipleSubmissions: boolean;
    requireConsentToTerms: boolean;
    submissionGuidelines?: string;
    authorGuidelines?: string;
    presentationGuidelines?: string;
    reviewCriteria?: string;
    sendConfirmationEmail: boolean;
    sendStatusUpdates: boolean;
  };
  categories: Array<{
    id: number;
    name: string;
    description?: string;
    color?: string;
    order: number;
  }>;
  presentationTypes: Array<{
    id: number;
    name: string;
    description?: string;
    defaultDuration: number;
    minDuration: number;
    maxDuration: number;
    allowsQA: boolean;
    qaDuration: number;
    order: number;
  }>;
  isSubmissionOpen: boolean;
  daysUntilDeadline: number | null;
}

export type AbstractSubmissionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'REVISION_REQUESTED' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'WITHDRAWN';

export interface AbstractSubmission {
  id: number;
  title: string;
  content: string;
  keywords: string[];
  submitterId: number;
  conferenceId: number;
  status: AbstractSubmissionStatus;
  presentationTypeId?: number;
  requestedDuration?: number;
  biography?: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
  submissionDate: string;
  submitter: {
    id: number;
    name: string;
    email: string;
  };
  conference: {
    id: number;
    name: string;
  };
  presentationType?: {
    id: number;
    name: string;
    description?: string;
    defaultDuration: number;
  };
  reviews: Array<{
    id: number;
    score: number;
    comments?: string;
    recommendation: string;
    reviewer: {
      id: number;
      name: string;
    };
  }>;
}