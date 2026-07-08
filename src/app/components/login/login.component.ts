import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketDataService } from '../../services/ticket-data';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div class="max-w-sm w-full">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-gray-900">QA Tracker</h1>
          <p class="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div class="bg-white rounded shadow-sm border border-gray-200 p-6">
          <div *ngIf="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
            {{ error }}
          </div>

          <form (ngSubmit)="login()" class="space-y-4">
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
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>
          </form>

          <p class="text-xs text-gray-500 text-center mt-4">
            Don't have an account?
            <a routerLink="/register" class="text-slate-700 hover:text-slate-900 underline">Create one</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: ``,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private dataService: TicketDataService,
    private router: Router,
  ) {}

  login(): void {
    if (!this.email.trim() || !this.password) return;

    this.loading = true;
    this.error = '';

    this.dataService.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || 'Login failed. Please try again.';
      },
    });
  }
}
