'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreateJob } from '@/hooks/useJobMutations';
import { useCurrentUser } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function NewJobPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { mutate: createJob, isPending } = useCreateJob();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const requiredSkills = skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (!trimmedTitle || !trimmedDescription || requiredSkills.length === 0) {
      setErrorMessage('Title, description, and required skills are all required.');
      return;
    }

    setErrorMessage(null);

    createJob(
      {
        title: trimmedTitle,
        description: trimmedDescription,
        requiredSkills,
      },
      {
        onSuccess: () => {
          router.push('/jobs');
        },
        onError: () => {
          setErrorMessage('Unable to create job posting. Please try again.');
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

  if (!currentUser || currentUser.role === 'CANDIDATE') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Not authorized</CardTitle>
              <CardDescription>
                Only Recruiters, Company Admins, or Super Admins can create job postings.
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
                <CardTitle>Create New Job</CardTitle>
                <CardDescription>
                  Post a new role to your domain and connect with candidates.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/jobs">Back to job listings</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Senior Product Designer"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the responsibilities, team, and desired qualifications."
                  rows={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Required Skills</label>
                <Input
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                  placeholder="Enter comma-separated skills, e.g. React, TypeScript, SQL"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Separate skills with commas.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create Job'}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/jobs">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
