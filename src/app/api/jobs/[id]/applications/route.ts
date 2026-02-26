import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, NotFoundError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * GET /api/jobs/[id]/applications
 * 
 * Fetches all applications for a specific job.
 * - Only Recruiter, Company_Admin, or Super_Admin can view applications
 * - Recruiters/Company_Admins can only view applications for jobs in their domain
 * - Super_Admin can view applications for any job
 * 
 * @param request - Request object
 * @param params - Route parameters with job id
 * @returns Applications array with id, jobId, userId, candidateSkills, matchingScore, status, createdAt, user details
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to view applications
 * @throws {NotFoundError} If job is not found
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to view applications
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot view job applications');
      }
      
      const { id: jobId } = await params;
      
      // Fetch job to check existence and domain
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          domainId: true,
        },
      });
      
      if (!job) {
        throw new NotFoundError('Job');
      }
      
      // Apply domain isolation for non-Super_Admin users
      if (user.role !== Role.SUPER_ADMIN) {
        if (job.domainId !== domainId) {
          throw new AuthorizationError('You do not have permission to view applications for this job');
        }
      }
      
      // Fetch all applications for the job with user details
      const applications = await prisma.application.findMany({
        where: { jobId },
        select: {
          id: true,
          jobId: true,
          userId: true,
          candidateSkills: true,
          matchingScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              clerkId: true,
            },
          },
        },
        orderBy: [
          { matchingScore: 'desc' }, // Order by matching score (highest first)
          { createdAt: 'desc' },     // Then by creation date
        ],
      });
      
      return Response.json({ applications });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
