import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ApiService } from './api.service';

interface CatalogEntity {
  id: string;
  name: string;
  parent?: string;
  values?: { name: string }[];
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  constructor(private api: ApiService) {}

  listCategories(): Observable<CatalogEntity[]> {
    return this.api.get<{ success: boolean; data: any[] }>('/catalog/categories').pipe(map((res) => this.mapDocs(res.data)));
  }

  createCategory(payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.post<{ success: boolean; data: any }>('/catalog/categories', payload).pipe(map((res) => this.mapDoc(res.data)));
  }

  updateCategory(id: string, payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.put<{ success: boolean; data: any }>(`/catalog/categories/${id}`, payload).pipe(
      map((res) => this.mapDoc(res.data)),
      catchError((error) => {
        console.error('Update category error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteCategory(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/catalog/categories/${id}`).pipe(
      map((res) => res?.success !== false),
      catchError((error) => {
        console.error('Delete category error:', error);
        return throwError(() => error);
      })
    );
  }

  listBrands(): Observable<CatalogEntity[]> {
    return this.api.get<{ success: boolean; data: any[] }>('/catalog/brands').pipe(map((res) => this.mapDocs(res.data)));
  }

  createBrand(payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.post<{ success: boolean; data: any }>('/catalog/brands', payload).pipe(map((res) => this.mapDoc(res.data)));
  }

  updateBrand(id: string, payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.put<{ success: boolean; data: any }>(`/catalog/brands/${id}`, payload).pipe(
      map((res) => this.mapDoc(res.data)),
      catchError((error) => {
        console.error('Update brand error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteBrand(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/catalog/brands/${id}`).pipe(
      map((res) => res?.success !== false),
      catchError((error) => {
        console.error('Delete brand error:', error);
        return throwError(() => error);
      })
    );
  }

  listVariants(): Observable<CatalogEntity[]> {
    return this.api.get<{ success: boolean; data: any[] }>('/catalog/variants').pipe(map((res) => this.mapDocs(res.data)));
  }

  listStores(): Observable<CatalogEntity[]> {
    return this.api.get<{ success: boolean; data: any[] }>('/catalog/stores').pipe(map((res) => this.mapDocs(res.data)));
  }

  createStore(payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.post<{ success: boolean; data: any }>('/catalog/stores', payload).pipe(map((res) => this.mapDoc(res.data)));
  }

  updateStore(id: string, payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.put<{ success: boolean; data: any }>(`/catalog/stores/${id}`, payload).pipe(
      map((res) => this.mapDoc(res.data)),
      catchError((error) => {
        console.error('Update store error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteStore(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/catalog/stores/${id}`).pipe(
      map((res) => res?.success !== false),
      catchError((error) => {
        console.error('Delete store error:', error);
        return throwError(() => error);
      })
    );
  }

  createVariant(payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.post<{ success: boolean; data: any }>('/catalog/variants', payload).pipe(map((res) => this.mapDoc(res.data)));
  }

  updateVariant(id: string, payload: Partial<CatalogEntity>): Observable<CatalogEntity> {
    return this.api.put<{ success: boolean; data: any }>(`/catalog/variants/${id}`, payload).pipe(
      map((res) => this.mapDoc(res.data)),
      catchError((error) => {
        console.error('Update variant error:', error);
        return throwError(() => error);
      })
    );
  }

  deleteVariant(id: string): Observable<boolean> {
    return this.api.delete<{ success: boolean }>(`/catalog/variants/${id}`).pipe(
      map((res) => res?.success !== false),
      catchError((error) => {
        console.error('Delete variant error:', error);
        return throwError(() => error);
      })
    );
  }

  private mapDocs(docs: any[]): CatalogEntity[] {
    return (docs || []).map(this.mapDoc);
  }

  private mapDoc(doc: any): CatalogEntity {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return { id: _id || doc.id, ...rest };
  }
}


