import type { IngestionMethod, SourceRecord } from './types';

export function buildInitialSources(now = new Date()): SourceRecord[] {
  const updatedAt = now.toISOString();
  return [
    {
      id: 'source-knot-native', name: 'Knot native', kind: 'native', baseUrl: null,
      permission: 'owned', approvedMethods: ['native', 'manual'], active: true, evidenceUrl: null,
      notes: 'Organizer-published and human-reviewed Knot records.', lastReviewedAt: updatedAt, updatedBy: null, updatedAt,
    },
    {
      id: 'source-community-submissions', name: 'Community submissions', kind: 'community', baseUrl: null,
      permission: 'approved', approvedMethods: ['manual'], active: true, evidenceUrl: null,
      notes: 'User-provided text only. No private-chat ingestion or social-account access.', lastReviewedAt: updatedAt, updatedBy: null, updatedAt,
    },
    {
      id: 'source-sample-catalog', name: 'Sample external catalog', kind: 'sample', baseUrl: 'https://example.com',
      permission: 'sample_only', approvedMethods: [], active: false, evidenceUrl: null,
      notes: 'Labelled product fixtures. Never treated as real platform coverage.', lastReviewedAt: updatedAt, updatedBy: null, updatedAt,
    },
    ...(['Unstop', 'Devfolio', 'Devpost'] as const).map((name): SourceRecord => ({
      id: `source-${name.toLowerCase()}`, name, kind: 'platform', baseUrl: `https://${name.toLowerCase()}.com`,
      permission: 'review_required', approvedMethods: [], active: false, evidenceUrl: null,
      notes: 'No live connector. Official API, written permission or current terms review is required before activation.',
      lastReviewedAt: null, updatedBy: null, updatedAt,
    })),
    {
      id: 'source-open-web', name: 'Open web', kind: 'open_web', baseUrl: null,
      permission: 'review_required', approvedMethods: [], active: false, evidenceUrl: null,
      notes: 'No crawler is active. Source-by-source permission, robots, terms and collection-method review is required.',
      lastReviewedAt: null, updatedBy: null, updatedAt,
    },
  ];
}

export function sourceCanIngest(source: SourceRecord, method: IngestionMethod) {
  if (!source.active || !source.approvedMethods.includes(method)) return false;
  if (source.permission === 'owned') return true;
  if (source.permission !== 'approved') return false;
  if ((source.kind === 'platform' || source.kind === 'open_web') && !source.evidenceUrl) return false;
  return true;
}

export const sourcePermissionLabel = (permission: SourceRecord['permission']) => ({
  owned: 'Owned by Knot', sample_only: 'Sample only', review_required: 'Review required',
  approved: 'Approved', blocked: 'Blocked',
})[permission];
