// Force dynamic rendering for profile page
export const dynamic = 'force-dynamic';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
