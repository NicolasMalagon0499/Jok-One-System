import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <ion-button fill="clear" class="theme-toggle-btn" (click)="theme.toggle()" aria-label="Cambiar tema">
      <ion-icon slot="icon-only" [name]="theme.mode() === 'dark' ? 'sunny-outline' : 'moon-outline'"></ion-icon>
    </ion-button>
  `,
  styles: [`
    .theme-toggle-btn {
      --padding-start: 8px;
      --padding-end: 8px;
      margin: 0;
      height: 40px;
    }
  `],
})
export class ThemeToggleComponent {
  constructor(public theme: ThemeService) {
    addIcons({ moonOutline, sunnyOutline });
  }
}
