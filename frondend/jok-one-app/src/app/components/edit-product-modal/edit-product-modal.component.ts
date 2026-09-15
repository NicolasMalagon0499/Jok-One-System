import { Component, Input } from '@angular/core';
import {
  ModalController, IonButton, IonInput, IonItem, IonLabel,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonTextarea
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-product-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonInput, IonItem,
    IonLabel, IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonTextarea
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar producto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Nombre</ion-label>
        <ion-input type="text" [(ngModel)]="product.name"></ion-input>
      </ion-item>
      <p class="field-hint">Como se muestra en el inventario y al registrar una venta.</p>

      <ion-item>
        <ion-label position="stacked">Descripción</ion-label>
        <ion-textarea [(ngModel)]="product.description" auto-grow="true"></ion-textarea>
      </ion-item>
      <p class="field-hint">Detalles opcionales, ej. marca o presentación.</p>

      <ion-item>
        <ion-label position="stacked">Stock actual (unidades)</ion-label>
        <ion-input type="number" [(ngModel)]="product.stock"></ion-input>
      </ion-item>
      <p class="field-hint">Cantidad de unidades disponibles hoy en el local.</p>

      <ion-item>
        <ion-label position="stacked">Avisar cuando el stock llegue a</ion-label>
        <ion-input type="number" [(ngModel)]="product.minStock"></ion-input>
      </ion-item>
      <p class="field-hint">Por debajo de este número el producto aparece como "Stock bajo".</p>

      <ion-item>
        <ion-label position="stacked">Precio de venta (al cliente)</ion-label>
        <ion-input type="number" [(ngModel)]="product.salePrice"></ion-input>
      </ion-item>
      <p class="field-hint">Lo que paga el cliente por unidad.</p>

      <ion-item>
        <ion-label position="stacked">Precio de costo (lo que pagaste)</ion-label>
        <ion-input type="number" [(ngModel)]="product.costPrice"></ion-input>
      </ion-item>
      <p class="field-hint">Lo que te cuesta comprar una unidad; define la ganancia real por producto.</p>

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
export class EditProductModalComponent {
  @Input() product: any;
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
    const data = {
      name: this.product.name,
      description: this.product.description,
      stock: Number(this.product.stock),
      minStock: Number(this.product.minStock),
      salePrice: Number(this.product.salePrice),
      costPrice: Number(this.product.costPrice)
    };
    this.http.patch(`${this.API}/products/${this.product.id}`, data, { headers: this.getHeaders() }).subscribe({
      next: () => this.modalCtrl.dismiss({ updated: true }),
      error: (err) => alert('Error al actualizar: ' + (err.error?.message || 'Error desconocido'))
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
