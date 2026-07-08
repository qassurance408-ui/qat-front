import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketDataService } from '../../services/ticket-data';
import {
  Ticket, TicketAttachment, TicketStatus, TicketSeverity, ServiceCategory,
  STATUS_OPTIONS, SEVERITY_OPTIONS, SERVICE_OPTIONS,
  getSubCategoryOptions
} from '../../models/ticket';
import { CustomSelect } from '../custom-select/custom-select';

/** Generate a ticket ID in the format TK-{timestamp-base36}-{random}. */
function generateTicketId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `TK-${ts}-${rand}`;
}

@Component({
  selector: 'app-ticket-dialog',
  imports: [CommonModule, FormsModule, CustomSelect],
  templateUrl: './ticket-dialog.html',
  styles: ``,
})
export class TicketDialog implements OnInit {
  @Input() ticket: Ticket | null = null;
  @Output() close = new EventEmitter<void>();

  isEditing = false;
  isNew = false;
  saving = false;

  statusOptions = STATUS_OPTIONS;
  severityOptions = SEVERITY_OPTIONS;
  serviceOptions = SERVICE_OPTIONS;

  formTitle = '';
  formService: ServiceCategory = 'Other/Platform';
  formSubCategory = '';
  formStatus: TicketStatus = 'Open';
  formSeverity: TicketSeverity = 'Medium';
  formDescription = '';
  formObserved = '';
  formSteps = '';
  formExpected = '';
  formActual = '';
  formRootCause = '';
  formEnvironment = '';
  formAttachments: TicketAttachment[] = [];

  subCategoryOptions: string[] | null = null;
  errorMessage = '';
  headerScrolled = false;

  // Files queued for upload (not yet sent to server)
  pendingFiles: File[] = [];
  uploading = false;

  // The ticket ID we're creating / editing
  private editingTicketId: string | null = null;
  private editingDateReported: string | null = null;

  constructor(private dataService: TicketDataService, private cdr: ChangeDetectorRef) {}

  onDialogScroll(event: Event): void {
    const el = event.target as HTMLElement;
    this.headerScrolled = el.scrollTop > 80;
  }

  ngOnInit(): void {
    this.isNew = !this.ticket;
    this.isEditing = this.isNew;
    if (this.ticket) {
      this.editingTicketId = this.ticket.id;
      this.editingDateReported = this.ticket.dateReported;
      this.formTitle = this.ticket.title;
      this.formService = this.ticket.service;
      this.formSubCategory = this.ticket.subCategory;
      this.formStatus = this.ticket.status;
      this.formSeverity = this.ticket.severity;
      this.formDescription = this.ticket.description;
      this.formObserved = this.ticket.observed;
      this.formSteps = this.ticket.stepsToReproduce;
      this.formExpected = this.ticket.expectedOutcome;
      this.formActual = this.ticket.actualOutcome;
      this.formRootCause = this.ticket.rootCause;
      this.formEnvironment = this.ticket.environment;
      this.formAttachments = [...(this.ticket.attachments || [])];
    }
    this.onServiceChange();
  }

  onServiceChange(): void {
    this.subCategoryOptions = getSubCategoryOptions(this.formService);
    if (!this.subCategoryOptions) {
      this.formSubCategory = '';
    } else if (!this.subCategoryOptions.includes(this.formSubCategory)) {
      this.formSubCategory = '';
    }
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    if (this.isNew || !this.isEditing) {
      this.close.emit();
      return;
    }
    this.ngOnInit();
    this.isEditing = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    // Queue files for upload on save (we need a ticket ID first)
    for (let i = 0; i < input.files.length; i++) {
      this.pendingFiles.push(input.files[i]);
    }
    input.value = '';
    this.errorMessage = '';
  }

  removeAttachment(index: number): void {
    const att = this.formAttachments[index];
    if (!att) return;

    // If attachment has an ID, delete it from server
    const ws = this.dataService.getActiveWorkspace();
    if (ws && att.id && this.editingTicketId) {
      this.dataService.deleteAttachment(ws.id, this.editingTicketId, att.id).subscribe({
        error: (err) => console.error('Failed to delete attachment:', err),
      });
    }

    // Remove from local list
    this.formAttachments.splice(index, 1);

    // Also remove from pending files if it was a pending upload
    if (!att.id) {
      const pendingIdx = this.pendingFiles.findIndex(f => f.name === att.name);
      if (pendingIdx >= 0) this.pendingFiles.splice(pendingIdx, 1);
    }
  }

  saveTicket(): void {
    if (!this.formTitle.trim()) return;

    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    this.saving = true;
    this.errorMessage = '';

    const ticketPayload = {
      id: this.isNew ? generateTicketId() : (this.editingTicketId || generateTicketId()),
      title: this.formTitle.trim(),
      service: this.formService,
      subCategory: this.formSubCategory,
      status: this.formStatus,
      severity: this.formSeverity,
      dateReported: this.editingDateReported || new Date().toISOString(),
      description: this.formDescription,
      observed: this.formObserved,
      stepsToReproduce: this.formSteps,
      expectedOutcome: this.formExpected,
      actualOutcome: this.formActual,
      rootCause: this.formRootCause,
      environment: this.formEnvironment,
    };

    const action$ = this.isNew
      ? this.dataService.createTicket(ws.id, ticketPayload)
      : this.dataService.updateTicket(ws.id, { ...ticketPayload as any, attachments: this.formAttachments });

    action$.subscribe({
      next: (saved) => {
        this.editingTicketId = saved.id;
        this.editingDateReported = saved.dateReported;

        // Upload any pending files
        if (this.pendingFiles.length > 0) {
          this.uploading = true;
          this.dataService.uploadAttachments(ws.id, saved.id, this.pendingFiles).subscribe({
            next: (uploadedAtts) => {
              this.formAttachments = [...this.formAttachments.filter(a => a.id), ...uploadedAtts];
              this.pendingFiles = [];
              this.uploading = false;
              this.saving = false;
              this.close.emit();
            },
            error: (err) => {
              this.uploading = false;
              this.saving = false;
              this.errorMessage = 'Ticket saved but some files failed to upload.';
              console.error('File upload failed:', err);
              this.close.emit();
            },
          });
        } else {
          this.saving = false;
          this.close.emit();
        }
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.error?.message || 'Failed to save ticket. Please try again.';
        console.error('Save ticket failed:', err);
      },
    });
  }

  showDeleteConfirm = false;

  deleteTicket(): void {
    if (!this.ticket) return;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.ticket) return;
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    this.dataService.deleteTicket(ws.id, this.ticket.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.close.emit();
      },
      error: (err) => console.error('Delete failed:', err),
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
