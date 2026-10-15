import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { signSessionToken, verifySessionToken } from '../src/lib/auth/session';

describe('Authentication & Session Management', () => {
  it('should sign and verify valid session payload', () => {
    const payload = {
      userId: 'usr_123',
      organizationId: 'org_abc',
      role: 'SALES_MEMBER' as const,
    };

    const token = signSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.organizationId).toBe(payload.organizationId);
    expect(decoded?.role).toBe('SALES_MEMBER');
  });

  it('should return null for forged or corrupted token', () => {
    const invalidToken = 'eyAiYWxnIjogIkhTMjU2IiB9.corrupted.signature';
    const decoded = verifySessionToken(invalidToken);
    expect(decoded).toBeNull();
  });

  it('should verify password hash correctly', async () => {
    const password = 'Password123!';
    const hash = await bcrypt.hash(password, 10);

    const matches = await bcrypt.compare(password, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });
});
