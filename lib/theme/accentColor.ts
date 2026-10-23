import type { CSSProperties } from "react";

export const DEFAULT_ACCENT_COLOR = "#22c55e";

export function isAccentColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

type RGB = [number, number, number];
type AccentShade =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

export type AccessibleAccentStyle = CSSProperties & {
  [property: `--user-accent-control-opacity-${string}`]: string;
  [property: `--user-accent-control-text-${string}`]: string;
  [property: `--user-accent-muted-text-${string}`]: string;
  [property: `--user-accent-text-on-green-${string}`]: string;
  "--user-accent": string;
  "--user-accent-text": string;
};

const ACCENT_SHADES: [AccentShade, number, RGB][] = [
  ["50", 0.08, [255, 255, 255]],
  ["100", 0.16, [255, 255, 255]],
  ["200", 0.32, [255, 255, 255]],
  ["300", 0.48, [255, 255, 255]],
  ["400", 0.72, [255, 255, 255]],
  ["500", 1, [0, 0, 0]],
  ["600", 0.88, [0, 0, 0]],
  ["700", 0.72, [0, 0, 0]],
  ["800", 0.56, [0, 0, 0]],
  ["900", 0.4, [0, 0, 0]],
  ["950", 0.28, [0, 0, 0]],
];

const TRANSLUCENT_CONTROL_BACKGROUNDS: [string, AccentShade, number][] = [
  ["700-70", "700", 0.7],
  ["700-50", "700", 0.5],
  ["600-80", "600", 0.8],
  ["800-60", "800", 0.6],
  ["800-50", "800", 0.5],
];

const ACCENT_TEXT_BACKGROUNDS: [string, AccentShade, number][] = [
  ["300-5", "300", 0.05],
  ["300-10", "300", 0.1],
  ["300-15", "300", 0.15],
  ["300-20", "300", 0.2],
  ["400-10", "400", 0.1],
  ["400-15", "400", 0.15],
  ["400-20", "400", 0.2],
  ["500-10", "500", 0.1],
  ["500-20", "500", 0.2],
  ["500-30", "500", 0.3],
  ["950-20", "950", 0.2],
  ["950-30", "950", 0.3],
  ["950-40", "950", 0.4],
];

const MUTED_ACCENT_TEXT_VARIANTS: [string, AccentShade, number][] = [
  ["200-60", "200", 0.6],
  ["300-70", "300", 0.7],
  ["200-75", "200", 0.75],
];

const DARK_CONTROL_SURFACES: RGB[] = [
  [10, 10, 10],
  [24, 24, 27],
];

const GREEN_TEXT_SURFACES: RGB[] = [
  [10, 10, 10],
  [24, 24, 27],
];

const CONTRAST_TEXT_TARGETS: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
];

function parseHexColor(color: string): RGB {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function toHexColor([red, green, blue]: RGB): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixColors(color: RGB, target: RGB, amount: number): RGB {
  return [
    color[0] + (target[0] - color[0]) * amount,
    color[1] + (target[1] - color[1]) * amount,
    color[2] + (target[2] - color[2]) * amount,
  ];
}

function relativeLuminance([red, green, blue]: RGB): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

function contrastRatio(first: RGB, second: RGB): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getContrastingControlText(backgrounds: RGB[]): string {
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];
  const blackContrast = Math.min(
    ...backgrounds.map((background) => contrastRatio(black, background))
  );
  const whiteContrast = Math.min(
    ...backgrounds.map((background) => contrastRatio(white, background))
  );

  return toHexColor(blackContrast >= whiteContrast ? black : white);
}

function getMinimumContrast(textColor: string, backgrounds: RGB[]): number {
  const foreground = parseHexColor(textColor);
  return Math.min(
    ...backgrounds.map((background) => contrastRatio(foreground, background))
  );
}

function getAccentTextColor(accent: RGB): string {
  const originalText = mixColors(accent, [255, 255, 255], 0.2);
  if (
    getMinimumContrast(toHexColor(originalText), GREEN_TEXT_SURFACES) >= 4.5
  ) {
    return toHexColor(originalText);
  }

  let low = 0.2;
  let high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    const textColor = toHexColor(mixColors(accent, [255, 255, 255], middle));
    if (getMinimumContrast(textColor, GREEN_TEXT_SURFACES) >= 4.5) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return toHexColor(mixColors(accent, [255, 255, 255], high));
}

function getContrastingAccentText(
  originalText: RGB,
  backgrounds: RGB[]
): string {
  const originalColor = toHexColor(originalText);
  if (getMinimumContrast(originalColor, backgrounds) >= 4.7) {
    return originalColor;
  }

  const candidates = CONTRAST_TEXT_TARGETS.map((target) => {
    if (getMinimumContrast(toHexColor(target), backgrounds) < 4.7) {
      return null;
    }

    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const middle = (low + high) / 2;
      const candidate = toHexColor(mixColors(originalText, target, middle));
      if (getMinimumContrast(candidate, backgrounds) >= 4.7) {
        high = middle;
      } else {
        low = middle;
      }
    }

    const color = toHexColor(mixColors(originalText, target, high));
    return {
      color,
      distance: Math.max(
        Math.abs(parseHexColor(color)[0] - originalText[0]),
        Math.abs(parseHexColor(color)[1] - originalText[1]),
        Math.abs(parseHexColor(color)[2] - originalText[2])
      ),
    };
  })
    .filter(
      (candidate): candidate is { color: string; distance: number } =>
        candidate !== null
    )
    .sort((first, second) => first.distance - second.distance);

  const bestCandidate = candidates[0];
  if (!bestCandidate) {
    throw new Error("Could not find a contrasting accent text color.");
  }

  return bestCandidate.color;
}

function getContrastingMutedText(text: RGB, opacity: number): string {
  const getMinimumOpacityContrast = (foreground: RGB) =>
    Math.min(
      ...DARK_CONTROL_SURFACES.map((surface) =>
        contrastRatio(mixColors(surface, foreground, opacity), surface)
      )
    );

  const originalColor = toHexColor(text);
  if (getMinimumOpacityContrast(text) >= 4.7) {
    return `rgba(${parseHexColor(originalColor).join(", ")}, ${opacity})`;
  }

  const candidates = CONTRAST_TEXT_TARGETS.map((target) => {
    if (getMinimumOpacityContrast(target) < 4.7) {
      return null;
    }

    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const middle = (low + high) / 2;
      const candidate = mixColors(text, target, middle);
      if (getMinimumOpacityContrast(candidate) >= 4.7) {
        high = middle;
      } else {
        low = middle;
      }
    }

    const color = mixColors(text, target, high);
    return {
      color: `rgba(${color.map((channel) => Math.round(channel)).join(", ")}, ${opacity})`,
      distance: Math.max(
        Math.abs(color[0] - text[0]),
        Math.abs(color[1] - text[1]),
        Math.abs(color[2] - text[2])
      ),
    };
  })
    .filter(
      (candidate): candidate is { color: string; distance: number } =>
        candidate !== null
    )
    .sort((first, second) => first.distance - second.distance);

  const bestCandidate = candidates[0];
  if (!bestCandidate) {
    throw new Error("Could not find a contrasting muted accent text color.");
  }

  return bestCandidate.color;
}

function getTranslucentControlStyle(
  shade: RGB,
  originalOpacity: number
): { opacity: number; textColor: string } {
  for (let offset = 0; offset <= 100; offset += 1) {
    for (const opacity of [
      originalOpacity - offset / 100,
      originalOpacity + offset / 100,
    ]) {
      if (opacity < 0 || opacity > 1) {
        continue;
      }

      const backgrounds = DARK_CONTROL_SURFACES.map((surface) =>
        mixColors(surface, shade, opacity)
      );
      const textColor = getContrastingControlText(backgrounds);
      if (getMinimumContrast(textColor, backgrounds) >= 4.7) {
        return { opacity, textColor };
      }
    }
  }

  throw new Error("Could not find a contrasting translucent control style.");
}

export function getAccessibleAccentStyle(
  accentColor: string
): AccessibleAccentStyle {
  if (!isAccentColor(accentColor)) {
    throw new Error("Accent color must be a six-digit hex color.");
  }

  const color = parseHexColor(accentColor);
  const shades = new Map<AccentShade, RGB>();
  for (const [shade, accentAmount, target] of ACCENT_SHADES) {
    const background = mixColors(color, target, 1 - accentAmount);
    shades.set(shade, background);
  }

  const accentText = getAccentTextColor(color);
  const style: AccessibleAccentStyle = {
    "--user-accent": accentColor,
    "--user-accent-text": accentText,
  };

  for (const [shade] of ACCENT_SHADES) {
    const shadeColor = shades.get(shade);
    if (!shadeColor) {
      throw new Error(`Missing accent shade ${shade}.`);
    }

    style[`--user-accent-control-text-${shade}`] =
      getContrastingControlText([shadeColor]);
  }

  for (const [variant, shade, opacity] of ACCENT_TEXT_BACKGROUNDS) {
    const shadeColor = shades.get(shade);
    if (!shadeColor) {
      throw new Error(`Missing accent shade ${shade}.`);
    }

    const backgrounds = DARK_CONTROL_SURFACES.map((surface) =>
      mixColors(surface, shadeColor, opacity)
    );
    style[`--user-accent-text-on-green-${variant}`] =
      getContrastingAccentText(parseHexColor(accentText), backgrounds);
  }

  for (const [variant, shade, opacity] of MUTED_ACCENT_TEXT_VARIANTS) {
    const shadeColor = shades.get(shade);
    if (!shadeColor) {
      throw new Error(`Missing accent shade ${shade}.`);
    }

    style[`--user-accent-muted-text-${variant}`] = getContrastingMutedText(
      shadeColor,
      opacity
    );
  }

  for (const [
    variant,
    shadeName,
    originalOpacity,
  ] of TRANSLUCENT_CONTROL_BACKGROUNDS) {
    const shade = shades.get(shadeName);
    if (!shade) {
      throw new Error(`Missing accent shade ${shadeName}.`);
    }

    const controlStyle = getTranslucentControlStyle(shade, originalOpacity);
    style[`--user-accent-control-opacity-${variant}`] =
      `${Math.round(controlStyle.opacity * 100)}%`;
    style[`--user-accent-control-text-${variant}`] = controlStyle.textColor;
  }

  return style;
}

export function applyAccentColor(accentColor: string): void {
  const root = document.documentElement;
  const accentStyle = getAccessibleAccentStyle(accentColor);

  for (const [property, value] of Object.entries(accentStyle)) {
    root.style.setProperty(property, value);
  }
}
