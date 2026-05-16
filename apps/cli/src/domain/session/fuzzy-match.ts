export function fuzzyMatch(query: string, target: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedTarget = target.toLowerCase();

  if (!normalizedQuery) return true;
  if (normalizedTarget.includes(normalizedQuery)) return true;

  let qi = 0;
  for (let ti = 0; ti < normalizedTarget.length && qi < normalizedQuery.length; ti++) {
    if (normalizedTarget[ti] === normalizedQuery[qi]) {
      qi++;
    }
  }
  return qi === normalizedQuery.length;
}
