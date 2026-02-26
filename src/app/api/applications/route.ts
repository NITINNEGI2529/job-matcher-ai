import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError, NotFoundError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';

/**
 * GET /api/applications
 * 
 * Fetches applications with role-based filtering.
 * - Candidates see only their own applications
 * - Recruiters/Company_Admins see applications for jobs in their domain
 * - Super_Admin sees all applications
 * 
 * @param request - Request object
 * @returns Array of applications with pagination
 * @throws {AuthenticationError} If user is not authenticated
 */
export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      
      // Validate and parse pagination parameters
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 10;
      
      if (isNaN(page) || page < 1) {
        throw new ValidationError('page must be a positive integer');
      }
      
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationError('limit must be a positive integer between 1 and 100');
      }
      
      // Calculate skip for pagination
      const skip = (page - 1) * limit;
      
      // Build where clause based on role
      const whereClause: { userId?: string; job?: { domainId?: string } } = {};
      
      if (user.role === Role.CANDIDATE) {
        // Candidates see only their own applications
        whereClause.userId = user.id;
      } else if (user.role !== Role.SUPER_ADMIN) {
        // Recruiters and Company_Admins see applications for jobs in their domain
        if (domainId) {
          whereClause.job = { domainId };
        }
      }
      // Super_Admin sees all applications (empty whereClause)
      
      // Fetch applications with pagination
      const applications = await prisma.application.findMany({
        where: whereClause,
        select: {
          id: true,
          jobId: true,
          userId: true,
          candidateSkills: true,
          matchingScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              description: true,
              requiredSkills: true,
              domainId: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Get total count for pagination metadata
      const total = await prisma.application.count({
        where: whereClause,
      });
      
      return Response.json({
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/applications
 * 
 * Creates a new job application for a candidate.
 * - Only Candidates can create applications
 * - Validates request body has jobId and candidateSkills
 * - Checks for duplicate application (unique constraint on jobId + userId)
 * - Fetches job to get requiredSkills
 * - Calculates matching score using calculateMatchingScore
 * - Creates application with candidateSkills, matchingScore, status=PENDING
 * 
 * @param request - Request object with body { jobId: string, candidateSkills: string[] }
 * @returns Created application with id, jobId, userId, candidateSkills, matchingScore, status, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a Candidate
 * @throws {ValidationError} If request body is invalid or duplicate application exists
 * @throws {NotFoundError} If job is not found
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      // Validate user is Candidate
      if (user.role !== Role.CANDIDATE) {
        throw new AuthorizationError('Only candidates can create applications');
      }
      
      // Parse and validate request body
      const body = await request.json();
      const { jobId, candidateSkills } = body;
      
      if (!jobId || typeof jobId !== 'string') {
        throw new ValidationError('jobId is required and must be a string');
      }
      
      if (!Array.isArray(candidateSkills) || candidateSkills.length === 0) {
        throw new ValidationError('candidateSkills is required and must be a non-empty array');
      }
      
      if (!candidateSkills.every(skill => typeof skill === 'string')) {
        throw new ValidationError('All candidateSkills must be strings');
      }
      
      // Check for duplicate application
      const existingApplication = await prisma.application.findUnique({
        where: {
          jobId_userId: {
            jobId,
            userId: user.id,
          },
        },
      });
      
      if (existingApplication) {
        throw new ValidationError('You have already applied to this job');
      }
      
      // Fetch job to get requiredSkills
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          requiredSkills: true,
        },
      });
      
      if (!job) {
        throw new NotFoundError('Job');
      }
      
      // Calculate matching score
      const matchingResult = calculateMatchingScore({
        candidateSkills,
        requiredSkills: job.requiredSkills,
      });
      
      // Create application
      const application = await prisma.application.create({
        data: {
          jobId,
          userId: user.id,
          candidateSkills,
          matchingScore: matchingResult.score,
          status: 'PENDING',
        },
        select: {
          id: true,
          jobId: true,
          userId: true,
          candidateSkills: true,
          matchingScore: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      return Response.json({ application }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
