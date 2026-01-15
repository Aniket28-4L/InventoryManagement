import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getDashboardData(): Observable<any> {
    return this.api.get<{ success: boolean; data: any }>('/dashboard/widgets').pipe(
      map((res) => res.data)
    );
  }
}


