export const ACADEMY_MATH_MESSAGES = {
  dilutionVolume: {
    prompt: "academy.math.dilutionVolume.prompt",
    explanation: "academy.math.dilutionVolume.explanation",
  },
  dilutionGravity: {
    prompt: "academy.math.dilutionGravity.prompt",
    explanation: "academy.math.dilutionGravity.explanation",
  },
  scaleMalt: {
    prompt: "academy.math.scaleMalt.prompt",
    explanation: "academy.math.scaleMalt.explanation",
  },
  attenuation: {
    prompt: "academy.math.attenuation.prompt",
    explanation: "academy.math.attenuation.explanation",
  },
} as const;

export type AcademyMathTranslation = {
  family: keyof typeof ACADEMY_MATH_MESSAGES;
  values: Record<string, string | number>;
};

export function formatAcademyMathMessage(
  translation: AcademyMathTranslation,
  part: "prompt" | "explanation",
  translate: (key: string) => string
) {
  const template = translate(ACADEMY_MATH_MESSAGES[translation.family][part]);
  return template.replace(/\{([a-zA-Z]\w*)\}/g, (_, name: string) => {
    const value = translation.values[name];
    if (value === undefined) {
      throw new Error(`Missing Academy math template value: ${name}`);
    }
    return String(value);
  });
}
