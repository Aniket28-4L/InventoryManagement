import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss']
})
export class StatCardComponent {
  @Input() icon: string | null = null;
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() trend: 'up' | 'down' | 'flat' | null = null;
  @Input() trendValue = '';
  @Input() className = '';

  trendLabel(): string {
    if (this.trend === 'up') return '↑';
    if (this.trend === 'down') return '↓';
    return '→';
  }
}


