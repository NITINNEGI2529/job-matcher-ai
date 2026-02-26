'use client';

import { useUser } from '@clerk/nextjs';
import { useCurrentUser } from '@/hooks/useUsers';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { CompanyAdminDashboard } from '@/components/dashboard/company-admin-dashboard';
import { RecruiterDashboard } from '@/components/dashboard/recruiter-dashboard';
import { CandidateDashboard } from '@/components/dashboard/candidate-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user: clerkUser } = useUser();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const role = currentUser?.role || 'CANDIDATE';
  const domainId = currentUser?.domainId;

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      <main className="container mx-auto px-4 py-8">
        {role === 'CANDIDATE' && !domainId ? (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, {clerkUser?.firstName || 'User'}! 👋
            </h2>
            <p className="text-muted-foreground">
              Complete your profile to get started
            </p>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                Welcome back, {clerkUser?.firstName || 'User'}! 👋
              </h2>
              {(role !== 'CANDIDATE') && (
                <p className="text-muted-foreground">
                  {role === 'SUPER_ADMIN' && "Manage the entire platform from here."}
                  {role === 'COMPANY_ADMIN' && "Oversee your organization and recruiting team."}
                  {role === 'RECRUITER' && "Manage your job postings and review applications."}
                </p>
              )}
            </div>

            {/* Role-specific Dashboard */}
            {role === 'SUPER_ADMIN' && <SuperAdminDashboard />}
            {role === 'COMPANY_ADMIN' && <CompanyAdminDashboard />}
            {role === 'RECRUITER' && <RecruiterDashboard />}
            {role === 'CANDIDATE' && <CandidateDashboard />}
          </>
        )}
      </main>
    </div>
  );
}
