/**
 * The three COS2 roles the suite exercises.
 *
 * A role is the only thing that varies between the three regression runs. Every test
 * body lives once in src/suites and is handed a Role, so a UI change is fixed in one
 * place rather than three.
 *
 * Each account keeps its own browser profile. Mixing two accounts in one profile would
 * silently run every suite as whoever logged in last, which is the one failure mode that
 * would make the whole exercise worthless.
 */

export type RoleName = 'admin' | 'update' | 'view';

export interface Role {
  readonly name: RoleName;
  /** Shown in console output and in the dashboard. */
  readonly label: string;
  /** Edge profile directory, relative to the repo root. One per account, not per role. */
  readonly profileDir: string;
  /** Sign-in account. Empty means "prompt me", which is normal before it is configured. */
  readonly username: string;
  /** May open the Admin area. */
  readonly canAdmin: boolean;
  /** May change educator or credential data. */
  readonly canEdit: boolean;
  /** May click a masked SSN to reveal the full number. Everyone else sees the last four only. */
  readonly canRevealSsn: boolean;
}

/** Your account. Every role signs in with it until per-role accounts exist. */
const DEFAULT_USER = 'cp-dahan_david@lacoe.edu';

/**
 * Profile folder for an account, e.g. .auth/profile-cp-dahan_david_lacoe.edu
 *
 * Keyed by account rather than role: roles that share an account share one browser and
 * one sign-in, and a role given its own account in .env gets its own profile, so a
 * session can never leak from one account to another.
 */
function profileDirFor(username: string): string {
  return `.auth/profile-${username.toLowerCase().replace(/[^a-z0-9._-]+/g, '_')}`;
}

const ADMIN_USER = process.env.COS_ADMIN_USER || DEFAULT_USER;
const UPDATE_USER = process.env.COS_UPDATE_USER || DEFAULT_USER;
const VIEW_USER = process.env.COS_VIEW_USER || DEFAULT_USER;

export const ROLES: Record<RoleName, Role> = {
  admin: {
    name: 'admin',
    label: 'Admin (Credential Online user)',
    profileDir: profileDirFor(ADMIN_USER),
    username: ADMIN_USER,
    canAdmin: true,
    canEdit: true,
    canRevealSsn: true,
  },
  update: {
    name: 'update',
    label: 'Update user',
    profileDir: profileDirFor(UPDATE_USER),
    username: UPDATE_USER,
    canAdmin: false,
    canEdit: true,
    canRevealSsn: true,
  },
  view: {
    name: 'view',
    label: 'View-only user',
    profileDir: profileDirFor(VIEW_USER),
    username: VIEW_USER,
    canAdmin: false,
    canEdit: false,
    canRevealSsn: false,
  },
};

export function roleByName(name: string | undefined): Role {
  const role = ROLES[(name ?? 'admin') as RoleName];
  if (!role) {
    throw new Error(`Unknown role "${name}". Expected one of: ${Object.keys(ROLES).join(', ')}.`);
  }
  return role;
}
