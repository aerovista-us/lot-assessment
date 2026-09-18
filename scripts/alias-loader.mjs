import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();

async function firstExisting(base) {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {}
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const resolved = await firstExisting(path.join(root, specifier.slice(2)));
  if (!resolved) return nextResolve(specifier, context);
  return { url: pathToFileURL(resolved).href, shortCircuit: true };
}
