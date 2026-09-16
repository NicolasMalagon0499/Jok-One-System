import { Component, Input } from '@angular/core';
import {
  ModalController, IonButton, IonInput, IonItem, IonLabel,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonSelect, IonSelectOption, IonTextarea
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { ThousandsDirective } from '../../directives/thousands.directive';

@Component({
  selector: 'app-edit-expense-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonInput, IonItem,
    IonLabel, IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonSelect, IonSelectOption, IonTextarea,
    ThousandsDirective
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar gasto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Categoría</ion-label>
        <ion-select [(ngModel)]="expense.category">
          <ion-select-option *ngFor="let cat of categories" [value]="cat.value">{{ cat.label }}</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Descripción</ion-label>
        <ion-textarea [(ngModel)]="expense.description" auto-grow="true"></ion-textarea>
      </ion-item>
      <p class="field-hint">Opcional. Ej. "Arriendo de septiembre" o "Factura de luz".</p>

      <ion-item>
        <ion-label position="stacked">Monto</ion-label>
        <ion-input type="text" inputmode="numeric" [(appThousands)]="expense.amount"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="save()" class="ion-margin-top">
        Guardar cambios
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .field-hint {
      margin: 2px 0 14px 4px;
      font-size: 0.78rem;
      color: var(--app-muted, #a1a1aa);
    }
  `]
})
export class EditExpenseModalComponent {
  @Input() expense: any;
  private API = environment.apiUrl;

  categories = [
    { value: 'RENT', label: '🏠 Arriendo' },
    { value: 'WATER', label: '💧 Agua' },
    { value: 'ELECTRICITY', label: '⚡ Luz' },
    { value: 'INTERNET', label: '🌐 Internet' },
    { value: 'REPAIR', label: '🔧 Reparación' },
    { value: 'OTHER', label: '📝 Otro' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  save() {
    const data = {
      category: this.expense.category,
      description: this.expense.description,
      amount: Number(this.expense.amount)
    };
    this.http.patch(`${this.API}/expenses/${this.expense.id}`, data, { headers: this.getHeaders() }).subscribe({
      next: () => this.modalCtrl.dismiss({ updated: true }),
      error: () => alert('Error actualizando el gasto')
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
