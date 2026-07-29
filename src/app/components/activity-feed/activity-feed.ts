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
  styles: ``,
})
export class ActivityFeed implements OnChanges, OnDestroy {
  @Input() activeWorkspaceId: string | null = null;

  open = false;
  activities: ActivityItem[] = [];
  online: OnlineUser[] = [];
  loaded = false;

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
        this.cdr.detectChanges();
      },
      error: () => {
        // Ignore transient poll failures; keep the last known state.
      },
    });
  }

  toggle(): void {
    this.open = !this.open;
  }

  get onlineCount(): number {
    return this.online.length;
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
