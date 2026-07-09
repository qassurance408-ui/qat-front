import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { apiConfig } from '../api.config';
import { Ticket, TicketAttachment, Workspace } from '../models/ticket';
import { setAccessToken } from './auth-interceptor';

// ───────────────────────────────────────────────────────────────────────────
// API response shapes (mirror the backend)
// ───────────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type { AuthUser };

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}

interface WorkspaceResponse {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  role: 'OWNER' | 'MEMBER';
  memberCount: number;
  members?: WorkspaceMember[];
}

interface AttachmentResponse {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

interface TicketResponse {
  id: string;
  workspaceId: string;
  title: string;
  service: string;
  subCategory: string;
  status: string;
  severity: string;
  dateReported: string;
  description: string;
  observed: string;
  stepsToReproduce: string;
  expectedOutcome: string;
  actualOutcome: string;
  rootCause: string;
  environment: string;
  attachments: AttachmentResponse[];
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers: convert API shapes → frontend interfaces
// ───────────────────────────────────────────────────────────────────────────

function toTicket(r: TicketResponse): Ticket {
  return {
    id: r.id,
    title: r.title,
    service: r.service as Ticket['service'],
    subCategory: r.subCategory,
    status: r.status as Ticket['status'],
    severity: r.severity as Ticket['severity'],
    dateReported: r.dateReported,
    description: r.description,
    observed: r.observed,
    stepsToReproduce: r.stepsToReproduce,
    expectedOutcome: r.expectedOutcome,
    actualOutcome: r.actualOutcome,
    rootCause: r.rootCause,
    environment: r.environment,
    attachments: (r.attachments || []).map(toAttachment),
  };
}

function toAttachment(a: AttachmentResponse): TicketAttachment {
  return {
    id: a.id,
    name: a.name,
    type: a.mimeType,
    size: a.size,
    url: a.url,
  };
}

function toWorkspace(r: WorkspaceResponse): Workspace {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    ownerId: r.ownerId,
    role: r.role,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Service
// ───────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TicketDataService {
  private http = inject(HttpClient);
  private api = apiConfig.baseUrl + '/api';

  // ── Auth state ──────────────────────────────────────────────────────────

  /** Emits the current user when auth state changes (null = logged out). */
  currentUser$ = new BehaviorSubject<AuthUser | null>(null);

  /** Emits whenever the active workspace changes (UI preference). */
  activeWorkspaceChanged$ = new Subject<void>();

  // ── Active workspace (localStorage — UI preference, not server state) ─────

  private readonly ACTIVE_WS_KEY = 'tracker_active_workspace';

  getActiveWorkspace(): Workspace | null {
    const data = localStorage.getItem(this.ACTIVE_WS_KEY);
    return data ? JSON.parse(data) : null;
  }

  setActiveWorkspace(ws: Workspace | null): void {
    if (ws) {
      localStorage.setItem(this.ACTIVE_WS_KEY, JSON.stringify(ws));
    } else {
      localStorage.removeItem(this.ACTIVE_WS_KEY);
    }
    this.activeWorkspaceChanged$.next();
  }

  /** Update the stored active workspace name without emitting (avoids re-entry loops). */
  refreshActiveWorkspaceName(name: string): void {
    const stored = this.getActiveWorkspace();
    if (stored) {
      stored.name = name;
      localStorage.setItem(this.ACTIVE_WS_KEY, JSON.stringify(stored));
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(res => {
        setAccessToken(res.accessToken);
        this.currentUser$.next(res.user);
      }),
    );
  }

  register(email: string, password: string, displayName: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/register`, { email, password, displayName }).pipe(
      tap(res => {
        setAccessToken(res.accessToken);
        this.currentUser$.next(res.user);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.api}/auth/logout`, {}).pipe(
      tap(() => {
        setAccessToken(null);
        this.currentUser$.next(null);
      }),
    );
  }

  refreshAccessToken(): Observable<string> {
    return this.http.post<{ accessToken: string }>(`${this.api}/auth/refresh`, {}).pipe(
      tap(res => setAccessToken(res.accessToken)),
      map(res => res.accessToken),
    );
  }

  getAuthUser(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.api}/auth/me`).pipe(
      tap(user => this.currentUser$.next(user)),
    );
  }

  // ── Workspaces ──────────────────────────────────────────────────────────

  getWorkspaces(): Observable<WorkspaceResponse[]> {
    return this.http.get<WorkspaceResponse[]>(`${this.api}/workspaces`);
  }

  createWorkspace(id: string, name: string): Observable<WorkspaceResponse> {
    return this.http.post<WorkspaceResponse>(`${this.api}/workspaces`, { id, name });
  }

  getWorkspace(workspaceId: string): Observable<WorkspaceResponse> {
    return this.http.get<WorkspaceResponse>(`${this.api}/workspaces/${workspaceId}`);
  }

  renameWorkspace(workspaceId: string, name: string): Observable<WorkspaceResponse> {
    return this.http.patch<WorkspaceResponse>(`${this.api}/workspaces/${workspaceId}`, { name });
  }

  deleteWorkspace(workspaceId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/workspaces/${workspaceId}`);
  }

  regenerateInviteCode(workspaceId: string): Observable<{ inviteCode: string }> {
    return this.http.post<{ inviteCode: string }>(
      `${this.api}/workspaces/${workspaceId}/regenerate-invite`, {},
    );
  }

  joinWorkspace(inviteCode: string): Observable<WorkspaceResponse> {
    return this.http.post<WorkspaceResponse>(`${this.api}/workspaces/join`, { inviteCode });
  }

  getWorkspaceMembers(workspaceId: string): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceResponse>(`${this.api}/workspaces/${workspaceId}`).pipe(
      map(w => w.members || []),
    );
  }

  removeMember(workspaceId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/workspaces/${workspaceId}/members/${userId}`);
  }

  // ── Tickets ─────────────────────────────────────────────────────────────

  getTickets(workspaceId: string, params?: {
    status?: string;
    severity?: string;
    service?: string;
    search?: string;
  }): Observable<Ticket[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.severity) httpParams = httpParams.set('severity', params.severity);
      if (params.service) httpParams = httpParams.set('service', params.service);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }
    return this.http.get<TicketResponse[]>(
      `${this.api}/workspaces/${workspaceId}/tickets`,
      { params: httpParams },
    ).pipe(map(rows => rows.map(toTicket)));
  }

  getTicket(workspaceId: string, ticketId: string): Observable<Ticket> {
    return this.http.get<TicketResponse>(
      `${this.api}/workspaces/${workspaceId}/tickets/${ticketId}`,
    ).pipe(map(toTicket));
  }

  createTicket(
    workspaceId: string,
    ticket: {
      id: string;
      title: string;
      service: string;
      subCategory: string;
      status: string;
      severity: string;
      dateReported: string;
      description: string;
      observed: string;
      stepsToReproduce: string;
      expectedOutcome: string;
      actualOutcome: string;
      rootCause: string;
      environment: string;
    },
  ): Observable<Ticket> {
    return this.http.post<TicketResponse>(
      `${this.api}/workspaces/${workspaceId}/tickets`,
      ticket,
    ).pipe(map(toTicket));
  }

  updateTicket(workspaceId: string, ticket: Ticket): Observable<Ticket> {
    return this.http.put<TicketResponse>(
      `${this.api}/workspaces/${workspaceId}/tickets/${ticket.id}`,
      {
        id: ticket.id,
        title: ticket.title,
        service: ticket.service,
        subCategory: ticket.subCategory,
        status: ticket.status,
        severity: ticket.severity,
        dateReported: ticket.dateReported,
        description: ticket.description,
        observed: ticket.observed,
        stepsToReproduce: ticket.stepsToReproduce,
        expectedOutcome: ticket.expectedOutcome,
        actualOutcome: ticket.actualOutcome,
        rootCause: ticket.rootCause,
        environment: ticket.environment,
      },
    ).pipe(map(toTicket));
  }

  deleteTicket(workspaceId: string, ticketId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/workspaces/${workspaceId}/tickets/${ticketId}`,
    );
  }

  // ── Attachments ─────────────────────────────────────────────────────────

  uploadAttachments(
    workspaceId: string,
    ticketId: string,
    files: File[],
  ): Observable<TicketAttachment[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post<AttachmentResponse[]>(
      `${this.api}/workspaces/${workspaceId}/tickets/${ticketId}/attachments`,
      formData,
    ).pipe(map(list => list.map(toAttachment)));
  }

  deleteAttachment(
    workspaceId: string,
    ticketId: string,
    attachmentId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/workspaces/${workspaceId}/tickets/${ticketId}/attachments/${attachmentId}`,
    );
  }

  // ── Export ──────────────────────────────────────────────────────────────

  exportWorkspace(workspaceId: string): Observable<Blob> {
    return this.http.get(`${this.api}/workspaces/${workspaceId}/export`, {
      responseType: 'blob',
    });
  }
}
