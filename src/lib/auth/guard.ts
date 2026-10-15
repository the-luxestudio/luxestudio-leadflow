import { getCurrentSession } from './session';

export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES_MEMBER';

export interface UserSession {
  user: {
    id: string;
    email?: string;
    displayName?: string;
    status?: string;
    telegramChatId?: string | null;
    telegramUsername?: string | null;
  };
  organization: {
    id: string;
    name?: string;
    timezone?: string;
    currency?: string;
  };
  role: UserRole;
}

export class AuthorizationError extends Error {
  status: number;
  constructor(message = 'Unauthorized or Forbidden') {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}

export class AuthenticationError extends Error {
  status: number;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

export async function requireAuth() {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthenticationError();
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new AuthorizationError(`Access restricted to roles: ${allowedRoles.join(', ')}`);
  }
  return session;
}

export function assertLeadAccess(
  lead: { organizationId: string; ownerId?: string | null },
  session: UserSession
) {
  if (lead.organizationId !== session.organization.id) {
    throw new AuthorizationError('Cross-organization access prohibited');
  }

  if (session.role === 'SALES_MEMBER' && lead.ownerId !== session.user.id) {
    throw new AuthorizationError('Sales representatives may only access leads assigned to them');
  }

  return true;
}

export function getLeadFilterForSession(session: UserSession) {
  const baseFilter: {
    organizationId: string;
    ownerId?: string;
    archivedAt: null;
  } = {
    organizationId: session.organization.id,
    archivedAt: null,
  };

  if (session.role === 'SALES_MEMBER') {
    baseFilter.ownerId = session.user.id;
  }

  return baseFilter;
}
