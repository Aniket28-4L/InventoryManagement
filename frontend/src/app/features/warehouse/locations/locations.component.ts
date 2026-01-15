import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { WarehouseService } from '../../../core/services/warehouse.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit {
  warehouses: any[] = [];
  locations: any[] = [];
  selectedWarehouse: string = '';
  loading = true;
  locationsLoading = false;
  showAddModal = false;
  locationForm = {
    warehouseId: '',
    zone: '',
    shelf: '',
    bin: '',
    aisle: '',
    level: '1',
    type: 'storage'
  };
  locationTypes = ['storage', 'receiving', 'shipping', 'quarantine', 'damaged'];

  constructor(
    private warehouseService: WarehouseService,
    private api: ApiService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.loading = true;
    this.warehouseService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.warehouses = res.warehouses;
        if (this.warehouses.length > 0 && !this.selectedWarehouse) {
          this.selectedWarehouse = this.warehouses[0].id;
          this.loadLocations();
        }
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load warehouses');
        this.loading = false;
      }
    });
  }

  loadLocations(): void {
    if (!this.selectedWarehouse) return;
    this.locationsLoading = true;
    this.api.get(`/warehouses/${this.selectedWarehouse}/locations`).subscribe({
      next: (res: any) => {
        this.locations = res.data || [];
        this.locationsLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load locations');
        this.locationsLoading = false;
      }
    });
  }

  onWarehouseChange(): void {
    this.loadLocations();
  }

  openAddModal(): void {
    this.locationForm.warehouseId = this.selectedWarehouse;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.locationForm = {
      warehouseId: '',
      zone: '',
      shelf: '',
      bin: '',
      aisle: '',
      level: '1',
      type: 'storage'
    };
  }

  addLocation(): void {
    if (!this.locationForm.zone || !this.locationForm.shelf || !this.locationForm.bin) {
      this.toastr.error('Please fill in zone, shelf, and bin');
      return;
    }
    // Note: This would need a proper API endpoint for adding locations
    this.toastr.info('Location creation feature needs backend endpoint');
    this.closeAddModal();
  }
}
