import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError } from '@/lib/errors';
import Groq from 'groq-sdk';
import { env } from '@/lib/env';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user, domainId) => {
      // Get the current user's skills
      if (!user.skills || user.skills.length === 0) {
        throw new ValidationError('You need to add skills to your profile before matching.');
      }

      // Fetch all available jobs (if candidate, all jobs; if domainId, mostly domain jobs depending on what they can see)
      const jobs = await prisma.job.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
        },
        take: 50, // Keep limit to not exceed context window
      });

      if (jobs.length === 0) {
        return Response.json({ matches: [] });
      }

      const prompt = `
You are an expert AI recruiter matching a candidate's skills against a list of open job postings.
Candidate Skills: ${user.skills.join(', ')}

Available Jobs:
${jobs.map(j => `ID: ${j.id}\nTitle: ${j.title}\nSkills Required: ${j.requiredSkills.join(', ')}`).join('\n\n')}

Analyze all the available jobs and return the top 5 most relevant jobs for this candidate based on their skills.
Your response MUST be ONLY a raw JSON array of objects with the following schema:
[
  {
    "jobId": "...",
    "score": 85,
    "reasoning": "Quick explanation"
  }
]
Do not wrap it in markdown block quotes. Respond strictly with the JSON array.
      `.trim();

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are a strict JSON-only API. Only return raw JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-8b-instant', // Defaulting to this fast/mini model
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content || '[]';
      
      let matchedData = [];
      try {
        const cleanedContent = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
        matchedData = JSON.parse(cleanedContent);
      } catch (e) {
        throw new Error('Failed to parse AI response. Response was: ' + responseContent);
      }

      // Map back to full job data
      const results = matchedData.map((match: any) => ({
        ...match,
        job: jobs.find(j => j.id === match.jobId),
      })).filter((m: any) => m.job != null); // Ensure the job actually exists

      return Response.json({ matches: results });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
