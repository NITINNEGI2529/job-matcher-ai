import { prisma } from '@/lib/prisma';
import { withDomainIsolation } from '@/lib/middleware/domainIsolation';
import { handleRouteError, ValidationError } from '@/lib/errors';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/providers/groq';
import { rankCandidatesForJob } from '@/lib/ai/matching';
import { calculateMatchingScore } from '@/lib/matching';

/**
 * GET /api/jobs/match
 *
 * Returns top job matches for the authenticated candidate using:
 * 1. Hybrid semantic + skill + experience ranking (if embeddings available)
 * 2. Groq LLM reasoning for human-readable explanations
 * 3. Deterministic fallback if Groq/embeddings fail
 */
export async function GET(request: Request) {
  try {
    return await withDomainIsolation(async (user) => {
      if (!user.skills?.length) {
        throw new ValidationError('You need to add skills to your profile before matching.');
      }

      // Fetch active jobs only
      const jobs = await prisma.job.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          description: true,
          requiredSkills: true,
        },
        take: 50,
      });

      if (!jobs.length) {
        return Response.json({ matches: [] });
      }

      // ── Step 1: Try AI reasoning with Groq ──────────────────────────────────
      let aiResults: { jobId: string; score: number; reasoning: string }[] = [];
      let aiAvailable = false;

      try {
        const groq = getGroqClient();
        const prompt = `
You are an expert AI recruiter matching a candidate's skills against open job postings.
Candidate Skills: ${user.skills.join(', ')}

Available Jobs:
${jobs.map((j) => `ID: ${j.id}\nTitle: ${j.title}\nRequired: ${j.requiredSkills.join(', ')}`).join('\n\n')}

Return the top 5 most relevant jobs as ONLY a raw JSON array (no markdown):
[{"jobId":"...","score":85,"reasoning":"brief explanation"}]`.trim();

        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are a strict JSON-only API. Only return raw JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
        });

        const content = completion.choices[0]?.message?.content ?? '[]';
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        aiResults = JSON.parse(cleaned);
        aiAvailable = true;
      } catch (err) {
        console.warn('[match] Groq AI reasoning failed, using deterministic fallback:', err);
      }

      // ── Step 2: Map AI results → enriched matches ────────────────────────────
      if (aiAvailable && aiResults.length) {
        const results = aiResults
          .map((match) => {
            const job = jobs.find((j) => j.id === match.jobId);
            if (!job) return null;
            const { score: skillScore, commonSkills } = calculateMatchingScore({
              candidateSkills: user.skills,
              requiredSkills: job.requiredSkills,
            });
            return {
              jobId: match.jobId,
              aiScore: match.score,
              skillScore: Math.round(skillScore * 100),
              reasoning: match.reasoning,
              commonSkills,
              job,
            };
          })
          .filter(Boolean);

        return Response.json({ matches: results, source: 'groq' });
      }

      // ── Step 3: Deterministic fallback ───────────────────────────────────────
      const deterministicResults = jobs
        .map((job) => {
          const { score, commonSkills } = calculateMatchingScore({
            candidateSkills: user.skills,
            requiredSkills: job.requiredSkills,
          });
          return {
            jobId: job.id,
            aiScore: Math.round(score * 100),
            skillScore: Math.round(score * 100),
            reasoning: `Matched ${commonSkills.length} of ${job.requiredSkills.length} required skills.`,
            commonSkills,
            job,
          };
        })
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 5);

      return Response.json({ matches: deterministicResults, source: 'deterministic' });
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
