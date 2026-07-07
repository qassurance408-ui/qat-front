import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketDataService } from '../../services/ticket-data';
import { Ticket, STATUS_OPTIONS, SEVERITY_OPTIONS, SERVICE_OPTIONS, getSubCategoryOptions } from '../../models/ticket';
import { TicketDialog } from '../ticket-dialog/ticket-dialog';
import { CustomSelect } from '../custom-select/custom-select';

type SortField = 'id' | 'title' | 'service' | 'subCategory' | 'status' | 'severity' | 'dateReported';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-ticket-table',
  imports: [CommonModule, FormsModule, TicketDialog, CustomSelect],
  templateUrl: './ticket-table.html',
  styles: ``,
})
export class TicketTable implements OnInit, OnChanges {
  @Input() activeWorkspaceId: string | null = null;

  ngOnInit(): void {
    this.loadTickets();
  }

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];

  filterStatus: string = '';
  filterSeverity: string = '';
  filterService: string = '';
  searchText: string = '';

  sortField: SortField = 'dateReported';
  sortDir: SortDir = 'desc';

  selectedTicket: Ticket | null = null;
  showDialog = false;
  editingTicket: Ticket | null = null;

  statusOptions = STATUS_OPTIONS;
  severityOptions = SEVERITY_OPTIONS;
  serviceOptions = SERVICE_OPTIONS;

  filterOpen = false;

  // Inline quick-edit state
  editingField: { ticketId: string; field: string; top: number; right: number; width: number } | null = null;

  constructor(private dataService: TicketDataService, private elementRef: ElementRef) {}

  startQuickEdit(t: Ticket, field: string, event: MouseEvent): void {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.editingField = {
      ticketId: t.id,
      field,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      width: Math.max(rect.width, 180)
    };
  }

  quickEditValue(t: Ticket, field: string, value: string): void {
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;
    const updated = { ...t, [field]: value };
    this.dataService.updateTicket(ws.id, updated);
    this.editingField = null;
    this.loadTickets();
  }

  cancelQuickEdit(): void {
    this.editingField = null;
  }

  getQuickEditOptions(t: Ticket, field: string): string[] {
    if (field === 'status') return STATUS_OPTIONS;
    if (field === 'severity') return SEVERITY_OPTIONS;
    if (field === 'service') return SERVICE_OPTIONS;
    if (field === 'subCategory') {
      const opts = getSubCategoryOptions(t.service);
      return opts || [];
    }
    return [];
  }

  toggleFilter(): void {
    this.filterOpen = !this.filterOpen;
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterSeverity = '';
    this.filterService = '';
    this.applyFilters();
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filterStatus) count++;
    if (this.filterSeverity) count++;
    if (this.filterService) count++;
    return count;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.filterOpen) {
      const el = this.elementRef.nativeElement;
      if (!el.contains(event.target as Node)) {
        this.filterOpen = false;
      }
    }
    if (this.editingField) {
      const target = event.target as HTMLElement;
      if (!target.closest('.quick-edit-dropdown') && !target.closest('.quick-edit-trigger')) {
        this.editingField = null;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeWorkspaceId']) {
      this.loadTickets();
    }
  }

  loadTickets(): void {
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) {
      this.tickets = [];
      this.filteredTickets = [];
      return;
    }
    this.tickets = this.dataService.getTickets(ws.id);
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.tickets];

    if (this.filterStatus) {
      result = result.filter(t => t.status === this.filterStatus);
    }
    if (this.filterSeverity) {
      result = result.filter(t => t.severity === this.filterSeverity);
    }
    if (this.filterService) {
      result = result.filter(t => t.service === this.filterService);
    }
    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      const af = a[this.sortField];
      const bf = b[this.sortField];
      if (af < bf) cmp = -1;
      if (af > bf) cmp = 1;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredTickets = result;
  }

  setSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applyFilters();
  }

  viewTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.editingTicket = null;
    this.showDialog = true;
  }

  addTicket(): void {
    this.selectedTicket = null;
    this.editingTicket = null;
    this.showDialog = true;
  }

  onDialogClose(): void {
    this.showDialog = false;
    this.selectedTicket = null;
    this.editingTicket = null;
    this.loadTickets();
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
