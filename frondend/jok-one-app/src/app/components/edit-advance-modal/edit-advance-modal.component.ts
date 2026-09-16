import { Component, Input } from '@angular/core';
import {
  ModalController, IonButton, IonInput, IonItem, IonLabel,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';
import { ThousandsDirective } from '../../directives/thousands.directive';

@Component({
  selector: 'app-edit-advance-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonInput, IonItem,
    IonLabel, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
    ThousandsDirective
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar vale</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Monto</ion-label>
        <ion-input type="text" inputmode="numeric" [(appThousands)]="advance.amount"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="stacked">Motivo (opcional)</ion-label>
        <ion-input type="text" [(ngModel)]="advance.note"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="save()" [disabled]="saving" class="ion-margin-top">
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </ion-button>
    </ion-content>
  `
})
export class EditAdvanceModalComponent {
  @Input() advance: any;
  saving = false;
  private API = environment.apiUrl;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  save() {
    if (!this.advance.amount || Number(this.advance.amount) <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }
    this.saving = true;
    const data = { amount: Number(this.advance.amount), note: this.advance.note };
    this.http.patch(`${this.API}/services/cash-advance/${this.advance.id}`, data, { headers: this.getHeaders() }).subscribe({
      next: () => this.modalCtrl.dismiss({ updated: true }),
      error: () => {
        this.saving = false;
        alert('Error actualizando el vale');
      }
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
