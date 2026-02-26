import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import type { User, Domain } from '@/generated/prisma';

/**
 * User type with included domain relation
 */
export type UserWithDomain = User & {
  domain: Domain | null;
};

/**
 * Higher-order function that enforces domain isolation for API handlers.
 * 
 * This middleware:
 * 1. Extracts the userId from Clerk authentication
 * 2. Fetches the user with their domain from the database
 * 3. Passes the user and domainId to the handler function
 * 
 * @param handler - The handler function that receives the authenticated user and domainId
 * @returns The result of the handler function
 * @throws {AuthenticationError} If no userId is found (user not authenticated)
 * @throws {NotFoundError} If the user is not found in the database
 * 
 * @example
 * ```typescript
 * export async function GET() {
 *   return withDomainIsolation(async (user, domainId) => {
 *     // Handler logic with authenticated user and domainId
 *     const jobs = await prisma.job.findMany({
 *       where: { domainId: domainId || undefined }
 *     });
 *     return Response.json({ jobs });
 *   });
 * }
 * ```
 */
export async function withDomainIsolation<T>(
  handler: (user: UserWithDomain, domainId: string | null) => Promise<T>
): Promise<T> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new AuthenticationError('Unauthorized');
  }
  
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { domain: true },
  });
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  return handler(user, user.domainId);
}
