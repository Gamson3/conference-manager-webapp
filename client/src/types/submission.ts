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