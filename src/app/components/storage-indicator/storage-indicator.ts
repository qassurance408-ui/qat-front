import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketDataService } from '../../services/ticket-data';

@Component({
  selector: 'app-storage-indicator',
  imports: [CommonModule],
  templateUrl: './storage-indicator.html',
  styles: ``,
})
export class StorageIndicator implements OnInit, OnDestroy {
  usage = { used: 0, total: 5 * 1024 * 1024, percent: 0 };
  protected readonly Math = Math;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private dataService: TicketDataService) {}

  ngOnInit(): void {
    this.update();
    this.interval = setInterval(() => this.update(), 5000);
  }

  ngOnDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  update(): void {
    this.usage = this.dataService.getStorageUsage();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get barColor(): string {
    if (this.usage.percent >= 90) return 'bg-red-500';
    if (this.usage.percent >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  }
}
