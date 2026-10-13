export const SoftSkillType = {
  COMMUNICATION: 'communication',
  TIME_MANAGEMENT: 'time_management',
  FLEXIBILITY_ADAPTABILITY: 'flexibility_adaptability',
  TEAMWORK_COLLABORATION: 'teamwork_collaboration',
  ANALYTIC_CRITICAL_THINKING: 'analytic_critical_thinking',
  DECISION_MAKING: 'decision_making',
  CREATIVITY: 'creativity',
  COMPLEX_PROBLEM_SOLVING: 'complex_problem_solving',
  CURIOSITY_LIFELONG_LEARNING: 'curiosity_lifelong_learning',
  NEGOTIATION_PERSUASION: 'negotiation_persuasion',
  LEADERSHIP: 'leadership',
  POSITIVE_ATTITUDE: 'positive_attitude',
} as const;

export type SoftSkillType = (typeof SoftSkillType)[keyof typeof SoftSkillType];
