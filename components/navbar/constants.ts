import type { NavItem } from './types';

export const PILOT_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'pireps', label: 'PIREPs', href: '/pireps' },
  { key: 'logbook', label: 'Logbook', href: '/logbook' },
  { key: 'routes', label: 'Routes', href: '/routes' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'leaderboard', label: 'Leaderboard', href: '/leaderboard' },
  {
    key: 'leave',
    label: 'Leave Requests',
    href: '/leave',
    children: [
      { key: 'leave-new', label: 'Request Leave', href: '/leave/new' },
      { key: 'leave-mine', label: 'My Leave', href: '/leave' },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    href: '/admin/pireps/status/pending',
    roles: [
      'pireps',
      'fleet',
      'multipliers',
      'routes',
      'ranks',
      'typeratings',
      'events',
      'users',
      'admin',
    ],
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    key: 'pireps',
    label: 'PIREPs',
    href: '/admin/pireps/status/pending',
    roles: ['pireps'],
  },
  {
    key: 'fleet',
    label: 'Fleet',
    href: '/admin/fleet',
    roles: ['fleet', 'routes', 'typeratings'],
    children: [
      { key: 'fleet', label: 'Fleet', href: '/admin/fleet', roles: ['fleet'] },
      {
        key: 'routes',
        label: 'Routes',
        href: '/admin/routes',
        roles: ['routes'],
      },
      {
        key: 'typeratings',
        label: 'Type Ratings',
        href: '/admin/typeratings',
        roles: ['typeratings'],
      },
    ],
  },
  // {
  //   key: 'multipliers',
  //   label: 'Multipliers',
  //   href: '/admin/multipliers',
  //   roles: ['multipliers'],
  // },
  {
    key: 'ranks',
    label: 'Ranks',
    href: '/admin/ranks',
    roles: ['ranks'],
  },
  {
    key: 'events',
    label: 'Events',
    href: '/admin/events',
    roles: ['events'],
  },
  {
    key: 'statistics',
    label: 'Statistics',
    href: '/admin/statistics',
    roles: ['users'],
  },
  {
    key: 'users',
    label: 'Users',
    href: '/admin/users',
    roles: ['users'],
    children: [
      { key: 'users', label: 'Users', href: '/admin/users' },
      {
        key: 'applications',
        label: 'Applications',
        href: '/admin/applications',
      },
      { key: 'inactivity', label: 'Inactivity', href: '/admin/inactivity' },
      { key: 'leave', label: 'Leave', href: '/admin/leave' },
    ],
  },
  {
    key: 'settings',
    label: 'VA Settings',
    href: '/admin/settings',
    roles: ['admin'],
  },
];

export const HOVER_DELAY = 150;
export const ANIMATION_CONFIG = {
  duration: 0.12,
  ease: [0.4, 0, 0.2, 1] as const,
};
