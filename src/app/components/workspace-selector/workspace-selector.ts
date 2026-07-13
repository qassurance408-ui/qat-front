import { Component, OnInit, OnDestroy, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TicketDataService } from '../../services/ticket-data';
import { Workspace } from '../../models/ticket';

interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
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
  loading = true;

  showKebab = false;
  showSwitchSubmenu = false;
  showDeleteConfirm = false;

  // ── Invite dialog ───────────────────────────────────────────────────────
  showInviteDialog = false;
  inviteCode = '';
  copyingInvite = false;
  regeneratingInvite = false;
  inviteCopied = false;

  // ── Members dialog ──────────────────────────────────────────────────────
  showMembersDialog = false;
  members: WorkspaceMember[] = [];
  membersLoading = false;
  removingMemberId: string | null = null;
  confirmRemoveMember: WorkspaceMember | null = null;

  private wsSub: Subscription | null = null;

  constructor(
    private dataService: TicketDataService,
    private elementRef: ElementRef,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

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
          ownerId: w.ownerId,
          role: w.role,
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Find the current user's role from the workspace list. */
  get currentRole(): 'OWNER' | 'MEMBER' | null {
    if (!this.activeWorkspace) return null;
    const match = this.workspaces.find(w => w.id === this.activeWorkspace!.id);
    return match?.role ?? null;
  }

  get isOwner(): boolean {
    return this.currentRole === 'OWNER';
  }

  toggleKebab(): void {
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

  // ── Leave workspace ─────────────────────────────────────────────────────

  leaveWorkspace(): void {
    if (!this.activeWorkspace || !this.dataService.currentUser$.value) return;
    this.showKebab = false;

    this.dataService.removeMember(this.activeWorkspace.id, this.dataService.currentUser$.value.id).subscribe({
      next: () => {
        const stored = this.dataService.getActiveWorkspace();
        if (stored && stored.id === this.activeWorkspace!.id) {
          this.dataService.setActiveWorkspace(null);
        }
        this.loadWorkspaces();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to leave workspace:', err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Delete workspace ────────────────────────────────────────────────────

  openDeleteConfirm(): void {
    this.showKebab = false;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.activeWorkspace) return;
    this.dataService.deleteWorkspace(this.activeWorkspace.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.dataService.setActiveWorkspace(null);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete workspace:', err);
        this.cdr.detectChanges();
      },
    });
  }

  goHome(): void {
    this.showKebab = false;
    this.dataService.setActiveWorkspace(null);
  }

  // ── Export ──────────────────────────────────────────────────────────────

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

  // ── Invite / Share ──────────────────────────────────────────────────────

  openInviteDialog(): void {
    this.showKebab = false;
    this.inviteCopied = false;
    if (!this.activeWorkspace) return;
    // Fetch fresh workspace details to get the latest invite code
    this.dataService.getWorkspace(this.activeWorkspace.id).subscribe({
      next: (ws) => {
        this.inviteCode = ws.inviteCode;
        this.showInviteDialog = true;
        this.cdr.detectChanges();
      },
      error: () => {
        const match = this.workspaces.find(w => w.id === this.activeWorkspace!.id);
        this.inviteCode = 'Unable to retrieve invite code';
        this.showInviteDialog = true;
        this.cdr.detectChanges();
      },
    });
  }

  closeInviteDialog(): void {
    this.showInviteDialog = false;
    this.inviteCopied = false;
  }

  copyInviteCode(): void {
    if (!this.inviteCode) return;
    navigator.clipboard.writeText(this.inviteCode).then(() => {
      this.inviteCopied = true;
      this.copyingInvite = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.inviteCopied = false;
        this.cdr.detectChanges();
      }, 2000);
    }).catch(() => {
      this.copyingInvite = false;
      this.cdr.detectChanges();
    });
  }

  regenerateInvite(): void {
    if (!this.activeWorkspace || this.regeneratingInvite) return;
    this.regeneratingInvite = true;
    this.dataService.regenerateInviteCode(this.activeWorkspace.id).subscribe({
      next: (res) => {
        this.inviteCode = res.inviteCode;
        this.regeneratingInvite = false;
        this.inviteCopied = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.regeneratingInvite = false;
        console.error('Failed to regenerate invite code:', err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Members ─────────────────────────────────────────────────────────────

  openMembersDialog(): void {
    this.showKebab = false;
    if (!this.activeWorkspace) return;
    this.showMembersDialog = true;
    this.membersLoading = true;
    this.dataService.getWorkspaceMembers(this.activeWorkspace.id).subscribe({
      next: (members) => {
        this.members = members;
        this.membersLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.membersLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeMembersDialog(): void {
    this.showMembersDialog = false;
    this.removingMemberId = null;
    this.confirmRemoveMember = null;
  }

  openRemoveConfirm(member: WorkspaceMember): void {
    this.confirmRemoveMember = member;
  }

  cancelRemoveConfirm(): void {
    this.confirmRemoveMember = null;
  }

  confirmRemoveMemberAction(): void {
    if (!this.activeWorkspace || !this.confirmRemoveMember || this.removingMemberId) return;
    const userId = this.confirmRemoveMember.userId;
    this.removingMemberId = userId;
    this.confirmRemoveMember = null;
    this.dataService.removeMember(this.activeWorkspace.id, userId).subscribe({
      next: () => {
        this.members = this.members.filter(m => m.userId !== userId);
        this.removingMemberId = null;
        this.loadWorkspaces();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.removingMemberId = null;
        console.error('Failed to remove member:', err);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────

  logout(): void {
    this.showKebab = false;
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

  // ── Click outside handler ───────────────────────────────────────────────

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
