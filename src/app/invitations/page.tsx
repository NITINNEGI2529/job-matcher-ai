'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useUsers';
import { useCreateInvitation } from '@/hooks/useInvitationMutations';
import { useDomains } from '@/hooks/useDomains';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Role } from '@/generated/prisma';

export default function InvitationsPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { mutate: createInvitation, isPending } = useCreateInvitation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('RECRUITER');
  const [domainId, setDomainId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isCompanyAdmin = currentUser?.role === 'COMPANY_ADMIN';
  const isAuthorized = isSuperAdmin || isCompanyAdmin;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('A valid email is required.');
      return;
    }

    if (isSuperAdmin && !domainId) {
      setErrorMessage('Please select a domain.');
      return;
    }

    setErrorMessage(null);

    const payload: { email: string; role: Role; domainId?: string } = {
      email: trimmedEmail,
      role,
    };
    if (isSuperAdmin) {
      payload.domainId = domainId;
    }

    createInvitation(payload, {
      onSuccess: () => {
        setEmail('');
        setRole('RECRUITER');
        setDomainId('');
        router.push('/dashboard');
      },
      onError: () => {
        setErrorMessage('Unable to send invitation. Please try again.');
      },
    });
  };

  if (userLoading || (isSuperAdmin && domainsLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>
                Only Company Admins and Super Admins can send invitations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>
                  {isSuperAdmin ? 'Invite Users to Domain' : 'Invite Recruiters'}
                </CardTitle>
                <CardDescription>
                  {isSuperAdmin
                    ? 'Send an invitation to any user for a specific organization. They will receive an email and can complete their signup.'
                    : 'Send an invitation to a recruiter in your organization. They will receive an email and can complete their signup.'}
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Domain / Organization</label>
                  <select
                    value={domainId}
                    onChange={(event) => setDomainId(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                    disabled={isPending || domainsLoading}
                  >
                    <option value="">Select a domain...</option>
                    {domains?.map((domain) => (
                      <option key={domain.id} value={domain.id}>
                        {domain.name} ({domain.domainName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="user@example.com"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                  disabled={isPending}
                >
                  <option value="RECRUITER">Recruiter</option>
                  {isSuperAdmin && (
                    <>
                      <option value="COMPANY_ADMIN">Company Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </>
                  )}
                  {isCompanyAdmin && <option value="COMPANY_ADMIN">Company Admin</option>}
                </select>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

