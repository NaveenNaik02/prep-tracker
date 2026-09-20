import { MAX_ANSWER_DRAFTS, type AnswerVersion } from '../types';

export function capAnswerVersions(list: AnswerVersion[]): AnswerVersion[] {
  const original = list.find((v) => v.id === 'original');
  const drafts = list
    .filter((v) => v.id !== 'original')
    .slice(-MAX_ANSWER_DRAFTS);
  return original ? [original, ...drafts] : drafts;
}
