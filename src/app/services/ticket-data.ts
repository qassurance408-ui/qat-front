import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Ticket, Workspace } from '../models/ticket';

/**
 * Data abstraction layer for all ticket and workspace CRUD operations.
 * Currently uses localStorage, but designed so swapping internals for
 * HttpClient calls (future REST API) requires no changes outside this file.
 */
@Injectable({
  providedIn: 'root'
})
export class TicketDataService {
  private readonly TICKETS_KEY = 'tracker_tickets';
  private readonly WORKSPACES_KEY = 'tracker_workspaces';
  private readonly ACTIVE_WS_KEY = 'tracker_active_workspace';

  /** Emits whenever the active workspace changes (including on create/delete). */
  activeWorkspaceChanged$ = new Subject<void>();

  // --- Workspace operations ---

  getWorkspaces(): Workspace[] {
    const data = localStorage.getItem(this.WORKSPACES_KEY);
    return data ? JSON.parse(data) : [];
  }

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

  createWorkspace(name: string): Workspace {
    const workspaces = this.getWorkspaces();
    const ws: Workspace = {
      id: this.generateId('ws'),
      name,
      createdAt: new Date().toISOString()
    };
    workspaces.push(ws);
    localStorage.setItem(this.WORKSPACES_KEY, JSON.stringify(workspaces));
    this.activeWorkspaceChanged$.next();
    return ws;
  }

  deleteWorkspace(id: string): void {
    let workspaces = this.getWorkspaces();
    workspaces = workspaces.filter(w => w.id !== id);
    localStorage.setItem(this.WORKSPACES_KEY, JSON.stringify(workspaces));
    // Also remove associated tickets
    const active = this.getActiveWorkspace();
    if (active && active.id === id) {
      this.setActiveWorkspace(null);
      localStorage.removeItem(`${this.TICKETS_KEY}_${id}`);
    } else {
      localStorage.removeItem(`${this.TICKETS_KEY}_${id}`);
    }
    this.activeWorkspaceChanged$.next();
  }

  renameWorkspace(id: string, newName: string): void {
    const workspaces = this.getWorkspaces();
    const ws = workspaces.find(w => w.id === id);
    if (ws) {
      ws.name = newName;
      localStorage.setItem(this.WORKSPACES_KEY, JSON.stringify(workspaces));
      // Also update active workspace if it's the same one
      const active = this.getActiveWorkspace();
      if (active && active.id === id) {
        active.name = newName;
        localStorage.setItem(this.ACTIVE_WS_KEY, JSON.stringify(active));
      }
      this.activeWorkspaceChanged$.next();
    }
  }

  // --- Ticket operations ---

  private ticketKey(workspaceId: string): string {
    return `${this.TICKETS_KEY}_${workspaceId}`;
  }

  getTickets(workspaceId: string): Ticket[] {
    const data = localStorage.getItem(this.ticketKey(workspaceId));
    return data ? JSON.parse(data) : [];
  }

  getTicket(workspaceId: string, ticketId: string): Ticket | null {
    const tickets = this.getTickets(workspaceId);
    return tickets.find(t => t.id === ticketId) ?? null;
  }

  createTicket(workspaceId: string, ticket: Omit<Ticket, 'id' | 'dateReported'>): Ticket {
    const tickets = this.getTickets(workspaceId);
    const newTicket: Ticket = {
      ...ticket,
      id: this.generateId('TK'),
      dateReported: new Date().toISOString()
    };
    tickets.push(newTicket);
    localStorage.setItem(this.ticketKey(workspaceId), JSON.stringify(tickets));
    return newTicket;
  }

  updateTicket(workspaceId: string, ticket: Ticket): void {
    const tickets = this.getTickets(workspaceId);
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx !== -1) {
      tickets[idx] = ticket;
      localStorage.setItem(this.ticketKey(workspaceId), JSON.stringify(tickets));
    }
  }

  deleteTicket(workspaceId: string, ticketId: string): void {
    let tickets = this.getTickets(workspaceId);
    tickets = tickets.filter(t => t.id !== ticketId);
    localStorage.setItem(this.ticketKey(workspaceId), JSON.stringify(tickets));
  }

  // --- Storage estimation ---

  getStorageUsage(): { used: number; total: number; percent: number } {
    const total = 5 * 1024 * 1024; // 5MB conservative estimate
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }
    return { used, total, percent: (used / total) * 100 };
  }

  isStorageSafe(additionalBytes: number): { safe: boolean; message: string } {
    const { used, total } = this.getStorageUsage();
    if (used + additionalBytes > total * 0.9) {
      const remaining = total - used;
      return {
        safe: false,
        message: `Storage is nearly full. Approximately ${this.formatBytes(remaining)} remaining. Consider removing old attachments or exporting your data.`
      };
    }
    if (used + additionalBytes > total) {
      return {
        safe: false,
        message: 'Not enough storage space available for this operation. Please remove old data or attachments first.'
      };
    }
    return { safe: true, message: '' };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private generateId(prefix: string): string {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ts = Date.now().toString(36).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  }
}
