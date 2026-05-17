'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useUsers';
import { useCreateDomain, useDomains } from '@/hooks/useDomains';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DomainsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: domains, isLoading: domainsLoading } = useDomains();
  const { mutate: createDomain, isPending } = useCreateDomain();

  const [name, setName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !domainName.trim()) {
      setErrorMessage('Both name and domain name are required.');
      return;
    }

    setErrorMessage(null);

    createDomain(
      { name: name.trim(), domainName: domainName.trim() },
      {
        onSuccess: () => {
          setName('');
          setDomainName('');
        },
        onError: () => {
          setErrorMessage('Unable to create domain. Please try again.');
        },
      }
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not authorized</CardTitle>
              <CardDescription>
                Only Super Admins can manage organizations.
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
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Manage Domains</CardTitle>
                <CardDescription>
                  Create new organizations and review existing domains.
                </CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Domain Name</label>
                  <Input
                    value={domainName}
                    onChange={(event) => setDomainName(event.target.value)}
                    placeholder="example-company"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Example Company"
                    disabled={isPending}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Domain'}
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Domains</CardTitle>
            <CardDescription>
              Domains are created by Super Admins and used to isolate jobs and users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-20 rounded-md border bg-muted p-4" />
                ))}
              </div>
            ) : domains?.length ? (
              <div className="space-y-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                      <div>
                        <p className="font-semibold">{domain.name}</p>
                        <p className="text-sm text-muted-foreground">{domain.domainName}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {domain.verified ? 'Verified' : 'Unverified'} • {domain.disabled ? 'Disabled' : 'Enabled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No domains available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
