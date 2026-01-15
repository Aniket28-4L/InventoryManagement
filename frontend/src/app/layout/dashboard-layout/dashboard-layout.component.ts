import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  sidebarOpen = true;
  isMobile = false;
  private touchStartX = 0;
  private touchEndX = 0;

  constructor(private router: Router) {
    this.checkScreenSize();
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isMobile) {
        this.sidebarOpen = false;
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768; // md breakpoint
    if (this.isMobile) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  handleSwipeStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  handleSwipeEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipeGesture();
  }

  private handleSwipeGesture() {
    const swipeThreshold = 50; // minimum distance for swipe
    const swipeDistance = this.touchEndX - this.touchStartX;
    
    // Only handle swipes on mobile
    if (!this.isMobile) return;

    // Swipe right to open sidebar
    if (swipeDistance > swipeThreshold && !this.sidebarOpen) {
      // Only allow opening if swipe starts from the left edge (first 50px)
      if (this.touchStartX < 50) {
        this.sidebarOpen = true;
      }
    }
    
    // Swipe left to close sidebar
    if (swipeDistance < -swipeThreshold && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }
}


