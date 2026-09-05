export type NavItem = {
  key: string;
  label: string;
  href?: string;
  roles?: string[];
  children?: Array<{
    key: string;
    label: string;
    href: string;
    prefetch?: boolean;
    roles?: string[];
  }>;
};

export interface NavbarProps {
  basePath?: string;
}

export interface NavTabsProps {
  items: NavItem[];
  pathname: string;
  activeIndex: number | null;
  isAdminRoute?: boolean;
}

export interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

export interface HoverMenuTabProps {
  item: NavItem;
  pathname: string;
  isActive: boolean;
  setDropdownOpen?: (open: boolean) => void;
}

export interface MobileMenuProps {
  items: NavItem[];
  pathname: string;
  onClose: () => void;
  isAdminRoute: boolean;
}

export interface MobileMenuDropdownProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  pathname: string;
  onClose: () => void;
}

export interface MobileMenuLinkProps {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}
