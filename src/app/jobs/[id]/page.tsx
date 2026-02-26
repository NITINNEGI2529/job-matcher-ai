'use client';

import { useJob } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useCreateApplication } from '@/hooks/useApplicationMutations';
import { useCurrentUser } from '@/hooks/useUsers';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateMatchingScore } from '@/lib/matching';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: applications } = useApplications();
  const { data: currentUser } = useCurrentUser();
  const { mutate: createApplication, isPending } = useCreateApplication();

  const isCandidate = currentUser?.role === 'CANDIDATE';

  // Check if user has already applied
  const hasApplied = useMemo(() => {
    return applications?.some(app => app.jobId === jobId);
  }, [applications, jobId]);

  // Get candidate skills from their most recent application
  const candidateSkills = useMemo(() => {
    if (!isCandidate || !applications || applications.length === 0) return [];
    const sortedApps = [...applications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sortedApps[0]?.candidateSkills || [];
  }, [applications, isCandidate]);

  // Calculate matching score
  const matchingResult = useMemo(() => {
    if (!isCandidate || !job || candidateSkills.length === 0) return null;
    return calculateMatchingScore({
      candidateSkills,
      requiredSkills: job.requiredSkills,
    });
  }, [isCandidate, job, candidateSkills]);

  const handleApply = () => {
    if (!jobId || candidateSkills.length === 0) return;
    
    createApplication({
      jobId,
      candidateSkills,
    });
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Job not found</p>
              <Button onClick={() => router.push('/jobs')} variant="link" className="mt-2">
                Back to jobs
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
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Job details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                <CardDescription>Posted on {new Date(job.createdAt).toLocaleDateString()}</CardDescription>
              </div>
              {isCandidate && matchingResult && (
                <Badge 
                  variant={
                    matchingResult.score >= 80 ? 'default' :
                    matchingResult.score >= 50 ? 'secondary' :
                    'outline'
                  }
                  className="text-lg px-4 py-2"
                >
                  {Math.round(matchingResult.score)}% Match
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Required Skills */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, idx) => {
                  const isMatched = isCandidate && candidateSkills.some(
                    cs => cs.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <Badge 
                      key={idx} 
                      variant={isMatched ? 'default' : 'outline'}
                    >
                      {skill}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Matching breakdown for candidates */}
            {isCandidate && matchingResult && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Your Match</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      You have {matchingResult.commonSkills.length} of {matchingResult.totalRequired} required skills
                    </p>
                  </div>
                  
                  {matchingResult.commonSkills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Matching Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {matchingResult.commonSkills.map((skill, idx) => (
                          <Badge key={idx} variant="default">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {matchingResult.missingSkills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Missing Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {matchingResult.missingSkills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Apply button for candidates */}
            {isCandidate && (
              <div className="border-t pt-6">
                {hasApplied ? (
                  <Button disabled className="w-full" size="lg">
                    Already Applied
                  </Button>
                ) : candidateSkills.length === 0 ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Please update your profile with skills before applying
                    </p>
                    <Button onClick={() => router.push('/profile')} variant="outline">
                      Update Profile
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleApply} 
                    disabled={isPending}
                    className="w-full" 
                    size="lg"
                  >
                    {isPending ? 'Submitting...' : 'Apply Now'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
