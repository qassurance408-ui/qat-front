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
  storageWarning = '';
  headerScrolled = false;

  constructor(private dataService: TicketDataService, private cdr: ChangeDetectorRef) {}

  onDialogScroll(event: Event): void {
    const el = event.target as HTMLElement;
    // Toggle after ~80px of scroll (past the title field)
    this.headerScrolled = el.scrollTop > 80;
  }

  ngOnInit(): void {
    this.isNew = !this.ticket;
    this.isEditing = this.isNew;
    if (this.ticket) {
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
    // Reset form to original ticket values
    this.ngOnInit();
    this.isEditing = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    const existingTickets = this.dataService.getTickets(ws.id);
    let currentSize = 0;
    this.formAttachments.forEach(a => currentSize += a.size);
    const existingAttachmentsSize = currentSize;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      if (file.size > 500 * 1024) {
        this.storageWarning = `File "${file.name}" exceeds 500KB limit and was not added.`;
        continue;
      }
      this.storageWarning = '';
      this.convertToBase64(file).then(base64 => {
        const attachment: TicketAttachment = {
          name: file.name,
          type: file.type,
          data: base64,
          size: file.size
        };
        this.formAttachments.push(attachment);
        this.cdr.detectChanges();
      });
    }
    // Reset input
    input.value = '';
  }

  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result as string));
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsDataURL(file);
    });
  }

  removeAttachment(index: number): void {
    this.formAttachments.splice(index, 1);
  }

  saveTicket(): void {
    if (!this.formTitle.trim()) return;

    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    const ticketData = {
      title: this.formTitle.trim(),
      service: this.formService,
      subCategory: this.formSubCategory,
      status: this.formStatus,
      severity: this.formSeverity,
      description: this.formDescription,
      observed: this.formObserved,
      stepsToReproduce: this.formSteps,
      expectedOutcome: this.formExpected,
      actualOutcome: this.formActual,
      rootCause: this.formRootCause,
      environment: this.formEnvironment,
      attachments: this.formAttachments
    };

    // Estimate storage needed
    const serialized = JSON.stringify(ticketData);
    const check = this.dataService.isStorageSafe(serialized.length);
    if (!check.safe) {
      this.storageWarning = check.message;
      return;
    }

    if (this.isNew) {
      this.dataService.createTicket(ws.id, ticketData);
    } else if (this.ticket) {
      this.dataService.updateTicket(ws.id, { ...ticketData, id: this.ticket.id, dateReported: this.ticket.dateReported });
    }

    this.close.emit();
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
    this.dataService.deleteTicket(ws.id, this.ticket.id);
    this.showDeleteConfirm = false;
    this.close.emit();
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
