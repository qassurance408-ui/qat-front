import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TicketDataService } from '../../services/ticket-data';
import { Workspace } from '../../models/ticket';

@Component({
  selector: 'app-workspace-selector',
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-selector.html',
  styles: ``,
})
export class WorkspaceSelector implements OnInit, OnDestroy {
  workspaces: Workspace[] = [];
  activeWorkspace: Workspace | null = null;

  showCreate = false;
  newWorkspaceName = '';

  showKebab = false;
  showSwitchSubmenu = false;
  showDeleteConfirm = false;

  private wsSub: Subscription | null = null;

  constructor(private dataService: TicketDataService, private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.loadWorkspaces();
    this.wsSub = this.dataService.activeWorkspaceChanged$.subscribe(() => {
      this.loadWorkspaces();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  loadWorkspaces(): void {
    this.workspaces = this.dataService.getWorkspaces();
    this.activeWorkspace = this.dataService.getActiveWorkspace();
  }

  toggleKebab(event?: MouseEvent): void {
    event?.stopPropagation();
    this.showKebab = !this.showKebab;
    this.showSwitchSubmenu = false;
  }

  openSwitchSubmenu(): void {
    this.showSwitchSubmenu = true;
  }

  goBackToMainMenu(): void {
    this.showSwitchSubmenu = false;
  }

  selectWorkspace(ws: Workspace): void {
    this.dataService.setActiveWorkspace(ws);
    this.activeWorkspace = ws;
    this.showKebab = false;
    this.showSwitchSubmenu = false;
  }

  openCreateDialog(): void {
    this.showKebab = false;
    this.showCreate = true;
    this.newWorkspaceName = '';
  }

  createWorkspace(): void {
    const name = this.newWorkspaceName.trim();
    if (!name) return;
    const ws = this.dataService.createWorkspace(name);
    this.dataService.setActiveWorkspace(ws);
    this.loadWorkspaces();
    this.newWorkspaceName = '';
    this.showCreate = false;
  }

  openDeleteConfirm(): void {
    this.showKebab = false;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.activeWorkspace) return;
    this.dataService.deleteWorkspace(this.activeWorkspace.id);
    this.showDeleteConfirm = false;
    this.loadWorkspaces();
  }

  goHome(): void {
    this.showKebab = false;
    this.dataService.setActiveWorkspace(null);
  }

  exportWorkspace(): void {
    this.showKebab = false;
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    const tickets = this.dataService.getTickets(ws.id);

    const exportData = {
      exportVersion: '1.0',
      exportTimestamp: new Date().toISOString(),
      workspaceName: ws.name,
      workspaceId: ws.id,
      totalTickets: tickets.length,
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        service: t.service,
        subCategory: t.subCategory,
        status: t.status,
        severity: t.severity,
        dateReported: t.dateReported,
        description: t.description,
        whatWasObserved: t.observed,
        stepsToReproduce: t.stepsToReproduce,
        expectedOutcome: t.expectedOutcome,
        actualOutcome: t.actualOutcome,
        possibleRootCause: t.rootCause,
        environmentConfig: t.environment,
        attachments: t.attachments.map(a => ({
          name: a.name,
          type: a.type,
          size: a.size,
          data: a.data
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-export-${ws.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showKebab) {
      const el = this.elementRef.nativeElement;
      if (!el.contains(event.target as Node)) {
        this.showKebab = false;
        this.showSwitchSubmenu = false;
      }
    }
  }
}
