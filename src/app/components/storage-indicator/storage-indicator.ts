import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * @deprecated Storage is now managed by the backend (S3 object storage).
 * This component is kept for reference but not wired into any template.
 */
@Component({
  selector: 'app-storage-indicator',
  imports: [CommonModule],
  template: `<div class="text-xs text-gray-400 p-2">Storage managed by server</div>`,
  styles: ``,
})
export class StorageIndicator {}
