import { Component, Input, Output, EventEmitter, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-select',
  imports: [CommonModule],
  templateUrl: './custom-select.html',
  styles: [':host { display: block; }'],
})
export class CustomSelect implements OnInit {
  @Input() options: string[] = [];
  @Input() labels: string[] | null = null;
  @Input() placeholder: string = '';
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Input() allowEmpty: boolean = true;
  @Input() disabledValue: string | null = null;
  @Input() disabledLabel: string = '';
  /** Open the dropdown immediately on mount (e.g. inline badge editing). */
  @Input() autoOpen: boolean = false;
  /** Emitted whenever the dropdown closes (selection made or dismissed). */
  @Output() closed = new EventEmitter<void>();

  isOpen = false;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    if (this.autoOpen) this.isOpen = true;
  }

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
    if (this.isOpen) this.close();
    else this.isOpen = true;
  }

  select(opt: string): void {
    if (opt === this.disabledValue) return;
    this.value = opt;
    this.valueChange.emit(opt);
    this.close();
  }

  private close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closed.emit();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
