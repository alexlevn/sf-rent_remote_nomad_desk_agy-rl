export type UserRole = 'guest' | 'host' | 'admin';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}
