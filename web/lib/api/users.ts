import type { User } from '@/lib/types';
import { getMockStore } from './mock/seed-data';

/**
 * Lists all registered users in the platform.
 */
export async function listUsers(): Promise<User[]> {
  const store = getMockStore();
  return store.users.map((u) => ({ ...u }));
}

/**
 * Retrieves a user by ID.
 */
export async function getUserById(id: number): Promise<User | null> {
  const store = getMockStore();
  const user = store.users.find((u) => u.id === id);
  return user ? { ...user } : null;
}

/**
 * Retrieves a user by email address.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const store = getMockStore();
  const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return user ? { ...user } : null;
}

/**
 * Updates a user account (e.g. status, profile, role).
 */
export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const store = getMockStore();
  const index = store.users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error(`User ${id} not found`);
  }

  const updated: User = {
    ...store.users[index],
    ...data,
    id: store.users[index].id,
  };
  store.users[index] = updated;
  return { ...updated };
}

/**
 * Creates a new user account (e.g. during register).
 */
export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const store = getMockStore();
  const exists = store.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (exists) {
    throw new Error(`Email ${data.email} is already registered`);
  }

  const maxId = store.users.reduce((max, u) => Math.max(max, u.id), 0);
  const newUser: User = {
    ...data,
    id: maxId + 1,
    isActive: data.isActive ?? true,
    role: data.role || 'guest',
    createdAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  return { ...newUser };
}
