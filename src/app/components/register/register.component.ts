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
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 relative">
      <div class="absolute top-0 left-0 right-0 flex justify-center pt-16">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900">QAT</h1>
          <p class="text-sm text-gray-500 mt-1">Create your account</p>
        </div>
      </div>
      <div class="w-full max-w-sm py-12">
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
              <div class="relative">
                <input
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="8"
                  (input)="touched && validate()"
                  class="w-full border rounded px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:border-slate-400 transition-colors
                    {{ fieldErrors.password ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-slate-300 bg-white' }}"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  (click)="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabindex="-1"
                >
                  <svg *ngIf="!showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div *ngIf="fieldErrors.password" class="text-red-600 text-xs mt-1">{{ fieldErrors.password }}</div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div class="relative">
                <input
                  [type]="showConfirmPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                  (input)="touched && validate()"
                  class="w-full border rounded px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:border-slate-400 transition-colors
                    {{ fieldErrors.confirmPassword ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-slate-300 focus:ring-slate-300 bg-white' }}"
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  (click)="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabindex="-1"
                >
                  <svg *ngIf="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div *ngIf="fieldErrors.confirmPassword" class="text-red-600 text-xs mt-1">{{ fieldErrors.confirmPassword }}</div>
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
  styles: `:host { display: block; }`,
})
export class RegisterComponent {
  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  error = '';
  fieldErrors: { displayName?: string; email?: string; password?: string; confirmPassword?: string } = {};
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

    if (!this.confirmPassword) {
      this.fieldErrors.confirmPassword = 'Please confirm your password.';
    } else if (this.password && this.confirmPassword !== this.password) {
      this.fieldErrors.confirmPassword = 'Passwords do not match.';
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
