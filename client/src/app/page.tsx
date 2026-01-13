import PublicLayout from './(public)/layout';
import Landing from "./(public)/landing/page";


export default function Home() {
  return (
    <PublicLayout>
      <Landing />
    </PublicLayout>
  );
}