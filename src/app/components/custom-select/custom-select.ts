import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-select',
  imports: [CommonModule],
  templateUrl: './custom-select.html',
  styles: [':host { display: block; }'],
})
export class CustomSelect {
  @Input() options: string[] = [];
  @Input() labels: string[] | null = null;
  @Input() placeholder: string = '';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Input() allowEmpty: boolean = true;
  @Input() disabledValue: string | null = null;
  @Input() disabledLabel: string = '';

  isOpen = false;

  constructor(private elementRef: ElementRef) {}

  get displayText(): string {
    if (!this.value && this.placeholder) return this.placeholder;
    if (!this.value) return this.disabledLabel || this.placeholder || 'Select...';
    if (this.labels) {
      const idx = this.options.indexOf(this.value);
      if (idx >= 0 && idx < this.labels.length) return this.labels[idx];
    }
    return this.value;
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }

  select(opt: string): void {
    if (opt === this.disabledValue) return;
    this.value = opt;
    this.valueChange.emit(opt);
    this.isOpen = false;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
