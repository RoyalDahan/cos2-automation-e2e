/**
 * Canonical test data references.
 *
 * Specs must never hardcode an SSN or document ID inline. They reference these
 * constants, so when the QA database is reseeded only this file changes.
 *
 * SOURCE: the five educators currently seeded in the DEV environment, read off
 * /search?type=credentials. Real data has not been imported yet; when it is, only
 * this file should need to change.
 *
 * PII RULE: no production educator data is permitted in this repository, ever. These
 * SSNs are the synthetic dev-seed values (123-45-6789 and the 2xx/3xx/4xx-45-5678
 * series) and are not issuable by the SSA.
 */

/** Every educator the DEV environment currently holds. A search for "a" returns all five. */
export const ROSTER = {
  tamayoTorres: {
    lastName: 'TAMAYO TORRES',
    firstName: 'LEONARDO',
    displayName: 'TAMAYO TORRES, LEONARDO',
    ssn: '123456789',
    formattedSsn: '123-45-6789',
    seid: '1234567890',
    birthDate: '11/21/1971',
  },
  jones: {
    lastName: 'JONES',
    firstName: 'MARY',
    displayName: 'JONES, MARY',
    ssn: '123455678',
    formattedSsn: '123-45-5678',
    // NOTE: identical to tamayoTorres. Two educators sharing one SEID looks like a
    // seed-data defect - SEID is meant to be the unique educator key.
    seid: '1234567890',
    birthDate: '11/21/1971',
  },
  darkel: {
    lastName: 'DARKEL',
    firstName: 'NATALIE',
    displayName: 'DARKEL, NATALIE',
    ssn: '223455678',
    formattedSsn: '223-45-5678',
    seid: '2234567890',
    birthDate: '04/08/1920',
  },
  jarkin: {
    lastName: 'JARKIN',
    firstName: 'LUCAS',
    displayName: 'JARKIN, LUCAS',
    ssn: '323455678',
    formattedSsn: '323-45-5678',
    seid: '3234567890',
    birthDate: '05/28/1982',
  },
  marquez: {
    lastName: 'MARQUEZ',
    firstName: 'JANIS',
    displayName: 'MARQUEZ, JANIS',
    ssn: '423455678',
    formattedSsn: '423-45-5678',
    /** Rendered blank in the grid - this educator genuinely has no SEID on DEV. */
    seid: '',
    birthDate: '03/26/2001',
  },
} as const;

/** Total educators on DEV, asserted by the "N Educators Found" count. */
export const ROSTER_SIZE = 5;

/**
 * Role-shaped aliases the specs reference by intent rather than by name.
 *
 * These are provisional. DEV exposes only identity columns (Name / SSN / SEID / Birth
 * Date), so nothing here is backed by a real status, district or credential yet - those
 * attributes are reinstated once real data lands.
 */
export const EDUCATORS = {
  /** Unique SSN and SEID: the safe subject for single-result identity lookups. */
  activeMultiCredential: ROSTER.darkel,
  /** A second distinct educator, for tests that need two unrelated subjects. */
  suspended: ROSTER.jarkin,
  /** Has no SEID on DEV - drives the missing-identifier cases. */
  noSeid: ROSTER.marquez,
  /** Shares SEID 1234567890 with `seidTwin` - drives the duplicate-identifier cases. */
  duplicateHolder: ROSTER.tamayoTorres,
  seidTwin: ROSTER.jones,
  /** Only the SEID is real; the Sub-708 date lives in NOT_ON_DEV. */
  retiredReturnToWork: ROSTER.jarkin,
} as const;

/**
 * Attributes the DEV environment does not expose yet.
 *
 * The educator grid renders Name / SSN / SEID / Birth Date only - there is no status, no
 * credential documents and no retired educator. These placeholders exist so the specs that
 * cover those features still compile; every one of them is skipped against live until the
 * feature and its data land. Do not treat these as real values.
 */
export const NOT_ON_DEV = {
  status: 'Active',
  sub708Date: '09/01/2024',
} as const;

export const DOCUMENTS = {
  currentCertificate: '250000123',
  archivedReplaced: '160000456',
  suspendedRestricted: '230000789',
  temporaryCountyCertificate: '240000321',
  /** Same id lives on two educators on purpose - drives the duplicate document report tests. */
  duplicated: '250000123',
  nonExistent: '999999999',
} as const;

export const LOOKUPS = {
  title: { code: 'MSCR', description: 'Multiple Subject Teaching Credential' },
  term: { code: '5Y', description: 'Five Years' },
  district: { code: '19000', description: 'Los Angeles Unified' },
} as const;

/** Field limits taken straight from the DB2 column definitions in the COS Data page. */
export const FIELD_LIMITS = {
  seidDigits: 10,
  documentIdDigits: 9,
  ssnDigits: 9,
  commentsMaxChars: 200,
  remarkTextMaxChars: 200,
  lastNameMaxChars: 26,
  firstNameMaxChars: 20,
} as const;

/** Values the Document Status dropdown must offer, per the Update Credential spec. */
export const DOCUMENT_STATUSES = ['', 'TAC', 'TCC', 'Certificate', 'SLMS', 'Revoked', 'Self-Revoked', 'Suspended'] as const;

/** Credential action types supplied by CTC. */
export const CREDENTIAL_TYPES = [
  'RENEWAL', '', 'AA', 'AR', 'AU', 'CO', 'CV', 'DP', 'EX', 'FT',
  'NC', 'NT', 'RA', 'RI', 'RN', 'RP', 'RS', 'SR', 'UN',
] as const;
