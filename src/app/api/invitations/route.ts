import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, AuthorizationError, ValidationError } from '@/lib/errors';
import { Role } from '@/generated/prisma';

/**
 * POST /api/invitations
 * 
 * Creates a recruiter invitation for a company admin's domain.
 * - Only COMPANY_ADMIN can send invitations
 * - Creates invitation record with email and RECRUITER role (default)
 * - Associates invitation with company admin's domain
 * 
 * Requirements: 9.4, 9.5, 9.6
 * 
 * @param request - Request object with body { email: string, role?: Role }
 * @returns Created invitation record
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not a COMPANY_ADMIN
 * @throws {ValidationError} If email is missing or invalid
 */
export async function POST(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Requirement 9.4: Only COMPANY_ADMIN can send invitations
      if (user.role !== Role.COMPANY_ADMIN) {
        throw new AuthorizationError('Only COMPANY_ADMIN can send invitations');
      }
      
      // Company admin must have a domain
      if (!domainId) {
        throw new AuthorizationError('Company admin must be associated with a domain');
      }
      
      // Parse and validate request body
      const body = await request.json();
      const { email, role = Role.RECRUITER } = body;
      
      // Validate email is provided
      if (!email || typeof email !== 'string') {
        throw new ValidationError('email is required and must be a string');
      }
      
      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }
      
      // Validate role if provided
      if (role && typeof role !== 'string') {
        throw new ValidationError('role must be a string');
      }
      
      const validRoles: Role[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'RECRUITER', 'CANDIDATE'];
      if (role && !validRoles.includes(role as Role)) {
        throw new ValidationError(`role must be one of: ${validRoles.join(', ')}`);
      }
      
      // Requirement 9.5, 9.6: Create invitation with email, role (default RECRUITER), and domainId
      const invitation = await prisma.invitation.create({
        data: {
          email: email.toLowerCase().trim(),
          role: role as Role,
          domainId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          domainId: true,
          createdAt: true,
        },
      });
      
      return Response.json({ invitation });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
