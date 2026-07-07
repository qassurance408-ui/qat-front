import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WorkspaceSelector } from './components/workspace-selector/workspace-selector';
import { TicketTable } from './components/ticket-table/ticket-table';
import { TicketDataService } from './services/ticket-data';
import { Workspace } from './models/ticket';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    WorkspaceSelector,
    TicketTable,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  hasActiveWorkspace = false;
  activeWorkspaceId: string | null = null;
  activeWorkspaceName: string | null = null;
  workspaces: Workspace[] = [];

  editingWorkspaceName = false;
  editWorkspaceNameBuffer = '';

  showCreateOnLanding = false;
  newWorkspaceName = '';

  @ViewChild('nameInput') nameInputRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('createNameInput') createNameInputRef: ElementRef<HTMLInputElement> | null = null;

  private wsSub: Subscription | null = null;

  constructor(private dataService: TicketDataService) {}

  ngOnInit(): void {
    this.syncAll();
    this.wsSub = this.dataService.activeWorkspaceChanged$.subscribe(() => {
      this.syncAll();
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  private syncAll(): void {
    const ws = this.dataService.getActiveWorkspace();
    this.hasActiveWorkspace = ws !== null;
    this.activeWorkspaceId = ws?.id ?? null;
    this.activeWorkspaceName = ws?.name ?? null;
    this.workspaces = this.dataService.getWorkspaces();
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
    const ws = this.dataService.createWorkspace(name);
    this.dataService.setActiveWorkspace(ws);
    this.showCreateOnLanding = false;
    this.newWorkspaceName = '';
  }

  startEditingWorkspaceName(): void {
    this.editWorkspaceNameBuffer = this.activeWorkspaceName ?? '';
    this.editingWorkspaceName = true;
    // Focus input after view renders
    setTimeout(() => this.nameInputRef?.nativeElement?.focus(), 0);
  }

  saveWorkspaceName(): void {
    if (!this.editingWorkspaceName || !this.activeWorkspaceId) return;
    const name = this.editWorkspaceNameBuffer.trim();
    if (name && name !== this.activeWorkspaceName) {
      this.dataService.renameWorkspace(this.activeWorkspaceId, name);
      this.activeWorkspaceName = name;
    }
    this.editingWorkspaceName = false;
  }

  cancelEditingWorkspaceName(): void {
    this.editingWorkspaceName = false;
  }
}
