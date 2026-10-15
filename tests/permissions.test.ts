import { describe, it, expect } from 'vitest';
import { assertLeadAccess, AuthorizationError, UserSession } from '../src/lib/auth/guard';

describe('Role-Based Access Control (RBAC) & Boundary Isolation', () => {
  const orgA = 'org_alpha';
  const orgB = 'org_beta';

  const adminSession: UserSession = {
    user: { id: 'usr_admin', displayName: 'Admin' },
    organization: { id: orgA },
    role: 'ADMIN',
  };

  const managerSession: UserSession = {
    user: { id: 'usr_manager', displayName: 'Manager' },
    organization: { id: orgA },
    role: 'MANAGER',
  };

  const salesSession1: UserSession = {
    user: { id: 'usr_sales_1', displayName: 'Sales Rep 1' },
    organization: { id: orgA },
    role: 'SALES_MEMBER',
  };

  const salesSession2: UserSession = {
    user: { id: 'usr_sales_2', displayName: 'Sales Rep 2' },
    organization: { id: orgA },
    role: 'SALES_MEMBER',
  };

  const leadOwnedBySales1 = {
    id: 'lead_1',
    organizationId: orgA,
    ownerId: 'usr_sales_1',
    businessName: 'Naksh Interio',
  };

  const leadInOtherOrg = {
    id: 'lead_2',
    organizationId: orgB,
    ownerId: 'usr_sales_1',
    businessName: 'Foreign Business',
  };

  it('allows Sales Member to access their own assigned lead', () => {
    expect(() => assertLeadAccess(leadOwnedBySales1, salesSession1)).not.toThrow();
  });

  it('strictly blocks Sales Member 2 from accessing lead assigned to Sales Member 1', () => {
    expect(() => assertLeadAccess(leadOwnedBySales1, salesSession2)).toThrowError(
      'Sales representatives may only access leads assigned to them'
    );
  });

  it('allows Admin and Manager to access any lead within their organization', () => {
    expect(() => assertLeadAccess(leadOwnedBySales1, adminSession)).not.toThrow();
    expect(() => assertLeadAccess(leadOwnedBySales1, managerSession)).not.toThrow();
  });

  it('strictly blocks cross-organization access even for Admins', () => {
    expect(() => assertLeadAccess(leadInOtherOrg, adminSession)).toThrowError(
      'Cross-organization access prohibited'
    );
  });
});
