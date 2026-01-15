import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private api: ApiService) {}

  list(params: Record<string, unknown>): Observable<{ users: any[]; page: number; total: number; pages: number }> {
    return this.api.get<any>('/users', params).pipe(map((res) => {
      if (Array.isArray(res.data)) {
        return { users: res.data, page: 1, total: res.data.length, pages: 1 };
      }
      return {
        users: res.data?.users || [],
        page: res.data?.page || 1,
        total: res.data?.total || 0,
        pages: res.data?.pages || 0
      };
    }));
  }

  get(id: string): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>(`/users/${id}`).pipe(map((res) => res.data));
  }

  create(payload: any): Observable<any> {
    return this.api.post<{ success: boolean; data: any }>('/users', payload).pipe(map((res) => res.data));
  }

  update(id: string, payload: any): Observable<any> {
    return this.api.put<{ success: boolean; data: any }>(`/users/${id}`, payload).pipe(map((res) => res.data));
  }

  delete(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/users/${id}`).pipe(map((res) => res.success !== false));
  }
}


