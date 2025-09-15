import ConferenceSubmissionForm from '@/components/presenter/ConferenceSubmissionForm';

interface SubmitProposalPageProps {
  params: {
    conferenceId: string;
  };
}

export default function SubmitProposalPage({ params }: SubmitProposalPageProps) {
  return (
    <div className="container mx-auto p-6">
      <ConferenceSubmissionForm 
        conferenceId={parseInt(params.conferenceId)}
      />
    </div>
  );
}