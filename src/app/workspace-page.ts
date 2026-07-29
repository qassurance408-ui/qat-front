import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { WorkspaceSelector } from './components/workspace-selector/workspace-selector';
import { TicketTable } from './components/ticket-table/ticket-table';
import { ActivityFeed } from './components/activity-feed/activity-feed';
import { TicketDataService, AuthUser } from './services/ticket-data';
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
    ActivityFeed,
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

  toastMessage = '';
  showToast = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  editingWorkspaceName = false;
  editWorkspaceNameBuffer = '';

  showCreateOnLanding = false;
  newWorkspaceName = '';
  creatingWorkspace = false;

  @ViewChild('nameInput') nameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('createNameInput') createNameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('joinInput') joinInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('avatarContainer') avatarContainerRef: ElementRef | null = null;

  // ── Avatar dropdown ──────────────────────────────────────────────────────
  showAvatarDropdown = false;
  currentUser: AuthUser | null = null;

  get avatarInitial(): string {
    return (this.currentUser?.displayName?.charAt(0) || '?').toUpperCase();
  }

  showJoinDialog = false;
  joinInviteCode = '';
  joining = false;
  joinError = '';
  joinSuccess = '';

  private routeWorkspaceId: string | null = null;
  private subs: Subscription[] = [];

  constructor(
    private dataService: TicketDataService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Track current user for avatar display
    this.currentUser = this.dataService.currentUser$.value;
    this.subs.push(
      this.dataService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.cdr.detectChanges();
      }),
    );

    // Redirect to login only on mid-session logout (skip initial null)
    this.subs.push(
      this.dataService.currentUser$.pipe(skip(1)).subscribe(user => {
        if (!user) {
          this.router.navigateByUrl('/login');
        }
      }),
    );

    // The URL is the source of truth for the active workspace.
    this.subs.push(
      this.route.paramMap.subscribe(params => {
        this.routeWorkspaceId = params.get('workspaceId');
        this.resolveWorkspace();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /**
   * Resolve the active workspace from the current route param:
   * a valid /w/:id sets it active, an unknown id redirects home, and
   * / (no param) shows the workspace picker.
   */
  private resolveWorkspace(): void {
    const id = this.routeWorkspaceId;
    this.loading = true;
    this.showCreateOnLanding = false;

    this.dataService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list.map(w => ({
          id: w.id,
          name: w.name,
          createdAt: w.createdAt,
          ownerId: w.ownerId,
          role: w.role,
        }));

        if (id) {
          const match = this.workspaces.find(w => w.id === id);
          if (match) {
            // Sync the service (localStorage + emit) so child components load it.
            this.dataService.setActiveWorkspace(match);
            this.hasActiveWorkspace = true;
            this.activeWorkspaceId = match.id;
            this.activeWorkspaceName = match.name;
            this.activeWorkspaceRole = match.role ?? null;
          } else {
            // Not a member / stale id — go home.
            this.dataService.setActiveWorkspace(null);
            this.router.navigate(['/']);
            return;
          }
        } else {
          // Home picker.
          this.dataService.setActiveWorkspace(null);
          this.hasActiveWorkspace = false;
          this.activeWorkspaceId = null;
          this.activeWorkspaceName = null;
          this.activeWorkspaceRole = null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to fetch workspaces:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectWorkspace(ws: Workspace): void {
    this.router.navigate(['/w', ws.id]);
  }

  goHome(): void {
    this.router.navigate(['/']);
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
        this.showCreateOnLanding = false;
        this.newWorkspaceName = '';
        this.router.navigate(['/w', ws.id]);
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
        setTimeout(() => {
          this.closeJoinDialog();
          this.router.navigate(['/w', ws.id]);
        }, 1200);
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

  private showToastMessage(msg: string): void {
    this.toastMessage = msg;
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.showToast = false; this.cdr.detectChanges(); }, 4000);
  }

  dismissToast(): void {
    this.showToast = false;
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
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
          const stored = this.dataService.getActiveWorkspace();
          if (stored) {
            stored.name = name;
            this.dataService.setActiveWorkspace(stored);
          }
          this.editingWorkspaceName = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.editingWorkspaceName = false;
          this.showToastMessage(
            err.status === 403
              ? 'Only the workspace owner can rename this workspace.'
              : 'Failed to rename workspace. Please try again.',
          );
          this.cdr.detectChanges();
        },
      });
    } else {
      this.editingWorkspaceName = false;
    }
  }

  cancelEditingWorkspaceName(): void {
    this.editingWorkspaceName = false;
  }

  // ── Avatar dropdown ────────────────────────────────────────────────────

  toggleAvatarDropdown(): void {
    this.showAvatarDropdown = !this.showAvatarDropdown;
  }

  onAvatarError(): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, avatarUrl: null };
      this.cdr.detectChanges();
    }
  }

  // ── Account Settings ───────────────────────────────────────────────────

  goToAccountSettings(): void {
    this.showAvatarDropdown = false;
    this.router.navigateByUrl('/account-settings');
  }

  // ── Logout ─────────────────────────────────────────────────────────────

  logout(): void {
    this.showAvatarDropdown = false;
    this.dataService.logout().subscribe({
      next: () => {
        this.dataService.setActiveWorkspace(null);
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.dataService.setActiveWorkspace(null);
        this.router.navigateByUrl('/login');
      },
    });
  }

  // ── Click outside handler ──────────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showAvatarDropdown) {
      const el = this.avatarContainerRef?.nativeElement;
      if (el && !el.contains(event.target as Node)) {
        this.showAvatarDropdown = false;
        this.cdr.detectChanges();
      }
    }
  }
}
