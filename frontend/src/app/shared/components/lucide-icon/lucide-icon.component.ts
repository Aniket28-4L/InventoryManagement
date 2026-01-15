import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { createElement } from 'lucide';
import { 
  LayoutDashboard, Package, Box, Building2, ScanLine, ArrowLeftRight, 
  Users, BarChart, Settings, Plus, Edit, Edit2, Trash2, Download, 
  Upload, Menu, Search, AlertTriangle, Activity, Bell, Printer,
  ShoppingCart, Receipt
} from 'lucide';

@Component({
  selector: 'lucide-icon',
  template: '<span #iconContainer></span>',
  styles: [':host { display: inline-flex; align-items: center; }']
})
export class LucideIconComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() name = '';
  @ViewChild('iconContainer', { static: true }) iconContainer!: ElementRef<HTMLSpanElement>;

  private iconMap: Record<string, any> = {};

  ngOnInit(): void {
    // Map icon names to lucide icon functions
    // Check if icons are actually imported (not undefined)
    this.iconMap = {
      'layout-dashboard': LayoutDashboard,
      'package': Package,
      'box': Box,
      'building-2': Building2,
      'scan-line': ScanLine,
      'arrow-left-right': ArrowLeftRight,
      'users': Users,
      'bar-chart': BarChart,
      'settings': Settings,
      'plus': Plus,
      'edit': Edit,
      'edit-2': Edit2,
      'trash-2': Trash2,
      'download': Download,
      'upload': Upload,
      'menu': Menu,
      'search': Search,
      'alert-triangle': AlertTriangle,
      'activity': Activity,
      'bell': Bell,
      'printer': Printer
      , 'shopping-cart': ShoppingCart
      , 'receipt': Receipt
    };
    
    // Debug: Log available icons to verify imports
    const availableIcons = Object.keys(this.iconMap).filter(key => this.iconMap[key] != null);
    if (availableIcons.length === 0) {
      console.error('No lucide icons were imported successfully. Check your imports.');
    }
  }

  ngAfterViewInit(): void {
    this.updateIcon();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['name'] && this.iconContainer) {
      this.updateIcon();
    }
  }

  private updateIcon(): void {
    if (!this.name || !this.iconContainer) return;

    try {
      // Clear previous icon
      this.iconContainer.nativeElement.innerHTML = '';

      // Get icon data from map
      const iconData = this.iconMap[this.name];

      if (!iconData) {
        console.warn(`Icon "${this.name}" not found. Available icons:`, Object.keys(this.iconMap));
        return;
      }

      // Get classes from host element
      const hostElement = this.iconContainer.nativeElement.parentElement;
      const classes: string[] = [];
      if (hostElement) {
        classes.push(...Array.from(hostElement.classList).filter(c => c && !c.startsWith('ng-')));
      }

      // Create SVG element from icon using createElement
      // In lucide, icons are IconNode arrays that need to be converted to SVG using createElement
      // Use createElement from lucide to convert IconNode to SVGElement
      const svg = createElement(iconData, {
        class: classes.join(' '),
        width: '1em',
        height: '1em'
      });

      if (svg && svg instanceof SVGElement) {
        this.iconContainer.nativeElement.appendChild(svg);
      } else {
        console.warn(`Icon "${this.name}" did not return a valid SVG element`);
      }
    } catch (error) {
      console.warn(`Error rendering icon "${this.name}":`, error);
    }
  }
}

