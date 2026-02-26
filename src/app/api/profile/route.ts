import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';

/**
 * PATCH /api/profile
 * 
 * Updates a candidate's profile skills and recalculates matching scores for all applications.
 * - Only candidates can update their own profile
 * - Validates at least one skill is provided
 * - Updates user's candidateSkills in all applications
 * - Recalculates matching scores for all user's applications
 * 
 * Requirements: 2.3, 2.4, 2.5
 * 
 * @param request - Request object with body { skills: string[] }
 * @returns Updated user profile
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a candidate
 * @throws {ValidationError} If skills validation fails
 */
export async function PATCH(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      // Requirement 2.3: Only candidates can update their profile
      if (user.role !== Role.CANDIDATE) {
        throw new AuthorizationError('Only candidates can update their profile');
      }
      
      // Parse and validate request body
      const body = await request.json();
      const { skills } = body;
      
      // Requirement 2.5: Validate at least one skill is provided
      if (!skills || !Array.isArray(skills)) {
        throw new ValidationError('skills is required and must be an array');
      }
      
      if (skills.length === 0) {
        throw new ValidationError('At least one skill is required');
      }
      
      // Validate all skills are strings
      if (!skills.every((skill) => typeof skill === 'string')) {
        throw new ValidationError('All skills must be strings');
      }
      
      // Trim and filter empty skills
      const trimmedSkills = skills.map((s) => s.trim()).filter((s) => s.length > 0);
      
      if (trimmedSkills.length === 0) {
        throw new ValidationError('At least one non-empty skill is required');
      }
      
      // Requirement 2.4: Update candidate skills in all applications
      // Requirement 2.5: Recalculate matching scores for all user's applications
      
      // Fetch all user's applications with job details
      const applications = await prisma.application.findMany({
        where: { userId: user.id },
        include: {
          job: {
            select: {
              requiredSkills: true,
            },
          },
        },
      });
      
      // Update each application with new skills and recalculated matching score
      await Promise.all(
        applications.map(async (application) => {
          const matchingResult = calculateMatchingScore({
            candidateSkills: trimmedSkills,
            requiredSkills: application.job.requiredSkills,
          });
          
          return prisma.application.update({
            where: { id: application.id },
            data: {
              candidateSkills: trimmedSkills,
              matchingScore: matchingResult.score,
            },
          });
        })
      );
      
      // Return success response with updated skills
      return Response.json({
        profile: {
          userId: user.id,
          skills: trimmedSkills,
          applicationsUpdated: applications.length,
        },
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
