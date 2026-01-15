import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WarehouseService {
  constructor(private api: ApiService) {}

  list(params: Record<string, unknown> = {}): Observable<{ warehouses: any[]; page: number; total: number; pages: number }> {
    return this.api.get<any>('/warehouses', params).pipe(
      map((res) => {
        if (Array.isArray(res.data)) {
          return { warehouses: res.data.map(this.mapWarehouse), page: 1, total: res.data.length, pages: 1 };
        }
        return {
          warehouses: (res.data?.warehouses || []).map(this.mapWarehouse),
          page: res.data?.page || 1,
          total: res.data?.total || 0,
          pages: res.data?.pages || 0
        };
      })
    );
  }

  get(id: string): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>(`/warehouses/${id}`).pipe(map((res) => this.mapWarehouse(res.data)));
  }

  create(payload: Record<string, unknown>): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>('/warehouses', payload).pipe(map((res) => this.mapWarehouse(res.data)));
  }

  update(id: string, payload: Record<string, unknown>): Observable<any> {
    return this.api.put<{ success: boolean; data: any }>(`/warehouses/${id}`, payload).pipe(map((res) => this.mapWarehouse(res.data)));
  }

  delete(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/warehouses/${id}`).pipe(map((res) => res.success !== false));
  }

  listLocations(): Observable<any[]> {
    return this.api.get<{ success: boolean; data: any[] }>('/warehouses/locations').pipe(map((res) => res.data || []));
  }

  addStock(payload: { productId: string; warehouseId: string; qty: number; locationId?: string | null; variantValue?: string }): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>('/warehouses/stock/in', payload).pipe(map((res) => res.data));
  }

  transferToStore(payload: { productId: string; fromWarehouse: string; storeId: string; qty: number; variantValue?: string }): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>(
      '/warehouses/stock/transfer-to-store', payload
    ).pipe(map((res) => res.data));
  }

  adjustStock(payload: { productId: string; warehouseId: string; qty: number; locationId?: string | null; variantValue?: string }): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>('/warehouses/stock/adjust', payload).pipe(map((res) => res.data));
  }

  eraseStock(payload: { productId: string; warehouseId: string; locationId?: string | null; variantValue?: string }): Observable<any> {
    return this.api.post<{ success: boolean; data?: any }>('/warehouses/stock/erase', payload).pipe(map((res) => res.data));
  }
  private mapWarehouse(doc: any): any {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id || doc.id, ...rest };
  }
}


