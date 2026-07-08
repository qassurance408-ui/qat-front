import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { WorkspaceSelector } from './components/workspace-selector/workspace-selector';
import { TicketTable } from './components/ticket-table/ticket-table';
import { TicketDataService } from './services/ticket-data';
import { Workspace } from './models/ticket';

/** Generate a workspace ID in the format ws-{timestamp-base36}-{random}. */
function generateWorkspaceId(): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `ws-${ts}-${rand}`;
}

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WorkspaceSelector,
    TicketTable,
  ],
  templateUrl: './workspace-page.html',
  styles: ``,
})
export class WorkspacePage implements OnInit, OnDestroy {
  hasActiveWorkspace = false;
  activeWorkspaceId: string | null = null;
  activeWorkspaceName: string | null = null;
  workspaces: Workspace[] = [];
  loading = true;

  editingWorkspaceName = false;
  editWorkspaceNameBuffer = '';

  showCreateOnLanding = false;
  newWorkspaceName = '';

  @ViewChild('nameInput') nameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('createNameInput') createNameInputRef: ElementRef<HTMLInputElement> | null = null;

  private wsSub: Subscription | null = null;
  private subs: Subscription[] = [];

  constructor(
    private dataService: TicketDataService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.syncAll();

    this.wsSub = this.dataService.activeWorkspaceChanged$.subscribe(() => {
      this.syncAll();
    });

    // Subscribe to auth state — redirect to login only on mid-session logout.
    this.subs.push(
      this.dataService.currentUser$.pipe(skip(1)).subscribe(user => {
        if (!user) {
          this.router.navigateByUrl('/login');
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.subs.forEach(s => s.unsubscribe());
  }

  private syncAll(): void {
    const stored = this.dataService.getActiveWorkspace();
    this.hasActiveWorkspace = stored !== null;
    this.activeWorkspaceId = stored?.id ?? null;
    this.activeWorkspaceName = stored?.name ?? null;
    this.showCreateOnLanding = false;

    // Fetch workspaces from server and update local cache
    this.dataService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list.map(w => ({
          id: w.id,
          name: w.name,
          createdAt: w.createdAt,
        }));

        // If we have a stored active workspace, refresh its name from server data
        if (stored) {
          const match = list.find(w => w.id === stored.id);
          if (match) {
            this.activeWorkspaceName = match.name;
            // Silently update localStorage without emitting (avoids infinite loop)
            this.dataService.refreshActiveWorkspaceName(match.name);
          } else {
            // Stored workspace no longer exists on server — go to landing
            this.dataService.setActiveWorkspace(null);
            this.hasActiveWorkspace = false;
            this.activeWorkspaceId = null;
            this.activeWorkspaceName = null;
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  selectWorkspace(ws: Workspace): void {
    this.dataService.setActiveWorkspace(ws);
  }

  openCreateOnLanding(): void {
    this.showCreateOnLanding = true;
    this.newWorkspaceName = '';
    setTimeout(() => this.createNameInputRef?.nativeElement?.focus(), 0);
  }

  createWorkspaceFromLanding(): void {
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
        this.showCreateOnLanding = false;
        this.newWorkspaceName = '';
      },
      error: (err) => {
        console.error('Failed to create workspace:', err);
      },
    });
  }

  startEditingWorkspaceName(): void {
    this.editWorkspaceNameBuffer = this.activeWorkspaceName ?? '';
    this.editingWorkspaceName = true;
    setTimeout(() => this.nameInputRef?.nativeElement?.focus(), 0);
  }

  saveWorkspaceName(): void {
    if (!this.editingWorkspaceName || !this.activeWorkspaceId) return;
    const name = this.editWorkspaceNameBuffer.trim();
    if (name && name !== this.activeWorkspaceName) {
      this.dataService.renameWorkspace(this.activeWorkspaceId, name).subscribe({
        next: () => {
          this.activeWorkspaceName = name;
          // Update stored active workspace name
          const stored = this.dataService.getActiveWorkspace();
          if (stored) {
            stored.name = name;
            this.dataService.setActiveWorkspace(stored);
          }
        },
        error: (err) => console.error('Failed to rename workspace:', err),
      });
    }
    this.editingWorkspaceName = false;
  }

  cancelEditingWorkspaceName(): void {
    this.editingWorkspaceName = false;
  }
}
