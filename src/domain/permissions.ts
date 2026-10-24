import type { UserAccount } from './types';

/** Local workspaces bootstrap their first eligible adult as owner. Production must replace this with server-assigned roles. */
export function isWorkspaceAdmin(user: UserAccount | null | undefined) {
  return Boolean(user && (user.role === 'admin' || user.workspaceAdmin === true));
}

export function canReviewSubmissions(user: UserAccount | null | undefined) {
  return isWorkspaceAdmin(user) && user?.ageBand === '18_plus';
}

export function canManageSources(user: UserAccount | null | undefined) {
  return canReviewSubmissions(user);
}
