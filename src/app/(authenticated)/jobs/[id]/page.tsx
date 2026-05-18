'use client';

import { useJob } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useCreateApplication } from '@/hooks/useApplicationMutations';
import { useCurrentUser } from '@/hooks/useUsers';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateMatchingScore } from '@/lib/matching';
import { useMemo } from 'react';
import { ArrowLeft, User, TrendingUp } from 'lucide-react';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { data: job, isLoading: jobLoading } = useJob(jobId);
  const { data: applications } = useApplications();
  const { data: currentUser } = useCurrentUser();
  const { mutate: createApplication, isPending } = useCreateApplication();

  const isCandidate = currentUser?.role === 'CANDIDATE';
  const isRecruiter = currentUser?.role === 'RECRUITER' || currentUser?.role === 'COMPANY_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Check if user has already applied
  const hasApplied = useMemo(() => {
    return applications?.some(app => app.jobId === jobId && app.userId === currentUser?.id);
  }, [applications, jobId, currentUser?.id]);

  // Get candidate skills from user profile
  const candidateSkills = useMemo(() => {
    if (!isCandidate || !currentUser) return [];
    return currentUser.skills || [];
  }, [currentUser, isCandidate]);

  // Calculate matching score for candidate
  const matchingResult = useMemo(() => {
    if (!isCandidate || !job || candidateSkills.length === 0) return null;
    
    const result = calculateMatchingScore({
      candidateSkills,
      requiredSkills: job.requiredSkills,
    });
    
    const missingSkills = job.requiredSkills.filter(skill => 
      !result.commonSkills.some((cs: string) => cs.toLowerCase() === skill.toLowerCase())
    );
    
    return {
      score: result.score * 100,
      commonSkills: result.commonSkills,
      totalRequired: job.requiredSkills.length,
      missingSkills
    };
  }, [isCandidate, job, candidateSkills]);

  // Get ranked applications for this job (Recruiter view)
  const rankedApplications = useMemo(() => {
    if (!isRecruiter || !applications) return [];
    
    return applications
      .filter(app => app.jobId === jobId)
      .sort((a, b) => (b.matchingScore || 0) - (a.matchingScore || 0));
  }, [applications, jobId, isRecruiter]);

  const handleApply = () => {
    if (!jobId) return;
    
    if (candidateSkills.length === 0) {
      router.push('/profile');
      return;
    }
    
    createApplication({
      jobId,
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

        <div className="grid gap-6 md:grid-cols-3">
          <div className={`md:col-span-${isRecruiter ? '2' : '3'} space-y-6`}>
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
                        (cs: string) => cs.toLowerCase() === skill.toLowerCase()
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
                            {matchingResult.missingSkills.map((skill: string, idx: number) => (
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

          {/* Recruiter view: Candidates ranking */}
          {isRecruiter && (
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Applicants
                  </CardTitle>
                  <CardDescription>
                    Candidates ranked by AI matching score
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {rankedApplications.length === 0 ? (
                    <div className="text-center p-6 bg-muted/20 rounded-lg border-2 border-dashed">
                      <p className="text-sm text-muted-foreground">No applications yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rankedApplications.map((app, index) => (
                        <div key={app.id} className="p-3 border rounded-lg bg-card hover:border-blue-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm">
                                {app.user?.email || 'Unknown User'}
                              </div>
                            </div>
                            <Badge 
                              variant={
                                (app.matchingScore || 0) >= 80 ? 'default' :
                                (app.matchingScore || 0) >= 50 ? 'secondary' :
                                'outline'
                              }
                            >
                              {Math.round(app.matchingScore || 0)}%
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {app.user?.skills?.slice(0, 3).map((skill: string) => (
                              <Badge key={skill} variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {skill}
                              </Badge>
                            ))}
                            {(app.user?.skills?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                +{(app.user?.skills?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground uppercase">{app.status}</span>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" asChild>
                              <a href={`mailto:${app.user?.email}`}>Contact</a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
