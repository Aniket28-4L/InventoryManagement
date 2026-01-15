import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit, OnDestroy {
  users: any[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  loading = true;
  searchTerm = '';
  deleteTarget: any = null;
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private usersService: UsersService,
    public toastr: ToastrService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Set up debounced search
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 1;
      this.fetchUsers(1);
    });
    this.fetchUsers();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  fetchUsers(page = this.page): void {
    this.loading = true;
    const params: any = { page, limit: this.pageSize };
    if (this.searchTerm && this.searchTerm.trim()) {
      params.search = this.searchTerm.trim();
    }
    this.usersService.list(params).subscribe({
      next: (res) => {
        this.users = res.users;
        this.page = res.page;
        this.total = res.total;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load users');
        this.loading = false;
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
    this.page = 1;
    this.fetchUsers(1);
  }

  search(): void {
    this.page = 1;
    this.fetchUsers(1);
  }

  openDelete(user: any): void {
    this.deleteTarget = user;
  }

  closeDelete(): void {
    this.deleteTarget = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.usersService.delete(this.deleteTarget.id || this.deleteTarget._id).subscribe({
      next: () => {
        this.toastr.success('User deleted successfully');
        this.closeDelete();
        this.fetchUsers(this.page);
      },
      error: () => {
        this.toastr.error('Failed to delete user');
      }
    });
  }

  goTo(page: number): void {
    if (page < 1 || page === this.page) return;
    this.page = page;
    this.fetchUsers(page);
  }

  next(): void {
    if (this.page * this.pageSize >= this.total) return;
    this.goTo(this.page + 1);
  }

  prev(): void {
    if (this.page === 1) return;
    this.goTo(this.page - 1);
  }
}
