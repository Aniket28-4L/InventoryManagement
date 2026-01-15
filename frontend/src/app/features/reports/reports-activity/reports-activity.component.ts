import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ReportsService } from '../../../core/services/reports.service';

@Component({
  selector: 'app-reports-activity',
  templateUrl: './reports-activity.component.html',
  styleUrls: ['./reports-activity.component.scss']
})
export class ReportsActivityComponent implements OnInit {
  logs: any[] = [];
  loading = false;
  page = 1;
  pageSize = 20;
  total = 0;
  dateFrom: string = '';
  dateTo: string = '';

  constructor(
    private reportsService: ReportsService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    const params: any = { page: this.page, limit: this.pageSize };
    if (this.dateFrom) params.dateFrom = this.dateFrom;
    if (this.dateTo) params.dateTo = this.dateTo;

    this.reportsService.getActivityLogs(params).subscribe({
      next: (res) => {
        this.logs = Array.isArray(res) ? res : (res.data || res.logs || []);
        this.total = res.total || this.logs.length;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load activity logs');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.page++;
    this.loadLogs();
  }

  prev(): void {
    if (this.page === 1) return;
    this.page--;
    this.loadLogs();
  }
}
