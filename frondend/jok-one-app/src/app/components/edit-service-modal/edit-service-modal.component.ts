import { Component, Input, OnInit } from '@angular/core';
import {
  ModalController, IonButton, IonInput, IonItem, IonLabel,
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons,
  IonSelect, IonSelectOption, IonIcon, IonList
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircleOutline, removeCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth'; // Asegúrate de ajustar esta ruta
import { environment } from '../../../environments/environment';
import { ThousandsDirective } from '../../directives/thousands.directive';

interface EditableProduct { productId: string; quantity: number; type: string }

@Component({
  selector: 'app-edit-service-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonButton, IonInput, IonItem,
    IonLabel, IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonSelect, IonSelectOption, IonIcon, IonList,
    ThousandsDirective
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ modalTitle }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cerrar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Cliente</ion-label>
        <ion-select [(ngModel)]="service.clientType">
          <ion-select-option value="NEW">🆕 Cliente nuevo</ion-select-option>
          <ion-select-option value="RETURNING">👤 Cliente antiguo</ion-select-option>
        </ion-select>
      </ion-item>

      <!-- Precio/propina solo aplican a un corte de pelo; una venta de
           producto no los tiene, igual que en el formulario de registro. -->
      <ng-container *ngIf="isHaircutRecord">
        <ion-item>
          <ion-label position="stacked">Precio del corte</ion-label>
          <ion-input type="text" inputmode="numeric" [(appThousands)]="service.price"></ion-input>
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Propina</ion-label>
          <ion-input type="text" inputmode="numeric" [(appThousands)]="service.tip"></ion-input>
        </ion-item>
      </ng-container>

      <!-- PRODUCTOS: solo en ventas de producto, igual que en el registro. -->
      <ng-container *ngIf="!isHaircutRecord">
        <p class="cart-heading">🧴 Productos de este registro</p>
        <ion-list *ngIf="editableProducts.length > 0" class="ion-margin-bottom">
          <ion-item *ngFor="let sp of editableProducts; let i = index">
            <ion-label>
              <strong>{{ getProductName(sp.productId) }}</strong>
              <p>
                {{ sp.type === 'SOLD' ? '🛍️ Vendido' : '🧴 Usado' }}
                <a class="toggle-type-link" (click)="moveUnitToOtherType(i)">
                  — {{ sp.quantity > 1 ? ('mover 1 a ' + (sp.type === 'SOLD' ? 'usado' : 'vendido')) : ('marcar como ' + (sp.type === 'SOLD' ? 'usado' : 'vendido')) }}
                </a>
              </p>
            </ion-label>
            <div class="qty-stepper-controls" slot="end">
              <ion-button fill="clear" size="small" (click)="changeProductQty(i, -1)">
                <ion-icon slot="icon-only" name="remove-circle-outline"></ion-icon>
              </ion-button>
              <span class="qty-badge">x{{ sp.quantity }}</span>
              <ion-button fill="clear" size="small" (click)="changeProductQty(i, 1)">
                <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
        <p class="field-hint" *ngIf="editableProducts.length === 0">Este registro no tiene productos asociados.</p>

        <p class="cart-heading">➕ Agregar {{ editableProducts.length > 0 ? 'otro' : 'un' }} producto</p>
        <ion-item>
          <ion-label position="stacked">Producto</ion-label>
          <ion-select [(ngModel)]="selectedProduct.productId" (ionChange)="onSelectedProductChange()">
            <ion-select-option *ngFor="let p of products" [value]="p.id" [disabled]="availableAfterCart(p.id) <= 0">
              {{ p.name }} — {{ availableAfterCart(p.id) <= 0 ? 'Agotado' : (availableAfterCart(p.id) + ' disponibles') }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <p class="field-hint pending-warning" *ngIf="selectedProduct.productId">
          ⚠️ Aún no está en la lista de arriba — toca "+ Agregar producto", o se agregará solo al guardar.
        </p>

        <p class="field-hint price-preview" *ngIf="selectedProductInfo">
          💲 Precio unitario: {{ selectedProductInfo.product.salePrice | currency:'COP':'symbol-narrow':'1.0-0' }}
          <ng-container *ngIf="selectedProduct.quantity > 1">
            — Subtotal ({{ selectedProduct.quantity }} u.): {{ selectedProductInfo.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}
          </ng-container>
        </p>

        <ion-item>
          <ion-label position="stacked">¿Se vendió o se usó?</ion-label>
          <ion-select [(ngModel)]="selectedProduct.type">
            <ion-select-option value="SOLD">🛍️ Vendido al cliente (se cobra)</ion-select-option>
            <ion-select-option value="USED">🧴 Usado (no se cobra aparte)</ion-select-option>
          </ion-select>
        </ion-item>

        <div class="qty-stepper ion-margin-bottom">
          <span class="qty-stepper-label">Cantidad</span>
          <div class="qty-stepper-controls">
            <ion-button fill="clear" (click)="changeSelectedQty(-1)">
              <ion-icon slot="icon-only" name="remove-circle-outline"></ion-icon>
            </ion-button>
            <ion-input type="number" min="1" [(ngModel)]="selectedProduct.quantity" class="qty-stepper-input"></ion-input>
            <ion-button fill="clear" (click)="changeSelectedQty(1)">
              <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
            </ion-button>
          </div>
        </div>

        <ion-button expand="block" fill="outline" (click)="addProduct()">
          + Agregar producto
        </ion-button>
      </ng-container>

      <ion-item class="ion-margin-top">
        <ion-label>Método de pago</ion-label>
        <ion-select [(ngModel)]="paymentMethod">
          <ion-select-option value="CASH">💵 Efectivo</ion-select-option>
          <ion-select-option value="QR">📱 QR</ion-select-option>
          <ion-select-option value="HYBRID">💳 Híbrido</ion-select-option>
        </ion-select>
      </ion-item>

      <ng-container *ngIf="paymentMethod === 'HYBRID'">
        <ion-item>
          <ion-label position="stacked">Efectivo</ion-label>
          <ion-input type="text" inputmode="numeric" [(appThousands)]="service.cashAmount"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">QR</ion-label>
          <ion-input type="text" inputmode="numeric" [(appThousands)]="service.qrAmount"></ion-input>
        </ion-item>
        <p class="field-hint" [class.danger]="hybridRemaining !== 0" [class.success]="hybridRemaining === 0">
          <ng-container *ngIf="hybridRemaining > 0">Faltan {{ hybridRemaining | currency:'COP':'symbol-narrow':'1.0-0' }} por asignar.</ng-container>
          <ng-container *ngIf="hybridRemaining < 0">Sobran {{ (hybridRemaining * -1) | currency:'COP':'symbol-narrow':'1.0-0' }}: revisa los montos.</ng-container>
          <ng-container *ngIf="hybridRemaining === 0">✅ Efectivo + QR cuadra con el total.</ng-container>
        </p>
        <ion-button size="small" fill="clear" (click)="fillRemainingInQr()">Completar el resto en QR</ion-button>
        <ion-item>
          <ion-label position="stacked">Nota del evento</ion-label>
          <ion-input type="text" [(ngModel)]="service.specialEvent"></ion-input>
        </ion-item>
      </ng-container>

      <div class="total-a-cobrar ion-margin-top">
        <span>💰 Total a cobrar</span>
        <strong>{{ finalAmountToPay | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
      </div>

      <ion-button expand="block" (click)="save()" [disabled]="isSubmitting" class="ion-margin-top">
        {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
      </ion-button>
    </ion-content>
  `,
  styles: [`
    .field-hint {
      margin: 2px 0 14px 4px;
      font-size: 0.78rem;
      color: var(--app-muted, #a1a1aa);
    }
    .field-hint.danger { color: var(--ion-color-danger-tint); }
    .field-hint.success { color: var(--ion-color-success-tint); }
    .price-preview { color: var(--ion-color-success-tint); margin-top: -6px; }
    .pending-warning { color: var(--ion-color-warning-tint); margin-top: -6px; }
    .toggle-type-link {
      color: var(--ion-color-primary-tint, #6690ff);
      text-decoration: underline;
      cursor: pointer;
    }
    .cart-heading {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--app-muted, #a1a1aa);
      margin: 14px 4px 6px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .qty-stepper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px 0;
    }
    .qty-stepper-label { color: var(--app-muted, #a1a1aa); font-size: 0.85rem; }
    .qty-stepper-controls { display: flex; align-items: center; gap: 2px; }
    .qty-stepper-controls ion-button { --padding-start: 4px; --padding-end: 4px; margin: 0; height: 32px; }
    .qty-stepper-input { width: 48px; text-align: center; --padding-start: 0; --padding-end: 0; }
    .qty-badge { min-width: 28px; text-align: center; font-weight: 600; }
    .total-a-cobrar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--app-surface, #18181c);
      font-size: 1.05rem;
    }
  `]
})
export class EditServiceModalComponent implements OnInit {
  @Input() service: any;
  paymentMethod = 'CASH';
  products: any[] = [];
  originalProducts: EditableProduct[] = [];
  editableProducts: EditableProduct[] = [];
  selectedProduct: EditableProduct = { productId: '', quantity: 1, type: 'SOLD' };
  private API = environment.apiUrl;

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private auth: AuthService
  ) {
    addIcons({ addCircleOutline, removeCircleOutline });
  }

  // Se fija una sola vez al abrir, según cómo se creó el registro — igual
  // que en el formulario de registro, un corte y una venta de producto son
  // dos cosas separadas, así que acá también se editan por separado.
  isHaircutRecord = false;

  get modalTitle(): string {
    if (this.isHaircutRecord) return 'Editar Corte de Pelo';
    if (this.editableProducts.length > 0) return 'Editar Venta de Producto';
    return 'Editar Registro';
  }

  ngOnInit() {
    this.isHaircutRecord = this.service.price > 0;

    // Detectar método de pago actual al abrir
    if (this.service.qrAmount > 0 && this.service.cashAmount > 0) {
      this.paymentMethod = 'HYBRID';
    } else if (this.service.qrAmount > 0) {
      this.paymentMethod = 'QR';
    } else {
      this.paymentMethod = 'CASH';
    }

    // Los productos vienen con la forma completa de Prisma (incluye el objeto
    // "product"); acá los reducimos a lo mínimo editable.
    this.originalProducts = (this.service.products || []).map((sp: any) => ({
      productId: sp.productId, quantity: sp.quantity, type: sp.type
    }));
    this.editableProducts = this.originalProducts.map((p: EditableProduct) => ({ ...p }));

    this.loadProducts();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  loadProducts() {
    this.http.get<any[]>(`${this.API}/products`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.products = res,
      error: () => console.error('Error cargando productos')
    });
  }

  getProductName(productId: string) {
    return this.products.find(p => p.id === productId)?.name || productId;
  }

  // Cuánto de este producto ya estaba en el registro original (ese stock
  // sigue "reservado" para este mismo servicio, así que cuenta como disponible).
  private originalQty(productId: string): number {
    return this.originalProducts.filter(p => p.productId === productId).reduce((sum, p) => sum + p.quantity, 0);
  }

  private qtyInCart(productId: string): number {
    return this.editableProducts.filter(p => p.productId === productId).reduce((sum, p) => sum + p.quantity, 0);
  }

  // Stock real disponible para este registro: lo que queda en el catálogo,
  // más lo que este mismo servicio ya tenía reservado antes de editar.
  availableAfterCart(productId: string): number {
    const product = this.products.find(p => p.id === productId);
    if (!product) return 0;
    return product.stock + this.originalQty(productId) - this.qtyInCart(productId);
  }

  get selectedProductInfo() {
    const product = this.products.find(p => p.id === this.selectedProduct.productId);
    if (!product) return null;
    const qty = Number(this.selectedProduct.quantity) || 0;
    return { product, subtotal: product.salePrice * qty };
  }

  changeSelectedQty(delta: number) {
    const max = this.availableAfterCart(this.selectedProduct.productId);
    const next = Number(this.selectedProduct.quantity) + delta;
    if (next < 1 || next > max) return;
    this.selectedProduct.quantity = next;
  }

  // Ver la nota en home.page.ts: el tipo y la cantidad no deben arrastrarse
  // de un producto al elegir otro distinto en el mini-formulario.
  onSelectedProductChange() {
    this.selectedProduct.type = 'SOLD';
    this.selectedProduct.quantity = 1;
  }

  // true si quedó agregado; false si había algo pendiente que no se pudo
  // agregar (stock insuficiente, etc.) — así save() sabe si debe abortar.
  addProduct(): boolean {
    if (!this.selectedProduct.productId || Number(this.selectedProduct.quantity) <= 0) {
      alert('Por favor selecciona un producto y una cantidad válida.');
      return false;
    }
    const product = this.products.find(p => p.id === this.selectedProduct.productId);
    const requestedQty = Number(this.selectedProduct.quantity);
    const available = this.availableAfterCart(this.selectedProduct.productId);

    if (!product) {
      alert('Ese producto ya no existe.');
      return false;
    }
    if (requestedQty > available) {
      alert(`Solo quedan ${available} unidades disponibles de ${product.name}.`);
      return false;
    }

    const existing = this.editableProducts.find(
      sp => sp.productId === this.selectedProduct.productId && sp.type === this.selectedProduct.type
    );
    if (existing) {
      existing.quantity += requestedQty;
    } else {
      this.editableProducts.push({ ...this.selectedProduct, quantity: requestedQty });
    }

    this.selectedProduct = { productId: '', quantity: 1, type: 'SOLD' };
    return true;
  }

  removeProduct(index: number) {
    this.editableProducts.splice(index, 1);
  }

  // Corrige el tipo de un producto YA agregado moviendo UNA unidad a la vez
  // al otro tipo (ej. de 2 Minoxidil marcados como "vendido", en realidad
  // uno se usó — clic una vez y queda 1 vendido + 1 usado, en vez de
  // cambiar las 2 unidades de una). Si ya existe otra línea del mismo
  // producto con el tipo destino, la unidad se suma ahí en vez de crear una
  // línea duplicada; si la línea de origen se queda en 0, se elimina.
  moveUnitToOtherType(index: number) {
    const item = this.editableProducts[index];
    const newType = item.type === 'SOLD' ? 'USED' : 'SOLD';

    item.quantity -= 1;

    const targetIndex = this.editableProducts.findIndex(
      (sp, i) => i !== index && sp.productId === item.productId && sp.type === newType
    );
    if (targetIndex !== -1) {
      this.editableProducts[targetIndex].quantity += 1;
    } else {
      this.editableProducts.push({ productId: item.productId, quantity: 1, type: newType });
    }

    if (item.quantity <= 0) {
      this.editableProducts.splice(index, 1);
    }
  }

  changeProductQty(index: number, delta: number) {
    const item = this.editableProducts[index];
    const otherQty = this.editableProducts
      .filter((sp, i) => i !== index && sp.productId === item.productId)
      .reduce((sum, sp) => sum + sp.quantity, 0);
    const product = this.products.find(p => p.id === item.productId);
    const max = product ? product.stock + this.originalQty(item.productId) - otherQty : 999;
    const next = item.quantity + delta;
    if (next < 1) {
      this.removeProduct(index);
      return;
    }
    if (next > max) {
      alert(`Solo quedan ${max} unidades disponibles de ${product?.name}.`);
      return;
    }
    item.quantity = next;
  }

  get soldProductsTotal(): number {
    let total = 0;
    this.editableProducts.forEach(item => {
      const matched = this.products.find(p => p.id === item.productId);
      if (matched && item.type === 'SOLD') total += matched.salePrice * item.quantity;
    });
    return total;
  }

  get finalAmountToPay(): number {
    return (Number(this.service.price) || 0) + (Number(this.service.tip) || 0) + this.soldProductsTotal;
  }

  get hybridAssigned(): number {
    return (Number(this.service.cashAmount) || 0) + (Number(this.service.qrAmount) || 0);
  }

  get hybridRemaining(): number {
    return this.finalAmountToPay - this.hybridAssigned;
  }

  fillRemainingInQr() {
    this.service.qrAmount = Math.max(0, this.finalAmountToPay - (Number(this.service.cashAmount) || 0));
  }

  isSubmitting = false;

  save() {
    if (this.isSubmitting) return;

    // Si quedó un producto elegido en el mini-formulario pero nunca se
    // presionó "+ Agregar producto", lo agregamos aquí antes de guardar —
    // de lo contrario se perdía en silencio.
    if (this.selectedProduct.productId && !this.addProduct()) {
      return;
    }

    const finalAmountToPay = this.finalAmountToPay;

    if (this.paymentMethod === 'CASH') {
      this.service.cashAmount = finalAmountToPay;
      this.service.qrAmount = 0;
    } else if (this.paymentMethod === 'QR') {
      this.service.qrAmount = finalAmountToPay;
      this.service.cashAmount = 0;
    } else if (this.paymentMethod === 'HYBRID' && this.hybridRemaining !== 0) {
      alert(`Efectivo + QR debe sumar ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(finalAmountToPay)}. Ajusta los montos antes de guardar.`);
      return;
    }

    const payload = {
      price: this.service.price,
      tip: this.service.tip,
      cashAmount: this.service.cashAmount,
      qrAmount: this.service.qrAmount,
      specialEvent: this.service.specialEvent,
      clientType: this.service.clientType,
      products: this.editableProducts
    };

    this.isSubmitting = true;
    this.http.patch(`${this.API}/services/${this.service.id}`, payload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.modalCtrl.dismiss({ updated: true });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        alert('Error al actualizar: ' + (err.error?.message || 'Error desconocido'));
      }
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
