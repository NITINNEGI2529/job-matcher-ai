import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError, AuthorizationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * GET /api/jobs
 * 
 * Fetches jobs with role-based filtering and pagination.
 * - Candidates see jobs from all domains
 * - Recruiters/Company_Admins see only their domain jobs
 * - Super_Admin sees all jobs
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Number of jobs per page (default: 10)
 * - domainId: Optional domain filter
 * 
 * @param request - Request object with query parameters
 * @returns Paginated jobs array with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ValidationError} If query parameters are invalid
 */
export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      const domainIdFilter = searchParams.get('domainId');
      
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
      const whereClause: { domainId?: string } = {};
      
      if (user.role === Role.CANDIDATE) {
        // Candidates see jobs from all domains
        if (domainIdFilter) {
          whereClause.domainId = domainIdFilter;
        }
      } else if (user.role === Role.SUPER_ADMIN) {
        // Super_Admin sees all jobs
        if (domainIdFilter) {
          whereClause.domainId = domainIdFilter;
        }
      } else {
        // Recruiters and Company_Admins see only their domain jobs
        if (domainId) {
          whereClause.domainId = domainId;
        }
      }
      
      // Fetch jobs with pagination
      const jobs = await prisma.job.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Get total count for pagination metadata
      const total = await prisma.job.count({
        where: whereClause,
      });
      
      return Response.json({
        jobs,
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
 * POST /api/jobs
 * 
 * Creates a new job posting.
 * - Only Recruiter, Company_Admin, or Super_Admin can create jobs
 * - Job is created with the user's domainId
 * 
 * Request Body:
 * - title: Job title (required)
 * - description: Job description (required)
 * - requiredSkills: Array of required skills (required)
 * 
 * @param request - Request object with job data
 * @returns Created job with id, title, description, requiredSkills, domainId, createdAt
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user doesn't have permission to create jobs
 * @throws {ValidationError} If request body is invalid
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Validate user has permission to create jobs
      if (user.role === Role.CANDIDATE) {
        throw new AuthorizationError('Candidates cannot create jobs');
      }
      
      // Validate user has a domainId (required for job creation)
      if (!domainId) {
        throw new ValidationError('User must belong to a domain to create jobs');
      }
      
      // Parse request body
      const body = await request.json();
      const { title, description, requiredSkills } = body;
      
      // Validate required fields
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new ValidationError('title is required and must be a non-empty string');
      }
      
      // Validate title length (5-200 characters) - Requirement 5.5
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 5) {
        throw new ValidationError('Job title must be at least 5 characters');
      }
      if (trimmedTitle.length > 200) {
        throw new ValidationError('Job title must not exceed 200 characters');
      }
      
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw new ValidationError('description is required and must be a non-empty string');
      }
      
      // Validate description length (20-5000 characters) - Requirement 5.6
      const trimmedDescription = description.trim();
      if (trimmedDescription.length < 20) {
        throw new ValidationError('Job description must be at least 20 characters');
      }
      if (trimmedDescription.length > 5000) {
        throw new ValidationError('Job description must not exceed 5000 characters');
      }
      
      if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
        throw new ValidationError('requiredSkills is required and must be a non-empty array');
      }
      
      // Validate all skills are strings
      if (!requiredSkills.every(skill => typeof skill === 'string' && skill.trim().length > 0)) {
        throw new ValidationError('All requiredSkills must be non-empty strings');
      }
      
      // Create job with user's domainId - Requirements 5.2, 5.3
      const job = await prisma.job.create({
        data: {
          title: trimmedTitle,
          description: trimmedDescription,
          requiredSkills: requiredSkills.map(skill => skill.trim()),
          domainId,
        },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
          domainId: true,
          createdAt: true,
        },
      });
      
      return Response.json({ job }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
