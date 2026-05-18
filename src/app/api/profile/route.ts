import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { calculateMatchingScore } from '@/lib/matching';
import { Role } from '@/generated/prisma';
import { successResponse } from '@/lib/api/response';

/**
 * PATCH /api/profile
 * 
 * Updates a candidate's profile skills and recalculates matching scores for all applications.
 * - Only candidates can update their own profile
 * - Validates at least one skill is provided
 * - Updates user's skills in the User model
 * - Recalculates matching scores for all user's applications using the updated skills
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
      const trimmedSkills = skills.map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      if (trimmedSkills.length === 0) {
        throw new ValidationError('At least one non-empty skill is required');
      }

      // ── Atomic: update skills + recalculate all application scores ──────────
      // Using $transaction ensures a partial failure (e.g. one score update)
      // cannot leave skills updated but scores stale.
      const result = await prisma.$transaction(async (tx) => {
        // Update user's skills
        await tx.user.update({
          where: { id: user.id },
          data: { skills: trimmedSkills },
        });

        // Fetch all user's applications with job details
        const applications = await tx.application.findMany({
          where: { userId: user.id },
          include: {
            job: { select: { requiredSkills: true } },
          },
        });

        // Recalculate matching scores for all applications
        await Promise.all(
          applications.map((application) => {
            const matchingResult = calculateMatchingScore({
              candidateSkills: trimmedSkills,
              requiredSkills: application.job.requiredSkills,
            });

            return tx.application.update({
              where: { id: application.id },
              data: { matchingScore: matchingResult.score },
            });
          })
        );

        return applications.length;
      });

      // Trigger embedding regeneration since skills changed
      import('@/lib/ai/embeddings').then(({ generateAndStoreCandidateEmbedding }) => {
        generateAndStoreCandidateEmbedding(user.id).catch(console.error);
      });

      return successResponse({
        userId: user.id,
        skills: trimmedSkills,
        applicationsUpdated: result,
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

