// IntuiTV Playout - Elevate.io Inspired Layout
import React, { ReactNode } from 'react';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          Intui<span>TV</span> Playout
        </Link>

        <ul className="nav-links">
          <li><Link href="/dashboard">Dashboard</Link></li>
          <li><Link href="/schedule">Schedule</Link></li>
          <li><Link href="/library">Library</Link></li>
          <li><Link href="/channels">Channels</Link></li>
          <li><Link href="/analytics">Analytics</Link></li>
        </ul>

        <div className="flex items-center gap-md">
          <LiveIndicator />
          <button className="btn btn-primary">
            Go Live
          </button>
        </div>
      </div>
    </nav>
  );
}

export function LiveIndicator() {
  return (
    <div className="status status-live">
      <span className="status-dot" />
      <span>LIVE</span>
    </div>
  );
}

export function GlassCard({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  value,
  label,
  trend
}: {
  value: string | number;
  label: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className={`mt-sm text-sm ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
