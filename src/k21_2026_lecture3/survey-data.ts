import { readFile } from 'node:fs/promises';

export type SurveyRow = {
  attendanceType: string;
  experienceLevel: string;
  handsOnCompleted: boolean;
  hardestTopic: string;
  prepMinutes: number;
  request: string;
  satisfaction: number;
  studentId: string;
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
      studentId,
      attendanceType,
      experienceLevel,
      satisfaction,
      hardestTopic,
      handsOnCompleted,
      prepMinutes,
      request,
    ] = line.split(',');
    return {
      attendanceType: attendanceType ?? '',
      experienceLevel: experienceLevel ?? '',
      handsOnCompleted: handsOnCompleted === '完了',
      hardestTopic: hardestTopic ?? '',
      prepMinutes: Number(prepMinutes ?? 0),
      request: request ?? '',
      satisfaction: Number(satisfaction ?? 0),
      studentId: studentId ?? '',
    };
  });
}
