import { Component, Output, EventEmitter, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketDataService } from '../../services/ticket-data';
import { AuthUser } from '../../services/ticket-data';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-settings.html',
  styles: ``,
})
export class AccountSettingsDialog {
  @Output() closeDialog = new EventEmitter<void>();
  @Output() displayNameChanged = new EventEmitter<string>();
  @Output() avatarChanged = new EventEmitter<string | null>();

  currentUser: AuthUser | null = null;

  previewUrl: string | null = null;
  uploadedFile: File | null = null;
  avatarError = '';

  displayName = '';
  displayNameError = '';
  displayNameSuccess = '';
  savingDisplayName = false;

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';
  savingPassword = false;

  constructor(
    private dataService: TicketDataService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    this.currentUser = this.dataService.currentUser$.value;
    if (this.currentUser?.avatarUrl) {
      this.previewUrl = this.currentUser.avatarUrl;
    }
    this.displayName = this.currentUser?.displayName ?? '';
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
    this.uploadedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.uploadAvatar(file);
  }

  private uploadAvatar(file: File): void {
    this.dataService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.uploadedFile = null;
        this.avatarChanged.emit(res.avatarUrl);
        this.cdr.detectChanges();
      },
      error: (err) => {
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
    this.dataService.removeAvatar().subscribe({
      next: () => {
        this.previewUrl = null;
        this.uploadedFile = null;
        this.avatarChanged.emit(null);
        this.cdr.detectChanges();
      },
      error: () => {
        this.avatarError = 'Failed to remove avatar';
        this.cdr.detectChanges();
      },
    });
  }

  saveDisplayName(): void {
    const name = this.displayName.trim();
    if (!name || name === this.currentUser?.displayName || this.savingDisplayName) return;

    this.savingDisplayName = true;
    this.displayNameError = '';
    this.displayNameSuccess = '';

    this.dataService.updateProfile(name).subscribe({
      next: (user) => {
        this.savingDisplayName = false;
        this.currentUser = user;
        this.displayNameSuccess = 'Display name updated';
        this.displayNameChanged.emit(user.displayName);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingDisplayName = false;
        this.displayNameError = err.error?.message || 'Failed to update display name';
        this.cdr.detectChanges();
      },
    });
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

  close(): void {
    this.closeDialog.emit();
  }

  backdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fixed')) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
