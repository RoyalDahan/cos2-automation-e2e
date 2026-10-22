/**
 * Format validators derived from the COS2 definitions table and the DB2 column widths.
 * Used by both UI specs and API/data-integrity specs so one rule has one home.
 */

export const isSeid = (v: string): boolean => /^\d{10}$/.test(v);

/** Document / Credential ID: 9 digits, NOT unique across educators. */
export const isDocumentId = (v: string): boolean => /^\d{9}$/.test(v);

export const isSsn = (v: string): boolean => /^\d{9}$/.test(v.replace(/\D/g, ''));

export const isMaskedSsn = (v: string): boolean => /^X{3}-X{2}-\d{4}$/.test(v);

/** MM/DD/YYYY as displayed throughout COS2. */
export const isDisplayDate = (v: string): boolean => /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(v);

/** First two digits of a document id encode the issue year. */
export const documentIdYearPrefix = (docId: string): string => docId.slice(0, 2);

export const isIssueBeforeExpiration = (issue: string, expiration: string): boolean =>
  new Date(issue).getTime() <= new Date(expiration).getTime();

/** Person status is derived from the statuses of the underlying documents. */
export function derivePersonStatus(documentStatuses: string[]): 'Active' | 'Revoked' | 'Suspended' {
  if (documentStatuses.some((s) => s === 'Revoked')) return 'Revoked';
  if (documentStatuses.length > 0 && documentStatuses.every((s) => s === 'Suspended' || s === 'Self-Revoked')) return 'Suspended';
  return 'Active';
}

/** Exactly one of blank / R / P. */
export const isValidIndicator = (v: string): boolean => ['', 'R', 'P'].includes(v.trim());
