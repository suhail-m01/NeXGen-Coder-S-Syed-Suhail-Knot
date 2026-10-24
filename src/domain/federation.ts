import { parseInstantText } from './parser';
import { sourceCanIngest } from './sources';
import type { ExtractionDraft, SourceRecord, Submission } from './types';

export interface FederatedEventRecord {
  externalId?: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  originalUrl: string;
  registrationUrl?: string;
  venueName?: string;
  locality?: string;
  mode?: 'in_person' | 'online' | 'hybrid';
}

export function parseFederatedFeed(raw: string, maxRecords = 50): FederatedEventRecord[] {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Import a valid JSON array of event records.'); }
  if (!Array.isArray(value)) throw new Error('The federated feed must be a JSON array.');
  if (!value.length || value.length > maxRecords) throw new Error(`Import between 1 and ${maxRecords} records at a time.`);
  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Record ${index + 1} is not an object.`);
    const record = candidate as Record<string, unknown>;
    if (typeof record.title !== 'string' || record.title.trim().length < 3) throw new Error(`Record ${index + 1} needs a title.`);
    if (typeof record.startAt !== 'string' || !Number.isFinite(new Date(record.startAt).getTime())) throw new Error(`Record ${index + 1} needs a valid startAt value.`);
    if (record.endAt !== undefined && (typeof record.endAt !== 'string' || !Number.isFinite(new Date(record.endAt).getTime()))) throw new Error(`Record ${index + 1} has an invalid endAt value.`);
    for (const key of ['originalUrl', 'registrationUrl'] as const) {
      const url = record[key];
      if (key === 'originalUrl' || url !== undefined) {
        if (typeof url !== 'string' || !/^https?:\/\/\S+$/i.test(url)) throw new Error(`Record ${index + 1} needs a valid ${key}.`);
      }
    }
    return record as unknown as FederatedEventRecord;
  });
}

function field<T>(value: T, evidence: string): { value: T; confidence: 'high'; evidence: string } {
  return { value, confidence: 'high', evidence };
}

export function submissionsFromFederatedFeed(
  records: FederatedEventRecord[],
  source: SourceRecord,
  submitterId: string,
  now = new Date().toISOString(),
  makeSubmissionId: () => string,
): Submission[] {
  return records.map((record) => {
    const rawText = JSON.stringify(record, null, 2);
    const base = parseInstantText(`Title: ${record.title}\nStart: ${record.startAt}\nRegistration: ${record.registrationUrl ?? record.originalUrl}\n${record.description ?? ''}`);
    const evidence = `Reviewed ${source.name} JSON feed field`;
    const draft: ExtractionDraft = {
      ...base,
      title: field(record.title.trim(), evidence),
      startDatetime: field(new Date(record.startAt).toISOString(), evidence),
      endDatetime: field(record.endAt ? new Date(record.endAt).toISOString() : null, evidence),
      summary: field((record.description ?? '').trim(), evidence),
      registrationUrl: field(record.registrationUrl ?? record.originalUrl, evidence),
      venueName: field(record.venueName?.trim() || null, evidence),
      mode: field(record.mode ?? null, evidence),
      addressOrLocality: field(record.locality?.trim() || null, evidence),
    };
    return {
      id: makeSubmissionId(), submitterId, inputType: 'url', rawText,
      status: 'pending_review', draft, canonicalEventId: null, review: null, createdAt: now,
    };
  });
}

export function assertFederatedImportPermission(source: SourceRecord) {
  const method = source.kind === 'open_web' ? 'open_web' : 'api';
  if (!sourceCanIngest(source, method)) throw new Error(`${source.name} is not active with evidence and an approved ${method.replaceAll('_', ' ')} method.`);
  return method;
}
