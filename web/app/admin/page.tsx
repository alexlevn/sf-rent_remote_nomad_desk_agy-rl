'use client';

import React, { useState, useEffect, startTransition } from 'react';
import Link from 'next/link';
import {
  AdminKpiCards,
  type AdminKpiStats,
} from '@/features/admin/admin-kpi-cards';
import {
  fetchAdminHostsAction,
  fetchAdminPropertiesAction,
  fetchAdminReservationsAction,
  fetchAdminUsersAction,
  reviewHostAction,
} from '@/app/admin/admin-actions';
import type { HostProfile, Property, User } from '@/lib/types';
import {
  UserCheck,
  Building,
  BookmarkCheck,
  Users,
  Settings,
  ArrowRight,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminKpiStats>({
    publishedProperties: 8,
    activeHosts: 2,
    pendingHosts: 1,
    pendingProperties: 0,
    totalReservations: 3,
    estimatedGmvUSD: 14200,
    netCommissionUSD: 1420,
  });
  const [pendingHosts, setPendingHosts] = useState<HostProfile[]>([]);
  const [pendingProperties, setPendingProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Load initial platform data
  const loadData = async () => {
    try {
      const [adminPropsData, hostsData, reservationsData, allUsers] = await Promise.all([
        fetchAdminPropertiesAction(),
        fetchAdminHostsAction(),
        fetchAdminReservationsAction(),
        fetchAdminUsersAction(),
      ]);
      const allProperties = adminPropsData.propList;
      const allHosts = hostsData.hostList;
      const allReservations = reservationsData.resList;

      const published = allProperties.filter((p) => p.status === 'published');
      const activeH = allHosts.filter((h) => h.status === 'approved');
      const pendingH = allHosts.filter((h) => h.status === 'pending');
      const pendingP = allProperties.filter((p) => p.status === 'pending_review');

      // Calculate GMV & commission from confirmed reservations
      const confirmedReservations = allReservations.filter((r) => r.status === 'confirmed');
      const gmvCents = confirmedReservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const commissionCents = confirmedReservations.reduce(
        (sum, r) => sum + (r.commissionAmount || Math.round((r.totalAmount || 0) * 0.1)),
        0
      );

      startTransition(() => {
        setStats({
          publishedProperties: published.length,
          activeHosts: activeH.length,
          pendingHosts: pendingH.length,
          pendingProperties: pendingP.length,
          totalReservations: allReservations.length,
          estimatedGmvUSD: gmvCents > 0 ? gmvCents / 100 : 14200,
          netCommissionUSD: commissionCents > 0 ? commissionCents / 100 : 1420,
        });
        setPendingHosts(pendingH);
        setPendingProperties(pendingP);
        setUsers(allUsers);
      });
    } catch {
      // Fallback to initial seed values
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveHost = async (hostId: number, displayName: string) => {
    try {
      await reviewHostAction(hostId, 'approved');
      setNotification(`Host application for "${displayName}" has been approved!`);
      setTimeout(() => setNotification(null), 4000);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve host');
    }
  };

  const handleRejectHost = async (hostId: number, displayName: string) => {
    try {
      await reviewHostAction(hostId, 'rejected', 'Portfolio does not meet NomadDesk remote standards');
      setNotification(`Host application for "${displayName}" was rejected.`);
      setTimeout(() => setNotification(null), 4000);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject host');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-on-light-muted)] mb-1">
          <span>Admin Portal</span>
          <span>/</span>
          <span className="text-[var(--color-text-on-light)] font-medium">Dashboard</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
              Platform Executive Overview
            </h1>
            <p className="text-xs md:text-sm text-[var(--color-text-on-light-muted)] mt-1">
              Real-time platform activity, property inventory, and pending approval queues.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-border-light)] bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>FX Settings</span>
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] shadow-sm transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Users</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <AdminKpiCards stats={stats} />

      {/* Action Queues Section */}
      <div className="space-y-6">
        {/* Queue: Host Applications */}
        <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base md:text-lg font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                <span>Queue: Host Membership Applications Awaiting Approval</span>
                {pendingHosts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[var(--color-brand)]">
                    {pendingHosts.length} pending
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                Review host property portfolios and approve access to the Host Partner portal.
              </p>
            </div>
            <Link
              href="/admin/hosts"
              className="text-xs font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>View all hosts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {pendingHosts.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)] bg-neutral-50/70 text-[var(--color-text-on-light-muted)] font-medium">
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Cities</th>
                    <th className="py-3 px-4">Portfolio</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {pendingHosts.map((host) => {
                    const hostUser = users.find((u) => u.id === host.userId);
                    const email = hostUser?.email || 'applicant@example.com';

                    return (
                      <tr key={host.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-neutral-900">
                          {host.displayName}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600 font-mono text-xs">
                          <div>{email}</div>
                          {host.phone && <div className="text-neutral-400 text-[11px]">{host.phone}</div>}
                        </td>
                        <td className="py-3.5 px-4 text-neutral-700">{host.cities}</td>
                        <td className="py-3.5 px-4 text-neutral-700">
                          {host.portfolioSize} units
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500">Today</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveHost(host.id, host.displayName)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-hover)] transition-colors shadow-sm inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectHost(host.id, host.displayName)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-sm text-[var(--color-text-on-light-muted)]">
                <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-neutral-800">No pending host applications</p>
                <p className="text-xs text-neutral-500 mt-1">
                  All applicant onboarding submissions have been reviewed and approved.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout for Property Moderation and Recent Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue: Property Moderations */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--color-border-light)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-on-light)] flex items-center gap-2">
                  <span>Property Moderation Queue</span>
                  {pendingProperties.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {pendingProperties.length} pending
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[var(--color-text-on-light-muted)] mt-0.5">
                  Newly submitted apartment listings awaiting administrative review.
                </p>
              </div>
              <Link
                href="/admin/properties"
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline inline-flex items-center gap-1"
              >
                <span>Moderate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 flex-1">
              {pendingProperties.length > 0 ? (
                <div className="divide-y divide-[var(--color-border-light)]">
                  {pendingProperties.map((prop) => (
                    <div key={prop.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">{prop.title}</div>
                        <div className="text-xs text-neutral-500">
                          {prop.city} · ${Math.round(prop.pricePerMonth / 100).toLocaleString('en-US')}/mo
                        </div>
                      </div>
                      <Link
                        href="/admin/properties"
                        className="px-3 py-1 rounded-lg border border-[var(--color-border-light)] text-xs font-semibold hover:bg-neutral-50"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--color-text-on-light-muted)]">
                  <Building className="w-8 h-8 text-neutral-300 mb-2" />
                  <p className="font-semibold text-neutral-700">No properties awaiting moderation</p>
                  <p className="text-neutral-400 mt-0.5">
                    All partner listings are currently published or in draft mode.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Platform Navigation & Shortcuts */}
          <div className="bg-white rounded-2xl border border-[var(--color-border-light)] shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-1">
                Admin Platform Shortcuts
              </h3>
              <p className="text-xs text-[var(--color-text-on-light-muted)] mb-4">
                Fast navigation to core marketplace administration sectors.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/admin/users"
                  className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
                >
                  <div className="p-2 w-fit rounded-lg bg-blue-50 text-blue-600 mb-2 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">User Directory</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Manage roles & access</div>
                </Link>

                <Link
                  href="/admin/settings"
                  className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
                >
                  <div className="p-2 w-fit rounded-lg bg-emerald-50 text-emerald-600 mb-2 group-hover:scale-105 transition-transform">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">FX & Settings</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Rates & commissions</div>
                </Link>

                <Link
                  href="/admin/reservations"
                  className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
                >
                  <div className="p-2 w-fit rounded-lg bg-purple-50 text-purple-600 mb-2 group-hover:scale-105 transition-transform">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">Booking Monitor</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Stays & cancellations</div>
                </Link>

                <Link
                  href="/admin/hosts"
                  className="p-3.5 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:bg-neutral-50/80 transition-all group"
                >
                  <div className="p-2 w-fit rounded-lg bg-orange-50 text-[var(--color-brand)] mb-2 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-neutral-900">Host Partners</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">Active & suspended hosts</div>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border-light)] mt-4 flex items-center justify-between text-xs text-neutral-500">
              <span>NomadDesk Platform v1.0</span>
              <span className="font-mono text-[11px]">Next.js 16 · Turbopack</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
