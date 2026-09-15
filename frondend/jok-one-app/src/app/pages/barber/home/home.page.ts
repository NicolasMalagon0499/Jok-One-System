import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { AuthService } from '../../../services/auth';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, addCircleOutline, removeCircleOutline } from 'ionicons/icons';
import { EditServiceModalComponent } from '../../../components/edit-service-modal/edit-service-modal.component';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';
import { environment } from '../../../../environments/environment';
import { formatLongDateEs } from '../../../utils/format-date';
import {
  IonContent, IonHeader, IonToolbar, IonButton, IonInput,
  IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonSelect, IonSelectOption, IonIcon, IonRow, IonCol,
  IonCardSubtitle, IonList, IonDatetime, ModalController, ViewWillEnter
} from '@ionic/angular/standalone';

const API = environment.apiUrl;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonButton, IonInput,
    IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonSelect, IonSelectOption, IonIcon, IonRow, IonCol,
    CommonModule, FormsModule, IonCardSubtitle, IonList, IonDatetime, ThemeToggleComponent
  ]
})
export class HomePage implements OnInit, ViewWillEnter {

  user: any;
  products: any[] = [];
  earnings: any = {};
  history: any[] = [];
  paymentMethod = 'CASH';
  period = 'daily';
  customDate: string = '';
  editingService: any = null;

  get selectedPeriodDateLabel(): string {
    return formatLongDateEs(this.customDate);
  }

  get historyPeriodLabel(): string {
    switch (this.period) {
      case 'daily': return 'de hoy';
      case 'weekly': return 'de esta semana';
      case 'biweekly': return 'de esta quincena';
      case 'monthly': return 'de este mes';
      case 'custom': return this.customDate ? `del ${this.selectedPeriodDateLabel}` : '';
      default: return '';
    }
  }

  // false = registrar corte (+ productos opcionales), true = solo venta/uso de producto sin corte
  productOnlyMode = false;

  guaranteeStatus = { hasServicesToday: false, claimed: false };

  cashClose: any = {
    hasBase: false, base: 0, totalCash: 0, totalAdvances: 0,
    advances: [] as any[], expectedCash: 0, grossEarned: 0, netToPay: 0
  };
  newBaseAmount = 50000;
  newAdvance = { amount: 0, note: '' };

  // El corte de pelo es puramente el servicio (precio + propina); ya no
  // carga productos — esos se registran aparte en el formulario de "Registrar
  // producto", donde tiene sentido elegir si cada uno se vendió o se usó.
  service = {
    price: 0,
    tip: 0,
    cashAmount: 0,
    qrAmount: 0,
    specialEvent: '',
    clientType: 'RETURNING',
    barberId: '',
    products: [] as { productId: string; quantity: number; type: string }[]
  };

  constructor(private auth: AuthService, private http: HttpClient,
     private router: Router, private modalCtrl: ModalController,) {
    addIcons({ createOutline, trashOutline, addCircleOutline, removeCircleOutline });
  }

     toggleDarkTheme(shouldAdd: boolean) {
  document.body.classList.toggle('dark', shouldAdd);
}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.service.barberId = this.user.id;
    this.loadProducts();
    this.loadEarnings();
    this.loadHistory();
    this.loadGuaranteeStatus();
    this.loadCashClose();
  }

  // Ionic reutiliza la instancia de esta página al volver a ella (no vuelve
  // a correr ngOnInit); sin esto, el stock de productos podía quedar
  // desactualizado si otro barbero o el admin vendía algo mientras tanto.
  ionViewWillEnter() {
    this.loadProducts();
  }

get displayedTotal() {
  // El backend ya aplica la garantía mínima diaria cuando corresponde
  // (incluida la garantía manual de un día sin clientes); no forzar 30k acá,
  // o un día de descanso sin nada registrado se vería pagado igual.
  return this.earnings?.barberTotal || 0;
}

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  loadProducts() {
    this.http.get<any[]>(`${API}/products`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.products = res,
      error: () => console.error('Error cargando productos')
    });
  }

  loadEarnings() {
    let endpoint = `${API}/services/${this.period}/${this.user.id}`;

    if (this.period === 'custom') {
      if (!this.customDate) return;
      const formattedDate = this.customDate.split('T')[0];
      endpoint = `${API}/services/daily/${this.user.id}?date=${formattedDate}`;
    } else if (this.period === 'daily') {
      endpoint = `${API}/services/daily/${this.user.id}`;
    }

    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res.barbers) {
          const myEarnings = res.barbers.find((b: any) => b.barberId === this.user.id);
          this.earnings = myEarnings || {};
        } else {
          this.earnings = res;
        }
      },
      error: () => console.error('Error cargando ganancias')
    });
  }

  allHistory: any[] = [];

  loadHistory() {
    this.http.get<any[]>(`${API}/services/history/${this.user.id}`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.allHistory = res || [];
        this.filterHistoryLocally();
      },
      error: () => console.error('Error cargando historial')
    });
  }

  // El historial siempre refleja el mismo período seleccionado arriba para
  // las ganancias, en vez de tener su propio filtro de fecha independiente
  // (eso confundía cuál período se estaba viendo).
  filterHistoryLocally() {
    const today = new Date();

    if (this.period === 'daily') {
      const todayStr = today.toLocaleDateString('en-CA');
      this.history = this.allHistory.filter(s => new Date(s.createdAt).toLocaleDateString('en-CA') === todayStr);
    } else if (this.period === 'custom' && this.customDate) {
      const customStr = this.customDate.split('T')[0];
      this.history = this.allHistory.filter(s => new Date(s.createdAt).toLocaleDateString('en-CA') === customStr);
    } else if (this.period === 'custom') {
      this.history = [];
    } else if (this.period === 'weekly') {
      const weekStart = this.getStartOfWeek(today);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59);
      this.history = this.allHistory.filter(s => {
        const d = new Date(s.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
    } else if (this.period === 'biweekly') {
      const day = today.getDate();
      const year = today.getFullYear();
      const month = today.getMonth();
      const start = day <= 15 ? new Date(year, month, 1) : new Date(year, month, 16);
      const end = day <= 15 ? new Date(year, month, 15, 23, 59, 59) : new Date(year, month + 1, 0, 23, 59, 59);
      this.history = this.allHistory.filter(s => {
        const d = new Date(s.createdAt);
        return d >= start && d <= end;
      });
    } else if (this.period === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      this.history = this.allHistory.filter(s => {
        const d = new Date(s.createdAt);
        return d >= start && d <= end;
      });
    } else {
      this.history = [...this.allHistory];
    }
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // lunes como inicio
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Un registro del historial puede ser un corte (price > 0), una venta de
  // producto sin corte (price === 0 con productos), o un registro sin cobro.
  isProductOnly(s: any): boolean {
    return (!s.price || s.price === 0) && s.products?.length > 0;
  }

  isEmptyRecord(s: any): boolean {
    return (!s.price || s.price === 0) && !(s.products?.length > 0);
  }

  getRecordIcon(s: any): string {
    if (s.price > 0) return '💈';
    if (this.isProductOnly(s)) return '🧴';
    return '⚠️';
  }

  getRecordLabel(s: any): string {
    if (s.price > 0) return 'Corte de pelo';
    if (this.isProductOnly(s)) return 'Venta de producto (sin corte)';
    return 'Registro sin cobro';
  }

  getProductLine(sp: any): string {
    const name = sp.product?.name || 'Producto';
    const qty = sp.quantity || 1;
    if (sp.type === 'SOLD') {
      const total = (sp.product?.salePrice || 0) * qty;
      return `${name} x${qty} — Vendido (${this.formatCurrency(total)})`;
    }
    return `${name} x${qty} — Usado (no se cobró aparte)`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  }

  onPeriodChange() {
    if (this.period !== 'custom') {
      this.customDate = '';
      this.loadEarnings();
      this.filterHistoryLocally();
    }
  }

  onCustomPeriodDateChange() {
    if (this.customDate) {
      this.loadEarnings();
      this.filterHistoryLocally();
    }
  }

  onPaymentMethodChange() {
    this.service.cashAmount = 0;
    this.service.qrAmount = 0;
    this.service.specialEvent = '';
  }

  loadGuaranteeStatus() {
    this.http.get<{ hasServicesToday: boolean; claimed: boolean }>(
      `${API}/services/guarantee-status/${this.user.id}`, { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => this.guaranteeStatus = res,
      error: () => console.error('Error consultando estado de garantía')
    });
  }

  claimGuarantee() {
    this.http.post<any>(`${API}/services/guarantee/${this.user.id}`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadGuaranteeStatus();
        this.loadEarnings();
        alert('Garantía de hoy solicitada.');
      },
      error: (err) => alert(err.error?.message || 'No se pudo solicitar la garantía')
    });
  }

  loadCashClose() {
    this.http.get<any>(`${API}/services/cash-close/${this.user.id}`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.cashClose = res;
        if (!res.hasBase) this.newBaseAmount = 50000;
      },
      error: () => console.error('Error cargando cierre de caja')
    });
  }

  setCashBase() {
    if (!this.newBaseAmount || this.newBaseAmount <= 0) {
      alert('Ingresa un monto de base válido.');
      return;
    }
    this.http.post<any>(`${API}/services/cash-base/${this.user.id}`, { amount: this.newBaseAmount }, { headers: this.getHeaders() }).subscribe({
      next: () => this.loadCashClose(),
      error: () => alert('No se pudo registrar la base de hoy')
    });
  }

  addCashAdvance() {
    if (!this.newAdvance.amount || this.newAdvance.amount <= 0) {
      alert('Ingresa un monto de vale válido.');
      return;
    }
    this.http.post<any>(`${API}/services/cash-advance/${this.user.id}`, this.newAdvance, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.newAdvance = { amount: 0, note: '' };
        this.loadCashClose();
      },
      error: (err) => alert(err.error?.message || 'No se pudo registrar el vale')
    });
  }

  removeCashAdvance(id: string) {
    if (!confirm('¿Eliminar este vale?')) return;
    this.http.delete(`${API}/services/cash-advance/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.loadCashClose(),
      error: () => alert('No se pudo eliminar el vale')
    });
  }

  setProductOnlyMode(value: boolean) {
    this.productOnlyMode = value;
  }

  // Todo lo que representa cobro real al cliente por el corte: precio + propina.
  get finalAmountToPay(): number {
    return (Number(this.service.price) || 0) + (Number(this.service.tip) || 0);
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

  createService() {
    // Sin esta guarda, un doble-tap (o un tap mientras la petición anterior
    // seguía en vuelo) mandaba dos veces el mismo servicio — con el carrito
    // de productos ya vacío la segunda vez, dejando un registro incompleto.
    if (this.isSubmitting) return;

    const finalAmountToPay = this.finalAmountToPay;

    if (this.paymentMethod === 'CASH') {
      this.service.cashAmount = finalAmountToPay;
      this.service.qrAmount = 0;
    } else if (this.paymentMethod === 'QR') {
      this.service.qrAmount = finalAmountToPay;
      this.service.cashAmount = 0;
    } else if (this.paymentMethod === 'HYBRID') {
      // El barbero indica cuánto pagó en efectivo y cuánto en QR; deben sumar el total a cobrar.
      if (this.hybridRemaining !== 0) {
        alert(`Efectivo + QR debe sumar ${this.formatCurrency(finalAmountToPay)}. Ajusta los montos antes de guardar.`);
        return;
      }
    }

    this.isSubmitting = true;
    this.http.post<any>(`${API}/services/create`, this.service, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.isSubmitting = false;
        // Inicializar objeto limpio para el siguiente flujo de venta
        this.service = { price: 0, tip: 0, cashAmount: 0, qrAmount: 0, specialEvent: '', clientType: 'RETURNING', barberId: this.user.id, products: [] };
        this.paymentMethod = 'CASH';

        // 3. REACTIVIDAD: Volvemos a traer los productos para descontar el Stock visual del barbero y admin
        this.loadProducts();
        this.loadEarnings();
        this.loadHistory();
        this.loadGuaranteeStatus();
        this.loadCashClose();
        alert('¡Servicio registrado con éxito!');
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMsg = err.error?.message || 'Error registrando servicio';
        alert(errorMsg);
      }
    });
  }

  // ===== FORMULARIO INDEPENDIENTE: registrar producto(s) =====
  // Deliberadamente separado del formulario de "Corte de pelo": el corte es
  // puramente el servicio (precio + propina) y no carga productos. Acá, en
  // cambio, se pueden agregar varios productos distintos a un mismo
  // registro, cada uno marcado como vendido o usado — ej. usó una cera, usó
  // un minoxidil y vendió 2 aftershave, todo en la misma venta.

  productSale = {
    cashAmount: 0,
    qrAmount: 0,
    specialEvent: '',
    clientType: 'RETURNING',
    products: [] as { productId: string; quantity: number; type: string }[]
  };

  saleSelectedProduct = { productId: '', quantity: 1, type: 'SOLD' };
  salePaymentMethod = 'CASH';
  saleIsSubmitting = false;

  qtyAlreadyInSale(productId: string): number {
    return this.productSale.products
      .filter(sp => sp.productId === productId)
      .reduce((sum, sp) => sum + sp.quantity, 0);
  }

  availableForSale(productId: string): number {
    const product = this.products.find(p => p.id === productId);
    if (!product) return 0;
    return product.stock - this.qtyAlreadyInSale(productId);
  }

  get saleSelectedProductInfo() {
    const product = this.products.find(p => p.id === this.saleSelectedProduct.productId);
    if (!product) return null;
    const qty = Number(this.saleSelectedProduct.quantity) || 0;
    return { product, subtotal: product.salePrice * qty };
  }

  // Al cambiar de producto, el tipo (vendido/usado) y la cantidad no deben
  // arrastrarse del producto anterior — ver la misma nota en la sección de
  // corte de pelo (ya eliminada de acá, pero el motivo aplica igual).
  onSaleProductChange() {
    this.saleSelectedProduct.type = 'SOLD';
    this.saleSelectedProduct.quantity = 1;
  }

  changeSaleSelectedQty(delta: number) {
    const max = this.availableForSale(this.saleSelectedProduct.productId);
    const next = Number(this.saleSelectedProduct.quantity) + delta;
    if (next < 1 || next > max) return;
    this.saleSelectedProduct.quantity = next;
  }

  addSaleProduct(): boolean {
    if (!this.saleSelectedProduct.productId) {
      alert('Por favor selecciona un producto y una cantidad válida.');
      return false;
    }
    if (Number(this.saleSelectedProduct.quantity) <= 0) {
      alert('Por favor selecciona un producto y una cantidad válida.');
      return false;
    }

    const product = this.products.find(p => p.id === this.saleSelectedProduct.productId);
    const requestedQty = Number(this.saleSelectedProduct.quantity);
    const available = this.availableForSale(this.saleSelectedProduct.productId);

    if (!product || product.stock <= 0) {
      alert('Ese producto está agotado.');
      return false;
    }
    if (requestedQty > available) {
      alert(`Solo quedan ${available} unidades disponibles de ${product.name}.`);
      return false;
    }

    // Si ya habías agregado este mismo producto con el mismo tipo (vendido o
    // usado), sumamos la cantidad en la misma línea en vez de duplicarla.
    const existing = this.productSale.products.find(
      sp => sp.productId === this.saleSelectedProduct.productId && sp.type === this.saleSelectedProduct.type
    );
    if (existing) {
      existing.quantity += requestedQty;
    } else {
      this.productSale.products.push({
        productId: this.saleSelectedProduct.productId,
        quantity: requestedQty,
        type: this.saleSelectedProduct.type
      });
    }

    this.saleSelectedProduct = { productId: '', quantity: 1, type: 'SOLD' };
    return true;
  }

  removeSaleProduct(index: number) {
    this.productSale.products.splice(index, 1);
  }

  changeSaleProductQty(index: number, delta: number) {
    const item = this.productSale.products[index];
    const product = this.products.find(p => p.id === item.productId);
    const otherQty = this.productSale.products
      .filter((sp, i) => i !== index && sp.productId === item.productId)
      .reduce((sum, sp) => sum + sp.quantity, 0);
    const max = product ? product.stock - otherQty : 999;
    const next = item.quantity + delta;
    if (next < 1) {
      this.removeSaleProduct(index);
      return;
    }
    if (next > max) {
      alert(`Solo quedan ${max} unidades disponibles de ${product?.name}.`);
      return;
    }
    item.quantity = next;
  }

  getSaleProductName(productId: string) {
    return this.products.find(p => p.id === productId)?.name || productId;
  }

  // Solo los productos vendidos cobran; los usados no se cobran aparte.
  get saleTotal(): number {
    let total = 0;
    this.productSale.products.forEach(item => {
      const matched = this.products.find(p => p.id === item.productId);
      if (matched && item.type === 'SOLD') total += matched.salePrice * item.quantity;
    });
    return total;
  }

  get saleHybridAssigned(): number {
    return (Number(this.productSale.cashAmount) || 0) + (Number(this.productSale.qrAmount) || 0);
  }

  get saleHybridRemaining(): number {
    return this.saleTotal - this.saleHybridAssigned;
  }

  fillSaleRemainingInQr() {
    this.productSale.qrAmount = Math.max(0, this.saleTotal - (Number(this.productSale.cashAmount) || 0));
  }

  onSalePaymentMethodChange() {
    this.productSale.cashAmount = 0;
    this.productSale.qrAmount = 0;
  }

  createProductSale() {
    if (this.saleIsSubmitting) return;

    if (this.saleSelectedProduct.productId && !this.addSaleProduct()) {
      return;
    }

    if (this.productSale.products.length === 0) {
      alert('Agrega al menos un producto antes de registrar.');
      return;
    }

    const total = this.saleTotal;

    if (this.salePaymentMethod === 'CASH') {
      this.productSale.cashAmount = total;
      this.productSale.qrAmount = 0;
    } else if (this.salePaymentMethod === 'QR') {
      this.productSale.qrAmount = total;
      this.productSale.cashAmount = 0;
    } else if (this.salePaymentMethod === 'HYBRID' && this.saleHybridRemaining !== 0) {
      alert(`Efectivo + QR debe sumar ${this.formatCurrency(total)}. Ajusta los montos antes de guardar.`);
      return;
    }

    const payload = {
      price: 0,
      tip: 0,
      cashAmount: this.productSale.cashAmount,
      qrAmount: this.productSale.qrAmount,
      specialEvent: this.productSale.specialEvent,
      clientType: this.productSale.clientType,
      barberId: this.user.id,
      products: this.productSale.products.map(p => ({ productId: p.productId, quantity: p.quantity, type: p.type }))
    };

    this.saleIsSubmitting = true;
    this.http.post<any>(`${API}/services/create`, payload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.saleIsSubmitting = false;
        this.productSale = { cashAmount: 0, qrAmount: 0, specialEvent: '', clientType: 'RETURNING', products: [] };
        this.saleSelectedProduct = { productId: '', quantity: 1, type: 'SOLD' };
        this.salePaymentMethod = 'CASH';

        this.loadProducts();
        this.loadEarnings();
        this.loadHistory();
        this.loadGuaranteeStatus();
        this.loadCashClose();
        alert('¡Venta de producto registrada con éxito!');
      },
      error: (err) => {
        this.saleIsSubmitting = false;
        alert(err.error?.message || 'Error registrando la venta');
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
  // ESTO ES LO QUE VA EN TU HOME.PAGE.TS
deleteService(id: string) {
  if (confirm('¿Estás seguro de eliminar este servicio?')) {
    this.http.delete(`${API}/services/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => {
        alert('Servicio eliminado');
        this.loadEarnings(); // Recargar datos
        this.loadHistory();
        this.loadGuaranteeStatus();
        this.loadCashClose();
      },
      error: (err) => alert('Error al eliminar: ' + err.message)
    });
  }
}


async editService(service: any) {
    const modal = await this.modalCtrl.create({
      component: EditServiceModalComponent,
      componentProps: { service }
    });
    
    await modal.present();
    
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      this.loadHistory();
      this.loadEarnings();
      // Sin esto, "Caja del día" (Efectivo cobrado, Ganado hoy, etc.) se
      // quedaba con los montos de ANTES de la edición — ej. si corregías un
      // producto de "vendido" a "usado", la ganancia de arriba se
      // actualizaba pero "Ganado hoy" seguía mostrando el monto viejo.
      this.loadCashClose();
      this.loadProducts();
    }
  }






}