import { readFileSync } from 'node:fs';

export function summarizeSurvey(csvText) {
  const rows = csvText.trim().split('\n').slice(1);
  const total = rows.reduce((sum, row) => sum + Number(row.split(',')[1]), 0);
  return { averageSatisfaction: total };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(summarizeSurvey(readFileSync(new URL('../survey.csv', import.meta.url), 'utf8'))));
}
