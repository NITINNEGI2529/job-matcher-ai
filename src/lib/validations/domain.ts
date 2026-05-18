import { z } from 'zod';

export const domainSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domainName: z.string().min(1, 'Domain name is required').regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain name format'),
});

export type DomainInput = z.infer<typeof domainSchema>;
