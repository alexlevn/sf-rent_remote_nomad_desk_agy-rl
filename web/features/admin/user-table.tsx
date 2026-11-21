'use client';

import React, { useState, useEffect, useMemo, startTransition } from 'react';
import type { User, UserRole } from '@/lib/types';
import { listUsers, updateUser } from '@/lib/api/users';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserCheck,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string>('admin@example.com');

  const fetchUsers = async () => {
    try {
      const data = await listUsers();
      startTransition(() => {
        setUsers(data);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchUsers();

    try {
      const stored = localStorage.getItem('nomaddesk_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.email) {
          startTransition(() => {
            setCurrentAdminEmail(parsed.email);
          });
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Show temporary toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Count active admins to protect the last remaining admin
  const adminCount = useMemo(() => {
    return users.filter((u) => u.role === 'admin' && u.isActive !== false).length;
  }, [users]);

  // Handle Role Change (Promote / Demote)
  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    // Protection: Cannot demote the last remaining admin account
    if (targetUser.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      alert('Cannot demote the last remaining active administrator account.');
      return;
    }

    try {
      await updateUser(targetUser.id, { role: newRole });
      showToast(
        newRole === 'admin'
          ? `User ${targetUser.email} promoted to Administrator.`
          : `Administrator ${targetUser.email} demoted to Guest.`
      );
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  // Handle Account Suspension / Activation Toggle
  const handleToggleStatus = async (targetUser: User) => {
    // Protection: Cannot suspend the current logged-in admin or the last remaining admin
    if (targetUser.email === currentAdminEmail && targetUser.isActive) {
      alert('You cannot suspend your own active administrator account.');
      return;
    }
    if (targetUser.role === 'admin' && targetUser.isActive && adminCount <= 1) {
      alert('Cannot suspend the last remaining active administrator account.');
      return;
    }

    const nextActive = !targetUser.isActive;
    try {
      await updateUser(targetUser.id, { isActive: nextActive });
      showToast(
        nextActive
          ? `Account for ${targetUser.email} has been activated.`
          : `Account for ${targetUser.email} has been suspended.`
      );
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update account status');
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search matching email or name
      const query = searchQuery.trim().toLowerCase();
      const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const matchesSearch =
        !query || user.email.toLowerCase().includes(query) || name.includes(query);

      // Role filter
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive !== false) ||
        (statusFilter === 'suspended' && user.isActive === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-medium flex items-center gap-2 shadow-sm animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-light)] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-xs md:text-sm focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter Tabs */}
          <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold">
            {(['all', 'guest', 'host', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  roleFilter === r
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
            className="px-3 py-2 bg-neutral-50 border border-[var(--color-border-light)] rounded-xl text-xs font-medium text-neutral-700 focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/80 text-[var(--color-text-on-light-muted)] font-medium">
                <th className="py-3.5 px-5">Email / Account</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4">Role Modification</th>
                <th className="py-3.5 px-4 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-light)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700">No matching user accounts</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Try adjusting your search criteria or role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentAdmin = user.email === currentAdminEmail;
                  const isLastAdmin = user.role === 'admin' && adminCount <= 1;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-50/60 transition-colors group"
                    >
                      {/* Email & Name */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <span>{user.email}</span>
                          {isCurrentAdmin && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 font-mono font-medium">
                              You
                            </span>
                          )}
                        </div>
                        {(user.firstName || user.lastName) && (
                          <div className="text-[11px] text-neutral-500">
                            {user.firstName} {user.lastName}
                          </div>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>ADMIN</span>
                          </span>
                        ) : user.role === 'host' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-[var(--color-brand)]">
                            <UserCheck className="w-3 h-3" />
                            <span>HOST</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700">
                            <span>GUEST</span>
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {user.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-neutral-500 font-mono text-xs">
                        {user.createdAt
                          ? user.createdAt.split('T')[0]
                          : '2026-01-15'}
                      </td>

                      {/* Role Modification */}
                      <td className="py-3.5 px-4">
                        {user.role === 'guest' ? (
                          <button
                            onClick={() => handleRoleChange(user, 'admin')}
                            className="px-2.5 py-1 rounded-lg border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-2xs inline-flex items-center gap-1"
                          >
                            <span>Promote to Admin</span>
                          </button>
                        ) : user.role === 'admin' ? (
                          isLastAdmin ? (
                            <span className="text-xs text-neutral-400 font-medium" title="Cannot demote last admin">
                              Fixed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(user, 'guest')}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                            >
                              <span>Demote to Guest</span>
                            </button>
                          )
                        ) : (
                          <span
                            className="text-xs text-neutral-400 font-medium"
                            title="Role host is managed via Host Approvals"
                          >
                            Fixed
                          </span>
                        )}
                      </td>

                      {/* Access Control (Suspend / Activate) */}
                      <td className="py-3.5 px-4 text-right">
                        {user.isActive !== false ? (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isCurrentAdmin || isLastAdmin}
                            title={
                              isCurrentAdmin
                                ? 'Cannot suspend your own account'
                                : isLastAdmin
                                ? 'Cannot suspend the last admin account'
                                : 'Suspend user account'
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                              isCurrentAdmin || isLastAdmin
                                ? 'opacity-40 cursor-not-allowed text-neutral-400'
                                : 'text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="p-4 border-t border-[var(--color-border-light)] bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div>
            Showing <strong className="text-neutral-900">{filteredUsers.length}</strong> of{' '}
            <strong className="text-neutral-900">{users.length}</strong> registered user accounts.
          </div>
          <div className="text-[11px] text-neutral-400">
            * Host roles are managed strictly via Host Approvals queue (§4.3 Screen #29).
          </div>
        </div>
      </div>
    </div>
  );
}
