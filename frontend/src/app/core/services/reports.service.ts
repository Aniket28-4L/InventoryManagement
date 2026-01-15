import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private api: ApiService) {}

  getStock(params: Record<string, unknown>): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/reports/stock-level', params).pipe(map((res) => res.data));
  }

  getWarehouse(params: Record<string, unknown>): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/reports/warehouse-summary', params).pipe(map((res) => res.data));
  }

  getMovement(params: Record<string, unknown>): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/reports/stock-movement', params).pipe(map((res) => res.data));
  }

  getLowStock(params: Record<string, unknown>): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/reports/low-stock-items', params).pipe(map((res) => res.data));
  }

  getActivityLogs(params: Record<string, unknown>): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/reports/activity-logs', params).pipe(map((res) => res.data));
  }
}


