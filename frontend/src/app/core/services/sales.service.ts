import { Injectable } from '@angular/core'
import { Observable, map } from 'rxjs'
import { ApiService } from './api.service'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../environments/environment'

export interface SaleItemInput {
  productId: string
  quantity: number
  discount: number
  variantValue?: string
}

export interface SaleOrder {
  id: string
  orderNumber: string
  total: number
  createdAt: string
  items?: any[]
  pdfUrl?: string
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  constructor(private api: ApiService, private http: HttpClient) {}

  createSale(payload: { items: SaleItemInput[]; customerId?: string; buyerName?: string }): Observable<SaleOrder> {
    return this.api.post<any>('/sales', payload).pipe(map((res) => ({
      id: res?.data?.id,
      orderNumber: res?.data?.orderNumber,
      total: res?.data?.total,
      createdAt: res?.data?.createdAt,
      pdfUrl: res?.data?.pdfUrl
    } as SaleOrder)))
  }

  list(params: Record<string, unknown>): Observable<{ data: SaleOrder[]; page: number; total: number; pages: number }> {
    return this.api.get<any>('/sales', params).pipe(map((res) => ({
      data: (res?.data || []).map((x: any) => ({
        id: x._id || x.id,
        orderNumber: x.orderNumber,
        total: x.total,
        createdAt: x.createdAt,
        items: (x.items || []).map((it: any) => ({ productName: it.productName, quantity: it.quantity, unitPrice: it.unitPrice, discount: it.discount }))
      })),
      page: res?.page || 1,
      total: res?.total || 0,
      pages: res?.pages || 0
    })))
  }

  get(id: string): Observable<any> {
    return this.api.get<any>(`/sales/${id}`).pipe(map((res) => ({ ...res?.data, id: res?.data?._id || res?.data?.id })))
  }

  invoicePdfUrl(id: string): string {
    return `/api/sales/${id}/pdf`
  }

  downloadInvoice(id: string): Observable<Blob> {
    const url = `${environment.apiUrl}/sales/${id}/pdf`
    return this.http.get(url, { responseType: 'blob' })
  }

  deleteSale(id: string): Observable<any> {
    return this.api.delete(`/sales/${id}`)
  }
}