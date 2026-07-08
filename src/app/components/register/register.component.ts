import { Component } from '@angular/core';
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
          <h1 class="text-2xl font-bold text-gray-900">QA Tracker</h1>
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
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-400"
                placeholder="Qual"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                minlength="8"
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-400"
                placeholder="At least 8 characters"
              />
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
  loading = false;

  constructor(
    private dataService: TicketDataService,
    private router: Router,
  ) {}

  register(): void {
    if (!this.displayName.trim() || !this.email.trim() || !this.password) return;
    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.dataService.register(this.email.trim(), this.password, this.displayName.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}
