import { readFile } from 'node:fs/promises';

export type SurveyRow = {
  attendanceType: string;
  experienceLevel: string;
  handsOnCompleted: boolean;
  hardestTopic: string;
  prepMinutes: number;
  participantId: string;
  request: string;
  satisfaction: number;
};

export type SurveyStats = {
  averageSatisfaction: number;
  handsOnCompletionRate: number;
  hardestTopics: string[];
  respondentCount: number;
};

export async function readSurveyCsv() {
  return await readFile(new URL('./survey.csv', import.meta.url), 'utf8');
}

export async function readSurveyRows() {
  return parseSurveyRows(await readSurveyCsv());
}

export function parseSurveyRows(csv: string): SurveyRow[] {
  const [, ...lines] = csv.trim().split('\n');
  return lines.map((line) => {
    const [
      participantId,
      attendanceType,
      experienceLevel,
      satisfaction,
      hardestTopic,
      handsOnCompleted,
      prepMinutes,
      request,
    ] = parseCsvLine(line);
    return {
      attendanceType: attendanceType ?? '',
      experienceLevel: experienceLevel ?? '',
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic: hardestTopic ?? '',
      participantId: participantId ?? '',
      prepMinutes: Number(prepMinutes ?? 0),
      request: request ?? '',
      satisfaction: Number(satisfaction ?? 0),
    };
  });
}

export function computeSurveyStats(rows: SurveyRow[]): SurveyStats {
  const topicCounts = new Map<string, number>();
  for (const row of rows) {
    topicCounts.set(row.hardestTopic, (topicCounts.get(row.hardestTopic) ?? 0) + 1);
  }
  const maxTopicCount = Math.max(...topicCounts.values());
  return {
    averageSatisfaction: rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length,
    handsOnCompletionRate: rows.filter((row) => row.handsOnCompleted).length / rows.length,
    hardestTopics: [...topicCounts.entries()].filter(([, count]) => count === maxTopicCount).map(([topic]) => topic),
    respondentCount: rows.length,
  };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && quoted && nextChar === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }
    currentValue += char;
  }
  values.push(currentValue);
  return values;
}
