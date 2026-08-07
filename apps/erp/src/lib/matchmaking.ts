export interface MatchmakingResult {
  score: number; // 0 to 100
  label: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  matches: string[];
  gaps: string[];
}

export function calculateFreelancerMatch(args: {
  projectServiceType: "IA" | "Trafego" | "Sites" | string;
  freelancerSkills: string[];
  availabilityHours?: number;
  hasPortfolio?: boolean;
  proposedRate?: number;
  projectBudget?: number;
}): MatchmakingResult {
  let score = 50;
  const matches: string[] = [];
  const gaps: string[] = [];

  const skillsUpper = (args.freelancerSkills || []).map((s) => s.toUpperCase());
  const typeUpper = (args.projectServiceType || "").toUpperCase();

  // Primary Skill Alignment (Up to +35%)
  if (skillsUpper.includes(typeUpper)) {
    score += 35;
    matches.push(`Habilidade principal alinhada (${args.projectServiceType})`);
  } else {
    gaps.push(`Falta especialidade em ${args.projectServiceType}`);
  }

  // Multi-skilled Bonus (+10%)
  if (skillsUpper.length > 1) {
    score += 10;
    matches.push("Perfil multidisciplinar");
  }

  // Portfolio Check (+15%)
  if (args.hasPortfolio) {
    score += 15;
    matches.push("Portfólio comprovado fornecido");
  } else {
    gaps.push("Sem link de portfólio");
  }

  // Availability Check (+10% for >= 20h/week)
  if (args.availabilityHours && args.availabilityHours >= 20) {
    score += 10;
    matches.push(`Alta disponibilidade (${args.availabilityHours}h/semana)`);
  } else if (args.availabilityHours) {
    score += 5;
    matches.push(`Disponibilidade parcial (${args.availabilityHours}h/semana)`);
  }

  // Budget Compatibility (+15%)
  if (args.proposedRate && args.projectBudget) {
    if (args.proposedRate <= args.projectBudget * 0.6) {
      score += 15;
      matches.push("Pretensão financeira dentro do orçamento");
    } else {
      gaps.push("Pretensão financeira próxima do limite do orçamento");
    }
  }

  score = Math.min(100, Math.max(0, score));

  let label = "Compatibilidade Moderada";
  let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "secondary";

  if (score >= 85) {
    label = "Altamente Indicado";
    badgeVariant = "default";
  } else if (score >= 70) {
    label = "Boa Compatibilidade";
    badgeVariant = "secondary";
  } else if (score < 50) {
    label = "Baixa Compatibilidade";
    badgeVariant = "destructive";
  }

  return {
    score,
    label,
    badgeVariant,
    matches,
    gaps,
  };
}
