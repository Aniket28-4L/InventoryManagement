import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  loading = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private toastr: ToastrService) {}

  submit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.loading = true;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.toastr.success('Welcome back!');
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Invalid credentials');
        this.loading = false;
      }
    });
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}


