import { Component, ContentChild, EventEmitter, Input, Output, TemplateRef, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface DataTableColumn {
  key: string;
  label: string;
  dataIndex?: string;
  render?: (row: any) => unknown;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnDestroy {
  @Input() columns: DataTableColumn[] = [];
  @Input() data: any[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() loading = false;
  @Input() showSearch = true;

  @Output() search = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();

  query = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  @ContentChild('tableActions', { read: TemplateRef }) actionsTemplate?: TemplateRef<unknown>;

  constructor() {
    // Set up debounced search
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.search.emit(query);
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get canPrev(): boolean {
    return this.page > 1;
  }

  get canNext(): boolean {
    return this.page < this.totalPages;
  }

  onSearchInput(value: string): void {
    this.query = value;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.query = '';
    this.searchSubject.next('');
  }

  handlePrev(): void {
    if (this.canPrev) this.pageChange.emit(this.page - 1);
  }

  handleNext(): void {
    if (this.canNext) this.pageChange.emit(this.page + 1);
  }

  displayValue(col: DataTableColumn, row: any): unknown {
    if (col.render) return col.render(row);
    if (col.dataIndex) return row[col.dataIndex];
    return row[col.key];
  }
}


