export interface MatchingInput {
  candidateSkills: string[];
  requiredSkills: string[];
}

export interface MatchingResult {
  score: number;
  commonSkills: string[];
  missingSkills: string[];
  totalRequired: number;
}

export function calculateMatchingScore(input: MatchingInput): MatchingResult {
  const { candidateSkills, requiredSkills } = input;
  
  // Normalize skills to lowercase for case-insensitive comparison
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());
  
  // Handle edge case: no required skills
  if (normalizedRequiredSkills.length === 0) {
    return {
      score: 0,
      commonSkills: [],
      missingSkills: [],
      totalRequired: 0,
    };
  }
  
  // Find common skills
  const commonSkills = normalizedRequiredSkills.filter(skill =>
    normalizedCandidateSkills.includes(skill)
  );
  
  // Find missing skills
  const missingSkills = normalizedRequiredSkills.filter(skill =>
    !normalizedCandidateSkills.includes(skill)
  );
  
  // Calculate score as percentage
  const score = (commonSkills.length / normalizedRequiredSkills.length) * 100;
  
  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    commonSkills,
    missingSkills,
    totalRequired: normalizedRequiredSkills.length,
  };
}
