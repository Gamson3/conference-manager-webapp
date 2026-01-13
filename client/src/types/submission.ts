/**
 * Abstract Submission Types
 */

export interface AbstractSubmission {
  id: number;
  title: string;
  content: string;
  submitterId: number;
  conferenceId: number;
  status: 'submitted' | 'under review' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  submissionDate: string;
  
  submitter?: {
    id: number;
    name: string;
    email: string;
  };
  conference?: {
    id: number;
    name: string;
  };
  reviews?: AbstractReview[];
}

export interface AbstractReview {
  id: number;
  abstractId: number;
  reviewerId: number;
  score: number;
  comments?: string;
  recommendation: 'accept' | 'reject' | 'revise';
  reviewer?: {
    id: number;
    name: string;
  };
}

export interface SubmissionFormData {
  title: string;
  content: string;
  keywords: string[];
  authors: SubmissionAuthor[];
  presentationType?: string;
  presentationCategory?: string;
}

export interface SubmissionAuthor {
  name: string;
  email: string;
  affiliation: string;
  isPresenter: boolean;
  order: number;
}
