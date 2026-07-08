import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TicketDataService } from '../../services/ticket-data';
import { Workspace } from '../../models/ticket';

/** Generate a workspace ID in the format ws-{timestamp-base36}-{random}. */
function generateWorkspaceId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `ws-${ts}-${rand}`;
}

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
    this.activeWorkspace = this.dataService.getActiveWorkspace();
    this.dataService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list.map(w => ({
          id: w.id,
          name: w.name,
          createdAt: w.createdAt,
        }));
      },
    });
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

    const id = generateWorkspaceId();

    this.dataService.createWorkspace(id, name).subscribe({
      next: (ws) => {
        this.dataService.setActiveWorkspace({
          id: ws.id,
          name: ws.name,
          createdAt: ws.createdAt,
        });
        this.loadWorkspaces();
        this.newWorkspaceName = '';
        this.showCreate = false;
      },
      error: (err) => console.error('Failed to create workspace:', err),
    });
  }

  openDeleteConfirm(): void {
    this.showKebab = false;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.activeWorkspace) return;
    this.dataService.deleteWorkspace(this.activeWorkspace.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.loadWorkspaces();
      },
      error: (err) => console.error('Failed to delete workspace:', err),
    });
  }

  goHome(): void {
    this.showKebab = false;
    this.dataService.setActiveWorkspace(null);
  }

  exportWorkspace(): void {
    this.showKebab = false;
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) return;

    this.dataService.exportWorkspace(ws.id).subscribe({
      next: (blob) => {
        const safeName = ws.name.replace(/[^a-zA-Z0-9\-_ ]/g, '').replace(/\s+/g, '-').toLowerCase();
        const dateStr = new Date().toISOString().split('T')[0];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qa-export-${safeName}-${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Export failed:', err),
    });
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
