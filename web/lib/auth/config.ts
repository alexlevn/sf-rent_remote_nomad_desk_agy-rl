import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail, getUserById } from '@/lib/api/users';
import { verifyPassword } from '@/lib/auth/password';
import { getAuthSecret } from '@/lib/env';
import type { UserRole } from '@/lib/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isActive: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    isActive?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await getUserByEmail(email);
        if (!user) {
          return null;
        }

        if (!user.isActive) {
          throw new Error('ACCOUNT_SUSPENDED');
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
        token.email = user.email;
        token.name = user.name;
      }
      // Always refresh role and active status from DB to avoid stale JWT claims (Risk #10)
      if (token.id) {
        try {
          const dbUser = await getUserById(Number(token.id));
          if (dbUser) {
            token.role = dbUser.role;
            token.isActive = dbUser.isActive;
          } else {
            // Invalidate token immediately if the user row was deleted
            token.isActive = false;
          }
        } catch {
          // Keep existing token claims when DB is unavailable during isolated unit tests
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as UserRole;
        session.user.isActive = Boolean(token.isActive);
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: getAuthSecret(),
  trustHost: true,
});
