import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User } from '../models/user.model';

interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'token';
  private tokenSubject = new BehaviorSubject<string | null>(sessionStorage.getItem(this.tokenKey));
  private userSubject = new BehaviorSubject<User | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  token$ = this.tokenSubject.asObservable();
  user$ = this.userSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(private api: ApiService, private router: Router) {}

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  get role(): string {
    return this.user?.role ?? 'Viewer';
  }

  bootstrap(): void {
    const token = this.tokenSubject.value;
    if (!token) {
      this.loadingSubject.next(false);
      return;
    }
    this.loadingSubject.next(true);
    this.api.get<{ success: boolean; user: User }>('/auth/me').subscribe({
      next: (res) => {
        if (res?.success) {
          this.userSubject.next(res.user);
        } else {
          this.clearAuth();
        }
        this.loadingSubject.next(false);
      },
      error: () => {
        this.clearAuth();
        this.loadingSubject.next(false);
      }
    });
  }

  login(email: string, password: string): Observable<AuthResponse> {
    this.loadingSubject.next(true);
    return this.api.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap({
        next: (res) => {
          if (res.success) {
            sessionStorage.setItem(this.tokenKey, res.token);
            this.tokenSubject.next(res.token);
            this.userSubject.next(res.user);
            this.router.navigateByUrl('/');
          }
          this.loadingSubject.next(false);
        },
        error: () => this.loadingSubject.next(false)
      })
    );
  }

  logout(): void {
    this.api.post('/auth/logout', {}).subscribe({ error: () => {} });
    this.clearAuth();
    this.router.navigate(['/login']);
  }

  setUser(user: User | null): void {
    this.userSubject.next(user);
  }

  private clearAuth(): void {
    sessionStorage.removeItem(this.tokenKey);
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }
}


