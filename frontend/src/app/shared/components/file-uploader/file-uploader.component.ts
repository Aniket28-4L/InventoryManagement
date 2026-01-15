import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent {
  @Input() label = 'Upload';
  @Input() accept = '*/*';
  @Input() multiple = false;
  @Output() filesChange = new EventEmitter<File[]>();
  @ViewChild('input') inputRef!: ElementRef<HTMLInputElement>;

  onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    this.filesChange.emit(files);
  }

  openPicker(): void {
    this.inputRef.nativeElement.click();
  }
}


