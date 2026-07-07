import { Component } from '@angular/core';
import { TicketDataService } from '../../services/ticket-data';

@Component({
  selector: 'app-export-button',
  imports: [],
  templateUrl: './export-button.html',
  styles: ``,
})
export class ExportButton {
  constructor(private dataService: TicketDataService) {}

  exportWorkspace(): void {
    const ws = this.dataService.getActiveWorkspace();
    if (!ws) {
      alert('Please select a workspace first before exporting.');
      return;
    }

    const tickets = this.dataService.getTickets(ws.id);

    const exportData = {
      exportVersion: '1.0',
      exportTimestamp: new Date().toISOString(),
      workspaceName: ws.name,
      workspaceId: ws.id,
      totalTickets: tickets.length,
      tickets: tickets.map(t => ({
        id: t.id,
        title: t.title,
        service: t.service,
        subCategory: t.subCategory,
        status: t.status,
        severity: t.severity,
        dateReported: t.dateReported,
        description: t.description,
        whatWasObserved: t.observed,
        stepsToReproduce: t.stepsToReproduce,
        expectedOutcome: t.expectedOutcome,
        actualOutcome: t.actualOutcome,
        possibleRootCause: t.rootCause,
        environmentConfig: t.environment,
        attachments: t.attachments.map(a => ({
          name: a.name,
          type: a.type,
          size: a.size,
          data: a.data  // base64, so AI can actually see screenshots
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-export-${ws.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
