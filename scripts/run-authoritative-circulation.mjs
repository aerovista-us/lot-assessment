#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateAuthoritativeCirculation } from "../packages/circulation/authoritative-search.ts";
import { getPondyCandidate } from "../projects/pondy-lot2/candidate-registry.ts";

const args = process.argv.slice(2);
const candidateId = args.find((value) => !value.startsWith("--")) ?? "pondy-d4";
const requirePass = args.includes("--require-pass");
const maxArg = args.find((value) => value.startsWith("--max-expanded="));
const maxExpandedStates = maxArg ? Number(maxArg.split("=")[1]) : 180000;
if (!Number.isInteger(maxExpandedStates) || maxExpandedStates < 1) throw new Error("--max-expanded must be a positive integer");
const candidate = getPondyCandidate(candidateId);
if (!candidate) throw new Error(`Unknown Pondy candidate: ${candidateId}`);

const result = evaluateAuthoritativeCirculation(candidate, { maxExpandedStates });
const outDir = path.join("qa-artifacts", "authoritative-circulation");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${candidateId}.json`);
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ candidateId, artifact: outPath, summary: result.summary, hardGeometryPass: result.pass, policyReady: result.policyReady }, null, 2));
if (requirePass && !result.pass) {
  console.error(`Authoritative circulation hard gate remains open for ${candidateId}.`);
  process.exitCode = 2;
}
