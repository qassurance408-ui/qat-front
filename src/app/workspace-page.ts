import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
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
  activeWorkspaceRole: 'OWNER' | 'MEMBER' | null = null;
  workspaces: Workspace[] = [];
  loading = true;

  renameError = '';

  editingWorkspaceName = false;
  editWorkspaceNameBuffer = '';

  showCreateOnLanding = false;
  newWorkspaceName = '';
  creatingWorkspace = false;

  @ViewChild('nameInput') nameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('createNameInput') createNameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('joinInput') joinInputRef: ElementRef<HTMLInputElement> | null = null;

  showJoinDialog = false;
  joinInviteCode = '';
  joining = false;
  joinError = '';
  joinSuccess = '';

  private wsSub: Subscription | null = null;
  private subs: Subscription[] = [];

  constructor(
    private dataService: TicketDataService,
    private router: Router,
    private cdr: ChangeDetectorRef,
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
    this.activeWorkspaceRole = stored?.role ?? null;
    this.showCreateOnLanding = false;

    // Fetch workspaces from server and update local cache
    this.dataService.getWorkspaces().subscribe({
      next: (list) => {
        try {
          this.workspaces = list.map(w => ({
            id: w.id,
            name: w.name,
            createdAt: w.createdAt,
            ownerId: w.ownerId,
            role: w.role,
          }));

          // If we have a stored active workspace, refresh its name from server data
          if (stored) {
            const match = list.find(w => w.id === stored.id);
            if (match) {
              this.activeWorkspaceName = match.name;
              this.activeWorkspaceRole = match.role;
              // Silently update localStorage without emitting (avoids infinite loop)
              this.dataService.refreshActiveWorkspaceName(match.name);
            } else {
              // Stored workspace no longer exists on server — go to landing
              this.dataService.setActiveWorkspace(null);
              this.hasActiveWorkspace = false;
              this.activeWorkspaceId = null;
              this.activeWorkspaceName = null;
              this.activeWorkspaceRole = null;
            }
          }
        } catch (e) {
          console.error('Error processing workspaces:', e);
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed to fetch workspaces:', err);
        this.loading = false;
        this.cdr.detectChanges();
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
    if (!name || this.creatingWorkspace) return;

    this.creatingWorkspace = true;
    const id = generateWorkspaceId();

    this.dataService.createWorkspace(id, name).subscribe({
      next: (ws) => {
        this.creatingWorkspace = false;
        this.dataService.setActiveWorkspace({
          id: ws.id,
          name: ws.name,
          createdAt: ws.createdAt,
          ownerId: ws.ownerId,
          role: ws.role,
        });
        this.showCreateOnLanding = false;
        this.newWorkspaceName = '';
      },
      error: (err) => {
        this.creatingWorkspace = false;
        console.error('Failed to create workspace:', err);
      },
    });
  }

  openJoinOnLanding(): void {
    this.showJoinDialog = true;
    this.joinInviteCode = '';
    this.joinError = '';
    this.joinSuccess = '';
    setTimeout(() => this.joinInputRef?.nativeElement?.focus(), 0);
  }

  closeJoinDialog(): void {
    this.showJoinDialog = false;
    this.joinInviteCode = '';
    this.joinError = '';
    this.joinSuccess = '';
  }

  joinWorkspaceFromLanding(): void {
    const code = this.joinInviteCode.trim();
    if (!code || this.joining) return;

    this.joining = true;
    this.joinError = '';
    this.joinSuccess = '';

    this.dataService.joinWorkspace(code).subscribe({
      next: (ws) => {
        this.joining = false;
        this.joinSuccess = `Joined "${ws.name}" successfully!`;
        this.cdr.detectChanges();
        this.syncAll();
        setTimeout(() => {
          this.closeJoinDialog();
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        this.joining = false;
        if (err.status === 404) {
          this.joinError = 'Invalid invite code — workspace not found.';
        } else if (err.status === 409) {
          this.joinError = 'You are already a member of this workspace.';
        } else {
          this.joinError = 'Failed to join workspace. Please check the invite code and try again.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  startEditingWorkspaceName(): void {
    this.renameError = '';
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
          this.renameError = '';
          this.activeWorkspaceName = name;
          const stored = this.dataService.getActiveWorkspace();
          if (stored) {
            stored.name = name;
            this.dataService.setActiveWorkspace(stored);
          }
          this.editingWorkspaceName = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.renameError = err.status === 403
            ? 'Only the workspace owner can rename this workspace.'
            : 'Failed to rename workspace. Please try again.';
          this.cdr.detectChanges();
        },
      });
    } else {
      this.editingWorkspaceName = false;
    }
  }

  cancelEditingWorkspaceName(): void {
    this.renameError = '';
    this.editingWorkspaceName = false;
  }
}
