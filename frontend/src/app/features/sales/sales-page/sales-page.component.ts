import { Component, OnInit } from '@angular/core'
import { ProductsService, Product } from '../../../core/services/products.service'
import { SalesService } from '../../../core/services/sales.service'
import { ToastrService } from 'ngx-toastr'
import { Router, ActivatedRoute } from '@angular/router'
import { environment } from '../../../../environments/environment'

interface CartItem {
  product: Product
  quantity: number
  discount: number
  available: number
  variantValue?: string
  availableVariants?: string[]
  stockData?: any[]
}

@Component({
  selector: 'app-sales-page',
  templateUrl: './sales-page.component.html'
})
export class SalesPageComponent implements OnInit {
  products: Product[] = []
  searchTerm = ''
  loadingProducts = false
  page = 1
  total = 0
  pages = 0

  cart: CartItem[] = []
  submitting = false
  buyerName = ''

  constructor(
    private productsService: ProductsService, 
    private salesService: SalesService, 
    private toastr: ToastrService, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.fetchProducts(1)
    
    // Check for query params from barcode scan
    this.route.queryParams.subscribe(params => {
      const productId = params['productId']
      const sku = params['sku']
      const barcode = params['barcode']
      const variant = params['variant']
      
      if (productId) {
        // Fetch product by ID and add to cart
        this.prefillProductById(productId, variant)
      } else if (sku || barcode) {
        // Search for product by SKU or barcode
        this.prefillProductByCode(sku || barcode, variant)
      }
    })
  }
  
  private prefillProductById(productId: string, variant?: string): void {
    this.productsService.get(productId).subscribe({
      next: (product) => {
        if (product) {
          this.addToCartWithVariant(product, variant)
          this.toastr.info(`Added ${product.name} to cart from barcode scan`)
        }
      },
      error: () => {
        this.toastr.error('Failed to load scanned product')
      }
    })
  }
  
  private prefillProductByCode(code: string, variant?: string): void {
    // Search in loaded products first
    this.productsService.list({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        const products = res.products || []
        let match = products.find((p: any) => 
          String(p.sku || '').trim().toLowerCase() === code.toLowerCase() ||
          String(p.barcode || '').trim().toLowerCase() === code.toLowerCase()
        )
        
        // Try matching base SKU (before hyphen)
        if (!match && code.includes('-')) {
          const baseSku = code.split('-')[0]
          match = products.find((p: any) => 
            String(p.sku || '').trim().toLowerCase() === baseSku.toLowerCase()
          )
          // If matched by base SKU, try to extract variant from the scanned code
          if (match && !variant) {
            variant = code.split('-').slice(1).join('-')
          }
        }
        
        if (match) {
          this.addToCartWithVariant(match, variant)
          this.toastr.info(`Added ${match.name} to cart from barcode scan`)
        } else {
          this.toastr.error('Could not find product with scanned code')
        }
      },
      error: () => {
        this.toastr.error('Failed to search for scanned product')
      }
    })
  }
  
  private addToCartWithVariant(product: Product, variant?: string): void {
    // Add to cart with variant pre-selected
    const variants = (product as any).variants?.map((v: any) => v.value).filter(Boolean) || []
    
    let available = 0;
    if (variants.length === 0) {
      available = (product as any).stock || 0;
    }

    this.productsService.stock(product.id).subscribe({
      next: (list) => {
        const stockData = list || []
        
        const cartItem: CartItem = { 
          product, 
          quantity: 1, 
          discount: 0, 
          available,
          variantValue: '',
          availableVariants: variants,
          stockData
        }
        
        this.cart.push(cartItem)
        
        // Pre-select variant if provided and exists in available variants
        if (variant && variants.length > 0) {
          const matchedVariant = variants.find((v: string) => 
            v.toLowerCase() === variant.toLowerCase()
          )
          if (matchedVariant) {
            // Update the last added cart item with the variant
            setTimeout(() => {
              this.updateVariantValue(cartItem, matchedVariant)
            }, 100)
          }
        }
      },
      error: () => {
        this.cart.push({ 
          product, 
          quantity: 1, 
          discount: 0, 
          available, 
          variantValue: variant || '', 
          availableVariants: variants, 
          stockData: [] 
        })
      }
    })
  }

  fetchProducts(page: number): void {
    this.loadingProducts = true
    this.productsService.list({ page, limit: 10, search: this.searchTerm }).subscribe({
      next: (res) => {
        this.products = res.products
        this.page = res.page
        this.total = res.total
        this.pages = res.pages
        this.loadingProducts = false
      },
      error: () => { this.loadingProducts = false }
    })
  }

  search(): void { this.fetchProducts(1) }

  onSearchInput(value: string): void {
    this.searchTerm = value
  }

  filteredProducts(): Product[] {
    const q = this.searchTerm.trim().toLowerCase()
    if (!q) return this.products
    return this.products.filter((p) => (p.name || '').toLowerCase().includes(q))
  }

  addToCart(p: Product): void {
    // Allow adding same product multiple times to support multiple variant selections
    // Each addition creates a new line item which can be configured independently
    // This satisfies the requirement to allow selling multiple variant values of the same product
    
    // FIX: Issue 4 - Use Product Variants as source of truth for stock, not Warehouse Stock
    const variants = (p as any).variants?.map((v: any) => v.value).filter(Boolean) || []
    
    // Initial available: 
    // If variants exist, 0 (must select). 
    // If no variants, use p.stock (calculated in listProducts).
    let available = 0;
    if (variants.length === 0) {
        available = (p as any).stock || 0;
    }

    this.productsService.stock(p.id).subscribe({
      next: (list) => {
        const stockData = list || []
        
        this.cart.push({ 
            product: p, 
            quantity: 1, 
            discount: 0, 
            available,
            variantValue: '',
            availableVariants: variants,
            stockData
        })
      },
      error: () => {
        this.cart.push({ 
            product: p, 
            quantity: 1, 
            discount: 0, 
            available, 
            variantValue: '', 
            availableVariants: variants, 
            stockData: [] 
        })
      }
    })
  }

  addVariantRow(item: CartItem): void {
    // Wrapper to add another row for the same product
    this.addToCart(item.product)
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1)
  }

  updateQuantity(item: CartItem, value: any): void {
    const qty = Math.max(1, Math.floor(Number(value) || 1))
    // Check available for specific variant if selected
    if (qty > item.available) {
        // Just show error but allow input? Or clamp?
        // User says "Quantity entered is not reflected correctly". 
        // Maybe the issue is that I wasn't updating item.quantity properly in some cases?
        // But also "Quantity must directly affect Line total".
        // And "Stock deduction is accurate".
        this.toastr.error('Quantity exceeds available stock')
    }
    item.quantity = qty
  }

  updateDiscount(item: CartItem, value: number): void {
    // ISSUE 3: Direct amount, allow > 100.
    // ISSUE 4: Prevent negative.
    const d = Math.max(0, Number(value) || 0)
    item.discount = d
  }

  updateVariantValue(item: CartItem, value: string): void {
      item.variantValue = value
      // FIX: Issue 4 - Recalculate available stock using PRODUCT VARIANTS
      if (item.product && (item.product as any).variants && (item.product as any).variants.length > 0) {
          if (value) {
              const v = (item.product as any).variants.find((v: any) => v.value === value);
              item.available = v ? (v.qty || 0) : 0;
          } else {
              item.available = 0;
          }
      } else {
          // Fallback if no variants
           item.available = (item.product as any).stock || 0;
      }
      
      // Reset quantity to 1 if it exceeds new available?
      if (item.quantity > item.available) {
          item.quantity = Math.max(0, item.available) // Or 1? If available is 0, then 0.
      }
  }

  lineTotal(item: CartItem): number {
    const unit = Number(item.product.price || 0)
    const subtotal = unit * item.quantity
    // ISSUE 3: Discount is direct amount deduction
    const total = Math.max(0, subtotal - item.discount)
    return Number(total.toFixed(2))
  }

  grandTotal(): number {
    return this.cart.reduce((s, x) => s + this.lineTotal(x), 0)
  }

  generateInvoice(): void {
    if (this.cart.length === 0) return
    
    // Validate variants
    const missingVariant = this.cart.find(c => c.availableVariants && c.availableVariants.length > 0 && !c.variantValue)
    if (missingVariant) {
        this.toastr.error(`Please select a variant for ${missingVariant.product.name}`)
        return
    }

    const items = this.cart.map((c) => ({ 
        productId: c.product.id, 
        quantity: c.quantity, 
        discount: c.discount,
        variantValue: c.variantValue // Pass variant value
    }))
    this.submitting = true
    this.salesService.createSale({ items, buyerName: this.buyerName }).subscribe({
      next: (order) => {
        this.submitting = false
        this.toastr.success('Sale completed successfully')
        this.salesService.downloadInvoice(order.id).subscribe({
          next: (blob) => {
            const fileName = `invoice-${order.orderNumber}.pdf`
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.click()
            window.URL.revokeObjectURL(url)
            this.router.navigate(['/sales/history'])
          },
          error: () => {
            this.router.navigate(['/sales/history'])
          }
        })
      },
      error: (err) => {
        this.submitting = false
        const msg = err?.error?.message || 'Failed to complete sale'
        this.toastr.error(msg)
      }
    })
  }
}