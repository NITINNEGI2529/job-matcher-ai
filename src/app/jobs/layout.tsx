// Force dynamic rendering for jobs pages
export const dynamic = 'force-dynamic';

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
