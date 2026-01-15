import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
  permission?: { module: string; action: string };
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() open = true;
  @Output() toggle = new EventEmitter<void>();

  navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: 'layout-dashboard', roles: ['Admin', 'Manager', 'Viewer'] },
    { path: '/products', label: 'Products', icon: 'package', roles: ['Admin', 'Manager', 'Viewer'], permission: { module: 'Products', action: 'View' } },
    { path: '/categories', label: 'Categories', icon: 'box', roles: ['Admin', 'Manager'] },
    { path: '/variants', label: 'Variants', icon: 'box', roles: ['Admin', 'Manager'] },
    { path: '/brands', label: 'Brands', icon: 'box', roles: ['Admin', 'Manager'] },
    { path: '/stores', label: 'Stores', icon: 'box', roles: ['Admin', 'Manager', 'Store Keeper'] },
    { path: '/suppliers', label: 'Suppliers', icon: 'building-2', roles: ['Admin', 'Manager'] },
    { path: '/sales', label: 'Sales', icon: 'shopping-cart', roles: ['Admin', 'Manager', 'Staff', 'Sales'] },
    { path: '/sales/history', label: 'Sales History', icon: 'receipt', roles: ['Admin', 'Manager', 'Viewer', 'Sales'] },
    { path: '/barcodes/scan', label: 'Barcodes', icon: 'scan-line', roles: ['Admin', 'Manager', 'Staff', 'Sales', 'Store Keeper'] },
    { path: '/warehouses', label: 'Warehouses', icon: 'building-2', roles: ['Admin', 'Manager', 'Store Keeper'] },
    { path: '/stock/transfer', label: 'Stock Transfer', icon: 'arrow-left-right', roles: ['Admin', 'Manager', 'Store Keeper'] },
    { path: '/users', label: 'Users & Roles', icon: 'users', roles: ['Admin', 'Manager'] },
    { path: '/reports/stock', label: 'Reports', icon: 'bar-chart', roles: ['Admin', 'Manager', 'Viewer'] }
  ];

  constructor(private auth: AuthService, private roles: RoleService, private router: Router) {}

  canShow(item: NavItem): boolean {
    const role = this.auth.role;
    if (!item.roles.includes(role)) return false;
    if (item.permission) {
      return this.roles.can(item.permission.module, item.permission.action);
    }
    return true;
  }

  isActive(path: string): boolean {
    const current = this.router.url;
    return current === path || (path !== '/' && current.startsWith(path));
  }
}


