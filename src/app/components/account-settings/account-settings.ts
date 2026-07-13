import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TicketDataService, AuthUser } from '../../services/ticket-data';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-settings.html',
  styles: ``,
})
export class AccountSettingsPage implements OnInit {
  currentUser: AuthUser | null = null;

  previewUrl: string | null = null;
  uploadedFile: File | null = null;
  avatarError = '';
  uploadingAvatar = false;
  removingAvatar = false;

  editingName = false;
  nameBuffer = '';
  nameError = '';
  savingName = false;

  showPasswordForm = false;
  showOld = false;
  showNew = false;
  showConfirm = false;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';
  savingPassword = false;

  constructor(
    private dataService: TicketDataService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.dataService.currentUser$.value;
    if (this.currentUser?.avatarUrl) {
      this.previewUrl = this.currentUser.avatarUrl;
    }
    this.nameBuffer = this.currentUser?.displayName ?? '';
  }

  get initial(): string {
    return (this.currentUser?.displayName?.charAt(0) || '?').toUpperCase();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.avatarError = 'File must be smaller than 5MB';
      this.cdr.detectChanges();
      return;
    }

    this.avatarError = '';
    this.uploadingAvatar = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.dataService.uploadAvatar(file).subscribe({
      next: () => {
        this.uploadingAvatar = false;
        this.uploadedFile = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.avatarError = err.error?.message || 'Failed to upload avatar';
        if (this.currentUser?.avatarUrl) {
          this.previewUrl = this.currentUser.avatarUrl;
        } else {
          this.previewUrl = null;
        }
        this.uploadedFile = null;
        this.cdr.detectChanges();
      },
    });
  }

  removeAvatar(): void {
    this.avatarError = '';
    this.removingAvatar = true;
    this.dataService.removeAvatar().subscribe({
      next: () => {
        this.previewUrl = null;
        this.uploadedFile = null;
        this.removingAvatar = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.avatarError = 'Failed to remove avatar';
        this.removingAvatar = false;
        this.cdr.detectChanges();
      },
    });
  }

  startEditingName(): void {
    this.nameBuffer = this.currentUser?.displayName ?? '';
    this.editingName = true;
    this.nameError = '';
  }

  cancelEditingName(): void {
    this.editingName = false;
    this.nameError = '';
  }

  saveDisplayName(): void {
    const name = this.nameBuffer.trim();
    if (!name || name === this.currentUser?.displayName || this.savingName) {
      this.editingName = false;
      return;
    }

    this.savingName = true;
    this.nameError = '';

    this.dataService.updateProfile(name).subscribe({
      next: (user) => {
        this.savingName = false;
        this.currentUser = user;
        this.editingName = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingName = false;
        this.nameError = err.error?.message || 'Failed to update display name';
        this.cdr.detectChanges();
      },
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.showOld = false;
      this.showNew = false;
      this.showConfirm = false;
      this.passwordError = '';
      this.passwordSuccess = '';
    }
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.newPassword.length < 8) {
      this.passwordError = 'Password must be at least 8 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Passwords do not match';
      return;
    }

    this.savingPassword = true;
    this.dataService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSuccess = 'Password updated successfully';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingPassword = false;
        if (err.status === 401) {
          this.passwordError = 'Current password is incorrect';
        } else {
          this.passwordError = err.error?.message || 'Failed to update password';
        }
        this.cdr.detectChanges();
      },
    });
  }
}
