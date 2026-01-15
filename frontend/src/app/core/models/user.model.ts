export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff' | 'Viewer' | 'Sales' | 'Store Keeper' | string;
}


