import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

type PermissionMatrix = Record<
  string,
  Record<'Admin' | 'Manager' | 'Staff' | 'Viewer' | string, 'All' | 'Write' | 'Limited' | 'Request' | 'Read' | 'None'>
>;

const MATRIX: PermissionMatrix = {
  Products: { Admin: 'All', Manager: 'Write', Staff: 'Read', Viewer: 'Read' },
  Barcodes: { Admin: 'All', Manager: 'Write', Staff: 'Write', Viewer: 'Read' },
  StockIn: { Admin: 'All', Manager: 'Write', Staff: 'Write', Viewer: 'Read' },
  StockOut: { Admin: 'All', Manager: 'Write', Staff: 'Write', Viewer: 'Read' },
  Adjustments: { Admin: 'All', Manager: 'Write', Staff: 'Request', Viewer: 'Read' },
  Reports: { Admin: 'All', Manager: 'All', Staff: 'Limited', Viewer: 'Read' },
  Settings: { Admin: 'All', Manager: 'Limited', Staff: 'None', Viewer: 'None' }
};

@Injectable({ providedIn: 'root' })
export class RoleService {
  constructor(private auth: AuthService) {}

  get role(): string {
    return this.auth.role;
  }

  can(module: string, action: string): boolean {
    const mapping = MATRIX[module] || {};
    const level = mapping[this.role] || 'None';
    if (level === 'All') return true;
    if (level === 'Write') return ['View', 'Create', 'Edit', 'Print', 'Receive', 'Dispatch', 'Enter', 'Write'].includes(action);
    if (level === 'Limited') return ['View', 'Read-only'].includes(action);
    if (level === 'Request') return ['Request', 'View'].includes(action);
    if (level === 'Read') return action === 'View' || action === 'Read-only';
    return false;
  }
}


