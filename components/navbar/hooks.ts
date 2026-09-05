import { useMemo } from 'react';

import { hasRequiredRole } from '@/lib/roles';

import { ADMIN_NAV_ITEMS, PILOT_NAV_ITEMS } from './constants';
import type { NavItem } from './types';

export const useNavItems = (
  basePath: string,
  userRoles: string[] | string | null,
  isAdminRoute: boolean
) =>
  useMemo(() => {
    const navItems = isAdminRoute ? ADMIN_NAV_ITEMS : PILOT_NAV_ITEMS;

    const filteredItems = navItems.filter((item) => {
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      return hasRequiredRole(userRoles, item.roles);
    });

    const resolveAdminHref = (): string | undefined => {
      // Pick the first admin section the user can access
      const target = ADMIN_NAV_ITEMS.find((adminItem) =>
        adminItem.roles ? hasRequiredRole(userRoles, adminItem.roles) : true
      );
      return target?.href;
    };

    return filteredItems.map((item) => {
      let href = item.href;

      // For the pilot navbar's Admin tab, point to the first allowed admin section
      if (!isAdminRoute && item.key === 'admin') {
        href = resolveAdminHref() ?? href;
      }

      // Drop dropdown children the user can't access (per-child roles)
      const childrenHaveRoles = item.children?.some(
        (c) => c.roles && c.roles.length > 0
      );
      let visibleChildren = item.children?.filter(
        (c) =>
          !c.roles ||
          c.roles.length === 0 ||
          hasRequiredRole(userRoles, c.roles)
      );

      // When children are role-gated, point the parent at the first accessible one
      if (childrenHaveRoles && visibleChildren && visibleChildren.length > 0) {
        href = visibleChildren[0].href;
        // Collapse a single accessible child into a plain link
        if (visibleChildren.length === 1) {
          visibleChildren = undefined;
        }
      }

      return {
        ...item,
        href: href ? `${basePath}${href}` : href,
        children: visibleChildren?.map((c) => ({
          ...c,
          href: `${basePath}${c.href}`,
        })),
      };
    });
  }, [basePath, userRoles, isAdminRoute]);

export const useActiveIndex = (
  navItems: NavItem[],
  pathname: string,
  basePath: string
) =>
  useMemo(() => {
    const cleanPathname = pathname.replace(basePath, '');

    const byChildIndex = navItems.findIndex((i) =>
      i.children?.some((c) => {
        const childHref = c.href.replace(basePath, '');
        return (
          cleanPathname === childHref ||
          cleanPathname.startsWith(childHref + '/')
        );
      })
    );

    if (byChildIndex !== -1) {
      return byChildIndex;
    }

    const activeIndex = navItems.findIndex((i) => {
      if (!i.href) {
        return false;
      }

      const itemHref = i.href.replace(basePath, '');
      const itemPath = itemHref.split('/').slice(0, 3).join('/');
      const currentPath = cleanPathname.split('/').slice(0, 3).join('/');

      return (
        cleanPathname === itemHref ||
        cleanPathname.startsWith(itemHref + '/') ||
        currentPath === itemPath
      );
    });

    return activeIndex !== -1 ? activeIndex : null;
  }, [navItems, pathname, basePath]);
