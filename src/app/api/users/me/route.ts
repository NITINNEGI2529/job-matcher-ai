import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError } from '@/lib/errors';

/**
 * GET /api/users/me
 * 
 * Fetches the authenticated user's profile with domain information.
 * 
 * @returns User object with id (Clerk ID), email, role, domainId, createdAt, and domain details
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {NotFoundError} If user is not found in database
 */
export async function GET() {
  try {
    return await withDomainIsolation(async (user) => {
      // Return user with domain information
      // The user object from withDomainIsolation already includes the domain
      return Response.json({
        user: {
          id: user.id, // This is the Clerk ID
          email: user.email,
          role: user.role,
          domainId: user.domainId,
          skills: user.skills,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          domain: user.domain,
        },
      });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
