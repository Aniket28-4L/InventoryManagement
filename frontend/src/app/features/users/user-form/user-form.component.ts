import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit {
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['Sales', Validators.required],
    phone: [''],
    department: [''],
    isActive: [true]
  });
  loading = true;
  saving = false;
  userId: string | null = null;
  roles = ['Admin', 'Sales', 'Store Keeper'];
  get isEditMode(): boolean { return !!this.userId; }

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private route: ActivatedRoute,
    public router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.loadUser(this.userId);
      this.form.get('password')?.clearValidators();
    } else {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.loading = false;
    }
    this.form.get('password')?.updateValueAndValidity();
  }

  loadUser(id: string): void {
    this.loading = true;
    this.usersService.get(id).subscribe({
      next: (user) => {
        this.form.patchValue({
          name: user.name || '',
          email: user.email || '',
          password: '',
          role: user.role || 'Sales',
          phone: user.phone || '',
          department: user.department || '',
          isActive: user.isActive !== false
        });
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load user');
        this.loading = false;
        this.router.navigate(['/users']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const payload: any = { ...this.form.value };
    if (this.isEditMode && !payload.password) {
      delete payload.password;
    }
    
    const operation = this.isEditMode
      ? this.usersService.update(this.userId!, payload)
      : this.usersService.create(payload);

    operation.subscribe({
      next: () => {
        this.toastr.success(`User ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/users']);
      },
      error: (error: any) => {
        this.toastr.error(error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} user`);
        this.saving = false;
      }
    });
  }
}
