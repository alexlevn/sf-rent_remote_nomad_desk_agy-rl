import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPassword, verifyPassword } from './password';
import { requireUser, requireHost, requireAdmin, AuthError } from './guards';
import { switchRole, resetSession, setCurrentUserId } from './session';
import { db } from '@/lib/db/client';
import { users, hostProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Auth Guards & Password Security Suite', () => {
  beforeEach(async () => {
    resetSession();
  });

  afterEach(async () => {
    resetSession();
  });

  describe('Password Hashing & Verification', () => {
    it('hashes passwords with bcrypt and verifies correctly', async () => {
      const plaintext = 'SuperSecret123!';
      const hash = await hashPassword(plaintext);

      expect(hash).toBeDefined();
      expect(hash.startsWith('$2')).toBe(true);

      const isMatch = await verifyPassword(plaintext, hash);
      expect(isMatch).toBe(true);

      const isWrong = await verifyPassword('WrongPassword', hash);
      expect(isWrong).toBe(false);
    });

    it('returns false for empty password or hash', async () => {
      expect(await verifyPassword('', '$2a$10$abcdef')).toBe(false);
      expect(await verifyPassword('demo1234', '')).toBe(false);
    });
  });

  describe('requireUser Guard', () => {
    it('returns active authenticated user successfully', async () => {
      await switchRole('guest');
      const user = await requireUser();

      expect(user).toBeDefined();
      expect(user.email).toBe('demo@example.com');
      expect(user.isActive).toBe(true);
    });

    it('throws 401 when account is suspended / inactive in DB', async () => {
      // Temporarily mark user 1 as inactive
      await db.update(users).set({ isActive: false }).where(eq(users.id, 1));

      try {
        await setCurrentUserId(1);
        await expect(requireUser()).rejects.toThrow(AuthError);
      } finally {
        // Restore user 1 active status
        await db.update(users).set({ isActive: true }).where(eq(users.id, 1));
      }
    });
  });

  describe('requireHost Guard', () => {
    it('throws 403 when user has guest role', async () => {
      await switchRole('guest');
      await expect(requireHost()).rejects.toThrow(AuthError);
      await expect(requireHost()).rejects.toThrow(/Host role required/i);
    });

    it('succeeds for approved host and returns user + hostId', async () => {
      await switchRole('host'); // User 3: host@example.com
      const res = await requireHost();

      expect(res.user.role).toBe('host');
      expect(res.user.email).toBe('host@example.com');
      expect(res.hostId).toBe(1); // Host 1 in seed is Casa Urbana Stays
    });

    it('throws 403 when host profile status is suspended', async () => {
      // Temporarily set host 1 status to suspended
      await db.update(hostProfiles).set({ status: 'suspended' }).where(eq(hostProfiles.id, 1));

      try {
        await switchRole('host');
        await expect(requireHost()).rejects.toThrow(AuthError);
        await expect(requireHost()).rejects.toThrow(/suspended/i);
      } finally {
        // Restore host 1 status to approved
        await db.update(hostProfiles).set({ status: 'approved' }).where(eq(hostProfiles.id, 1));
      }
    });

    it('throws 403 when host profile status is pending', async () => {
      // Switch to applicant user (userId: 5, hostProfile id: 3, status: 'pending')
      // Note: applicant has role 'guest' in seed, so test with host role
      await db.update(users).set({ role: 'host' }).where(eq(users.id, 5));

      try {
        await setCurrentUserId(5);
        await expect(requireHost()).rejects.toThrow(AuthError);
        await expect(requireHost()).rejects.toThrow(/status is pending/i);
      } finally {
        await db.update(users).set({ role: 'guest' }).where(eq(users.id, 5));
      }
    });
  });

  describe('requireAdmin Guard', () => {
    it('throws 403 when user is guest', async () => {
      await switchRole('guest');
      await expect(requireAdmin()).rejects.toThrow(AuthError);
      await expect(requireAdmin()).rejects.toThrow(/Administrator role required/i);
    });

    it('throws 403 when user is host', async () => {
      await switchRole('host');
      await expect(requireAdmin()).rejects.toThrow(AuthError);
      await expect(requireAdmin()).rejects.toThrow(/Administrator role required/i);
    });

    it('succeeds for admin user', async () => {
      await switchRole('admin'); // User 2: admin@example.com
      const user = await requireAdmin();

      expect(user).toBeDefined();
      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@example.com');
    });
  });
});
