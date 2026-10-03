import { runPondyRankedSearch } from "../packages/pondy-search/index.ts";

const result = runPondyRankedSearch("full");
process.stdout.write(`${JSON.stringify(result)}\n`);
