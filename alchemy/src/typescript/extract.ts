/**
 * Extracts TypeScript code from a markdown code block
 * @param text Response text that may contain markdown
 * @returns The TypeScript code if found, undefined otherwise
 */
export function extractTypeScriptCode(text: string): string | undefined {
  const matches = text.match(
    /```(?:ts|js|typescript|javascript)\n([\s\S]*?)```/,
  );
  return matches?.[1]?.trim();
}
