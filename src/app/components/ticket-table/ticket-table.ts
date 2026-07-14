import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TicketDataService } from '../../services/ticket-data';
import { Ticket, STATUS_OPTIONS, SEVERITY_OPTIONS, SERVICE_OPTIONS, getSubCategoryOptions } from '../../models/ticket';
import { TicketDialog } from '../ticket-dialog/ticket-dialog';
import { CustomSelect } from '../custom-select/custom-select';

type SortField = 'id' | 'title' | 'service' | 'status' | 'severity' | 'dateReported';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-ticket-table',
  imports: [CommonModule, FormsModule, TicketDialog, CustomSelect],
  templateUrl: './ticket-table.html',
  styles: `
    .sidebar-overlay { transition: opacity 0.35s ease-out; }
    .sidebar-overlay.ng-enter { opacity: 0; }
    .sidebar-overlay.ng-enter-active { opacity: 1; }

    @media (max-width: 639px) {
      .sidebar-panel { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      .sidebar-panel.closed { transform: translateY(100%); }
      .sidebar-panel.open { transform: translateY(0); }
    }
    @media (min-width: 640px) {
      .sidebar-panel { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      .sidebar-panel.closed { transform: translateX(100%); }
      .sidebar-panel.open { transform: translateX(0); }
    }
  `,
})
export class TicketTable implements OnInit, OnDestroy, OnChanges {
  @Input() activeWorkspaceId: string | null = null;

  ngOnInit(): void {
    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  loadingTickets = false;

  filterStatus: string = '';
  filterSeverity: string = '';
  filterService: string = '';
  searchText: string = '';

  sortField: SortField = 'dateReported';
  sortDir: SortDir = 'desc';

  selectedTicket: Ticket | null = null;
  showDialog = false;
  sidebarOpen = false;
  sidebarClosing = false;
  editingTicket: Ticket | null = null;

  statusOptions = STATUS_OPTIONS;
  severityOptions = SEVERITY_OPTIONS;
  serviceOptions = SERVICE_OPTIONS;

  filterOpen = false;

  // Inline quick-edit state
  editingField: { ticketId: string; field: string; top: number; right: number; width: number } | null = null;

  private wsSub: Subscription | null = null;

  constructor(
    private dataService: TicketDataService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    // Reload tickets when workspace changes
    this.wsSub = this.dataService.activeWorkspaceChanged$.subscribe(() => {
      this.loadTickets();
    });
  }

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
    this.dataService.updateTicket(ws.id, updated).subscribe({
      next: () => {
        this.editingField = null;
        this.loadTickets();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Quick edit failed:', err);
        this.cdr.detectChanges();
      },
    });
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
      this.loadingTickets = false;
      return;
    }
    this.loadingTickets = true;
    this.dataService.getTickets(ws.id).subscribe({
      next: (list) => {
        this.tickets = list;
        this.loadingTickets = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingTickets = false;
        console.error('Failed to load tickets:', err);
        this.cdr.detectChanges();
      },
    });
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

    const severityWeight: Record<string, number> = {
      Critical: 4, High: 3, Medium: 2, Low: 1,
    };

    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortField === 'severity') {
        cmp = (severityWeight[a.severity] || 0) - (severityWeight[b.severity] || 0);
      } else {
        const af = a[this.sortField] as string;
        const bf = b[this.sortField] as string;
        if (af < bf) cmp = -1;
        if (af > bf) cmp = 1;
      }
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
    this.sidebarOpen = false;
    this.lockBodyScroll();
    this.cdr.detectChanges();
    requestAnimationFrame(() => {
      this.sidebarOpen = true;
      this.cdr.detectChanges();
    });
  }

  addTicket(): void {
    this.selectedTicket = null;
    this.editingTicket = null;
    this.showDialog = true;
    this.sidebarOpen = false;
    this.lockBodyScroll();
    this.cdr.detectChanges();
    requestAnimationFrame(() => {
      this.sidebarOpen = true;
      this.cdr.detectChanges();
    });
  }

  closeSidebar(): void {
    if (this.sidebarClosing) return;
    this.sidebarClosing = true;
    this.sidebarOpen = false;
    this.unlockBodyScroll();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showDialog = false;
      this.sidebarClosing = false;
      this.selectedTicket = null;
      this.editingTicket = null;
      this.cdr.detectChanges();
    }, 350);
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
  }

  onDialogClose(savedTicket?: Ticket | null): void {
    if (savedTicket) {
      const idx = this.tickets.findIndex(t => t.id === savedTicket.id);
      if (idx >= 0) {
        this.tickets[idx] = savedTicket;
      } else {
        this.tickets = [savedTicket, ...this.tickets];
      }
      this.applyFilters();
    }
    this.closeSidebar();
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
