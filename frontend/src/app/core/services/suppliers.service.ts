import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  status: string;
  contact?: {
    person?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;
  };
  address?: Record<string, string>;
  business?: Record<string, string>;
  notes?: string;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  constructor(private api: ApiService) {}

  list(params: Record<string, unknown>): Observable<{ suppliers: Supplier[]; page: number; total: number; pages: number }> {
    return this.api.get<any>('/suppliers', params).pipe(map((res) => ({
      suppliers: (res.suppliers || res.data || []).map(this.mapSupplier),
      page: res.page || params['page'] || 1,
      total: res.total || 0,
      pages: res.pages || 0
    })));
  }

  get(id: string): Observable<Supplier> {
    return this.api.get<{ success: boolean; data: any; supplier?: any }>(`/suppliers/${id}`).pipe(map((res) => this.mapSupplier(res.data || res.supplier)));
  }

  create(payload: Partial<Supplier>): Observable<Supplier> {
    return this.api.post<{ success: boolean; data: any }>('/suppliers', payload).pipe(map((res) => this.mapSupplier(res.data)));
  }

  update(id: string, payload: Partial<Supplier>): Observable<Supplier> {
    return this.api.put<{ success: boolean; data: any }>(`/suppliers/${id}`, payload).pipe(map((res) => this.mapSupplier(res.data)));
  }

  delete(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/suppliers/${id}`).pipe(map((res) => res.success !== false));
  }

  private mapSupplier(doc: any): Supplier {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id || doc.id, ...rest } as Supplier;
  }
}


