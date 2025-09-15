// Simple redirect to new public Discover page
import { redirect } from 'next/navigation';

export default function AttendeeDiscoverRedirect() {
  redirect('/discover');
}