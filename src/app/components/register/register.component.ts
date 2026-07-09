import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketDataService } from '../../services/ticket-data';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="max-w-sm w-full">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">QAT</h1>
          <p class="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <div class="bg-white rounded shadow-sm border border-gray-200 p-6">
          <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
            {{ error }}
          </div>

          <form (ngSubmit)="register()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                [(ngModel)]="displayName"
                name="displayName"
                required
                (input)="touched && validate()"
                class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-slate-400 transition-colors
                  {{ fieldErrors.displayName ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-slate-300 bg-white' }}"
                placeholder="Qual"
              />
              <div *ngIf="fieldErrors.displayName" class="text-red-600 text-xs mt-1">{{ fieldErrors.displayName }}</div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                (input)="touched && validate()"
                class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-slate-400 transition-colors
                  {{ fieldErrors.email ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-slate-300 bg-white' }}"
                placeholder="you@example.com"
              />
              <div *ngIf="fieldErrors.email" class="text-red-600 text-xs mt-1">{{ fieldErrors.email }}</div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="8"
                (input)="touched && validate()"
                class="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-slate-400 transition-colors
                  {{ fieldErrors.password ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-slate-300 bg-white' }}"
                placeholder="At least 8 characters"
              />
              <div *ngIf="fieldErrors.password" class="text-red-600 text-xs mt-1">{{ fieldErrors.password }}</div>
            </div>

            <button
              type="submit"
              [disabled]="loading"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {{ loading ? 'Creating account…' : 'Create Account' }}
            </button>
          </form>

          <p class="text-xs text-gray-500 text-center mt-4">
            Already have an account?
            <a routerLink="/login" class="text-slate-700 hover:text-slate-900 underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class RegisterComponent {
  displayName = '';
  email = '';
  password = '';
  error = '';
  fieldErrors: { displayName?: string; email?: string; password?: string } = {};
  loading = false;
  touched = false;

  constructor(
    private dataService: TicketDataService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  validate(): boolean {
    this.fieldErrors = {};

    if (!this.displayName.trim()) {
      this.fieldErrors.displayName = 'Display name is required.';
    } else if (this.displayName.trim().length > 50) {
      this.fieldErrors.displayName = 'Display name must be 50 characters or fewer.';
    }

    if (!this.email.trim()) {
      this.fieldErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.fieldErrors.email = 'Please enter a valid email address.';
    }

    if (!this.password) {
      this.fieldErrors.password = 'Password is required.';
    } else if (this.password.length < 8) {
      this.fieldErrors.password = 'Password must be at least 8 characters.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  register(): void {
    this.touched = true;
    if (!this.validate()) return;

    this.loading = true;
    this.error = '';

    this.dataService.register(this.email.trim(), this.password, this.displayName.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;

        // Extract server error details
        const errCode = err.error?.error?.code;
        const errMsg = err.error?.error?.message;
        const details = err.error?.error?.details;

        if (errCode === 'CONFLICT') {
          this.error = errMsg || 'A user with this email already exists.';
          this.fieldErrors.email = this.fieldErrors.email || 'This email is already registered. Try logging in instead.';
        } else if (errCode === 'VALIDATION_ERROR') {
          this.error = 'Please fix the errors below.';
          if (details?.email) this.fieldErrors.email = details.email[0];
          if (details?.password) this.fieldErrors.password = details.password[0];
          if (details?.displayName) this.fieldErrors.displayName = details.displayName[0];
        } else if (err.status === 0) {
          this.error = 'Unable to connect to server. Please check your connection.';
        } else {
          this.error = errMsg || 'Registration failed. Please try again.';
        }

        // Force change detection in case Angular zone doesn't pick it up
        this.cdr.detectChanges();
      },
    });
  }
}
