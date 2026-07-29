import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ElementRef, HostListener, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketDataService, ActivityItem, OnlineUser } from '../../services/ticket-data';

@Component({
  selector: 'app-activity-feed',
  imports: [CommonModule],
  templateUrl: './activity-feed.html',
  styles: `
    .activity-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
    .activity-scroll::-webkit-scrollbar { width: 6px; }
    .activity-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; }
    .activity-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
    .activity-scroll::-webkit-scrollbar-track { background: transparent; }
  `,
})
export class ActivityFeed implements OnChanges, OnDestroy {
  @Input() activeWorkspaceId: string | null = null;

  open = false;
  activities: ActivityItem[] = [];
  online: OnlineUser[] = [];
  loaded = false;

  /** Timestamp (ms) of the newest activity the user has seen, per workspace. */
  private lastSeen = 0;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_MS = 30000;

  constructor(
    private dataService: TicketDataService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeWorkspaceId']) {
      this.stopPolling();
      this.activities = [];
      this.online = [];
      this.loaded = false;
      if (this.activeWorkspaceId) {
        this.lastSeen = Number(localStorage.getItem(this.seenKey()) || 0);
        this.poll();
        this.pollTimer = setInterval(() => this.poll(), this.POLL_MS);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Fetch activity + presence. Also serves as the presence heartbeat. */
  private poll(): void {
    const wsId = this.activeWorkspaceId;
    if (!wsId) return;
    this.dataService.getActivity(wsId).subscribe({
      next: (res) => {
        this.activities = res.activities;
        this.online = res.online;
        this.loaded = true;
        // If the panel is open while polling, keep everything marked as seen.
        if (this.open) this.markSeen();
        this.cdr.detectChanges();
      },
      error: () => {
        // Ignore transient poll failures; keep the last known state.
      },
    });
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) this.markSeen();
  }

  private seenKey(): string {
    return `qat_activity_seen_${this.activeWorkspaceId}`;
  }

  /** Mark the currently-loaded activity as seen (clears the unseen badge). */
  private markSeen(): void {
    if (!this.activeWorkspaceId || this.activities.length === 0) return;
    const newest = Math.max(...this.activities.map((a) => new Date(a.createdAt).getTime()));
    if (newest > this.lastSeen) {
      this.lastSeen = newest;
      localStorage.setItem(this.seenKey(), String(newest));
    }
  }

  /** Count of recent activity newer than last-seen, excluding the user's own. */
  get unseenCount(): number {
    const me = this.dataService.currentUser$.value?.id ?? null;
    return this.activities.filter(
      (a) => new Date(a.createdAt).getTime() > this.lastSeen && a.userId !== me
    ).length;
  }

  get badgeLabel(): string {
    return this.unseenCount > 9 ? '9+' : String(this.unseenCount);
  }

  initial(name: string): string {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  /** Show "You" when the activity was performed by the current user. */
  actorLabel(a: ActivityItem): string {
    const me = this.dataService.currentUser$.value?.id ?? null;
    return a.userId && a.userId === me ? 'You' : a.actorName;
  }

  /** Compact relative time, e.g. "just now", "5m ago", "3h ago", "2d ago". */
  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  /** Human-readable phrase for an activity (prefixed by the actor's name in the template). */
  describe(a: ActivityItem): string {
    const ticket = a.ticketTitle || a.ticketId || 'a ticket';
    switch (a.action) {
      case 'ticket.created': return `created ${ticket}`;
      case 'ticket.updated': return a.detail ? `updated ${ticket}: ${a.detail}` : `updated ${ticket}`;
      case 'ticket.deleted': return `deleted ${ticket}`;
      case 'member.joined': return 'joined the workspace';
      case 'member.left': return 'left the workspace';
      case 'member.removed': return a.detail ? `removed ${a.detail}` : 'removed a member';
      case 'workspace.renamed': return a.detail ? `renamed the workspace (${a.detail})` : 'renamed the workspace';
      default: return a.action;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open) {
      const el = this.elementRef.nativeElement;
      if (el && !el.contains(event.target as Node)) {
        this.open = false;
        this.cdr.detectChanges();
      }
    }
  }
}
