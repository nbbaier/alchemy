export function topoSort(dependencies: Record<string, string[]>): string[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: string[] = [];

  function visit(file: string) {
    if (temp.has(file)) {
      throw new Error(`Circular dependency detected involving ${file}`);
    }
    if (visited.has(file)) {
      return;
    }

    temp.add(file);

    const deps = dependencies[file] || [];
    for (const dep of deps) {
      visit(dep);
    }

    temp.delete(file);
    visited.add(file);
    order.push(file);
  }

  const files = Object.keys(dependencies);
  for (const file of files) {
    if (!visited.has(file)) {
      visit(file);
    }
  }

  return order;
}
