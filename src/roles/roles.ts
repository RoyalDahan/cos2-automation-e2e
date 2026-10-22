/**
 * The three COS2 roles the suite exercises.
 *
 * A role is the only thing that varies between the three regression runs. Every test
 * body lives once in src/suites and is handed a Role, so a UI change is fixed in one
 * place rather than three.
 *
 * Each role signs in with its own account and therefore keeps its own browser profile.
 * Mixing them in one profile would silently run every suite as whoever logged in last,
 * which is the one failure mode that would make the whole exercise worthless.
 */

export type RoleName = 'admin' | 'update' | 'view';

export interface Role {
  readonly name: RoleName;
  /** Shown in console output and in the dashboard. */
  readonly label: string;
  /** Edge profile directory, relative to the repo root. */
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

const DEFAULT_USER = process.env.COS_ADMIN_USER ?? 'cp-dahan_david@lacoe.edu';

/**
 * Until three separate accounts exist, all three roles fall back to the same account and
 * the role is whatever COS2 currently grants it. That is a supported way to work: switch
 * the account's role in the portal, then run the matching batch file.
 *
 * The profile directories stay separate regardless, so a stale session from a previous
 * role cannot leak into the next run.
 */
export const ROLES: Record<RoleName, Role> = {
  admin: {
    name: 'admin',
    label: 'Admin (Credential Online user)',
    profileDir: '.auth/profile-admin',
    username: DEFAULT_USER,
    canAdmin: true,
    canEdit: true,
    canRevealSsn: true,
  },
  update: {
    name: 'update',
    label: 'Update user',
    profileDir: '.auth/profile-update',
    username: process.env.COS_UPDATE_USER || DEFAULT_USER,
    canAdmin: false,
    canEdit: true,
    canRevealSsn: true,
  },
  view: {
    name: 'view',
    label: 'View-only user',
    profileDir: '.auth/profile-view',
    username: process.env.COS_VIEW_USER || DEFAULT_USER,
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
