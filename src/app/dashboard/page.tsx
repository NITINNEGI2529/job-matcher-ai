'use client';

import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useUsers';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard';
import { CompanyAdminDashboard } from '@/components/dashboard/company-admin-dashboard';
import { RecruiterDashboard } from '@/components/dashboard/recruiter-dashboard';
import { CandidateDashboard } from '@/components/dashboard/candidate-dashboard';

export default function DashboardPage() {
  const { user: clerkUser } = useUser();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  const role = currentUser?.role || 'CANDIDATE';
  const domainId = currentUser?.domainId;

  const getRoleDisplay = (role: string) => {
    return role.replace('_', ' ');
  };

  const getRoleVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'COMPANY_ADMIN':
        return 'default';
      case 'RECRUITER':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">JM</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Job Matcher
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {role !== 'CANDIDATE' && (
                <Badge variant={getRoleVariant(role)} className="hidden sm:flex">
                  {getRoleDisplay(role)}
                </Badge>
              )}
              <div className="text-sm text-right hidden md:block">
                <p className="font-medium">{clerkUser?.emailAddresses[0]?.emailAddress}</p>
                <p className="text-xs text-muted-foreground">
                  {domainId ? `Domain: ${domainId.slice(0, 8)}...` : 'No organization'}
                </p>
              </div>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10'
                  }
                }}
              />
            </div>
          </div>
        </div>
      </header>

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
