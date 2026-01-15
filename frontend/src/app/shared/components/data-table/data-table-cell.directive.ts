import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appDataTableCell]'
})
export class DataTableCellDirective {
  constructor(public template: TemplateRef<unknown>) {}
}


