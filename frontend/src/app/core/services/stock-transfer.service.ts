import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StockTransferService {
  constructor(private api: ApiService) {}

  list(params: Record<string, unknown> = {}): Observable<any[]> {
    return this.api.get<any>('/stock-transfers', params).pipe(
      map((res) => res?.data?.transfers || res?.transfers || res?.data || [])
    );
  }

  create(payload: any): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>('/stock-transfers', payload).pipe(map((res) => res.data));
  }

  deleteStockTransfer(id: string): Observable<any> {
    return this.api.delete(`/stock-transfers/${id}`);
  }
}


