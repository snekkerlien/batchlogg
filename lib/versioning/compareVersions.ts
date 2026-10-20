type ParsedVersion = {
  core: number[];
  prerelease: string[] | null;
};

function parseVersion(version: string): ParsedVersion | null {
  const withoutBuild = version.trim().split("+", 1)[0].replace(/^v/i, "");
  const match = withoutBuild.match(
    /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
  );
  if (!match) return null;

  const core = match[1].split(".").map(Number);
  if (!core.every(Number.isSafeInteger)) return null;

  return {
    core,
    prerelease: match[2]?.split(".") ?? null,
  };
}

function compareParsedVersions(left: ParsedVersion, right: ParsedVersion): number {
  const coreLength = Math.max(left.core.length, right.core.length);
  for (let index = 0; index < coreLength; index += 1) {
    const difference = (left.core[index] ?? 0) - (right.core[index] ?? 0);
    if (difference !== 0) return difference;
  }

  if (left.prerelease === null) return right.prerelease === null ? 0 : 1;
  if (right.prerelease === null) return -1;

  const prereleaseLength = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < prereleaseLength; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;

    const leftIsNumeric = /^\d+$/.test(leftIdentifier);
    const rightIsNumeric = /^\d+$/.test(rightIdentifier);
    if (leftIsNumeric && rightIsNumeric) {
      return Number(leftIdentifier) - Number(rightIdentifier);
    }
    if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
    return leftIdentifier.localeCompare(rightIdentifier, undefined, {
      sensitivity: "base",
    });
  }

  return 0;
}

export function compareVersionsDescending(left: string, right: string): number {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  if (parsedLeft && parsedRight) {
    return -compareParsedVersions(parsedLeft, parsedRight);
  }

  return right.localeCompare(left, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
