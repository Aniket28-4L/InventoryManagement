import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WarehouseService } from '../../../core/services/warehouse.service';

@Component({
  selector: 'app-warehouse-form',
  templateUrl: './warehouse-form.component.html',
  styleUrls: ['./warehouse-form.component.scss']
})
export class WarehouseFormComponent implements OnInit {
  form = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    address: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    country: [''],
    phone: [''],
    email: [''],
    manager: [''],
    isActive: [true]
  });
  loading = true;
  saving = false;
  warehouseId: string | null = null;
  get isEditMode(): boolean { return !!this.warehouseId; }

  constructor(
    private fb: FormBuilder,
    private warehouseService: WarehouseService,
    private route: ActivatedRoute,
    public router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.warehouseId = this.route.snapshot.paramMap.get('id');
    if (this.warehouseId) {
      this.loadWarehouse(this.warehouseId);
    } else {
      this.loading = false;
    }
  }

  loadWarehouse(id: string): void {
    this.loading = true;
    this.warehouseService.get(id).subscribe({
      next: (warehouse) => {
        this.form.patchValue({
          name: warehouse.name || '',
          code: warehouse.code || '',
          address: warehouse.address?.street || '',
          city: warehouse.address?.city || '',
          state: warehouse.address?.state || '',
          zipCode: warehouse.address?.zipCode || '',
          country: warehouse.address?.country || '',
          phone: warehouse.contact?.phone || '',
          email: warehouse.contact?.email || '',
          manager: warehouse.contact?.manager || '',
          isActive: warehouse.isActive !== false
        });
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load warehouse');
        this.loading = false;
        this.router.navigate(['/warehouses']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const payloadRaw = this.form.value;
    const payload: any = {
      name: payloadRaw.name,
      code: payloadRaw.code,
      address: {
        street: payloadRaw.address || '',
        city: payloadRaw.city || '',
        state: payloadRaw.state || '',
        zipCode: payloadRaw.zipCode || '',
        country: payloadRaw.country || ''
      },
      contact: {
        phone: payloadRaw.phone || '',
        email: payloadRaw.email || '',
        manager: payloadRaw.manager || ''
      },
      isActive: payloadRaw.isActive !== false
    };
    
    const operation = this.isEditMode
      ? this.warehouseService.update(this.warehouseId!, payload)
      : this.warehouseService.create(payload);

    operation.subscribe({
      next: () => {
        this.toastr.success(`Warehouse ${this.isEditMode ? 'updated' : 'created'} successfully`);
        this.router.navigate(['/warehouses']);
      },
      error: (error: any) => {
        this.toastr.error(error?.message || `Failed to ${this.isEditMode ? 'update' : 'create'} warehouse`);
        this.saving = false;
      }
    });
  }
}
