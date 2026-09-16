import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonButton, IonBackButton, IonButtons,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonIcon,
  IonDatetime, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../../environments/environment';
import { formatLongDateEs } from '../../../utils/format-date';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';
import { EditAdvanceModalComponent } from '../../../components/edit-advance-modal/edit-advance-modal.component';

const API = environment.apiUrl;
@Component({
  selector: 'app-barber-detail',
  templateUrl: './barber-detail.page.html',
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonButton, IonBackButton, IonButtons,
    IonItem, IonLabel, IonSelect, IonSelectOption, IonIcon, CommonModule, FormsModule,
    IonDatetime, ThemeToggleComponent,
  ]
})
export class BarberDetailPage implements OnInit {
  allHistory: any[] = [];
  barberId = '';
  barberName = '';
  period = 'daily';
  earnings: any = null;
  cashClose: any = null;
  history: any[] = [];
  customDate: string = '';
  isAdmin: boolean = true;
  //businessShare
  constructor(
    private route: ActivatedRoute, private auth: AuthService, private http: HttpClient,
    private modalCtrl: ModalController
  ) {
    addIcons({ createOutline, trashOutline });
  }

  ngOnInit() {
    this.barberId = this.route.snapshot.paramMap.get('barberId') || '';
    this.barberName = this.route.snapshot.paramMap.get('barberName') || '';
    this.loadEarnings();
    this.loadHistory();
    this.loadCashClose();
  }

  async editCashAdvance(advance: any) {
    const modal = await this.modalCtrl.create({
      component: EditAdvanceModalComponent,
      componentProps: { advance: { id: advance.id, amount: advance.amount, note: advance.note } }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      this.loadCashClose();
    }
  }

  removeCashAdvance(id: string) {
    if (!confirm('¿Eliminar este vale?')) return;
    this.http.delete(`${API}/services/cash-advance/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.loadCashClose(),
      error: () => alert('No se pudo eliminar el vale')
    });
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }
selectedDate: string = ''; // ← vacío, no con fecha actual

loadEarnings() {
  let endpoint = '';
  
  if (this.period === 'custom') {
    if (!this.customDate) return;
    const formattedDate = this.customDate.split('T')[0];
    endpoint = `${API}/services/daily/${this.barberId}?date=${formattedDate}`;
  } else {
    endpoint = `${API}/services/${this.period}/${this.barberId}`;
  }

  this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
    next: (res) => this.earnings = res,
    error: (err) => console.error(err)
  });

  
}

 loadHistory() {
  this.http.get<any[]>(`${API}/services/history/${this.barberId}`, { headers: this.getHeaders() }).subscribe({
    next: (res) => {
      this.allHistory = res || [];
      this.filterHistoryLocally(); // Filtramos según el periodo actual
    },
    error: (err) => console.error('Error historial', err)
  });
}

 
  // El backend ya aplica la garantía mínima cuando corresponde (incluida la
  // garantía manual de un día sin clientes); no forzar 30k acá, o un día de
  // descanso sin nada registrado se vería como si se le hubiera pagado igual.
get totalAPagar() {
  return this.earnings?.barberTotal || 0;
}

get selectedDateLabel(): string {
  return formatLongDateEs(this.customDate);
}

// Un registro del historial puede ser un corte (price > 0), una venta de
// producto sin corte (price === 0 con productos), o un registro sin cobro
// (ej. dato de prueba); distinguirlos evita confundir "$0" con un error.
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

// El cierre de caja (base + vales) solo tiene sentido para un día puntual,
// no para acumulados de semana/quincena/mes.
loadCashClose() {
  if (this.period !== 'daily' && this.period !== 'custom') {
    this.cashClose = null;
    return;
  }
  if (this.period === 'custom' && !this.customDate) {
    this.cashClose = null;
    return;
  }
  let url = `${API}/services/cash-close/${this.barberId}`;
  if (this.period === 'custom') {
    url += `?date=${this.customDate.split('T')[0]}`;
  }
  this.http.get<any>(url, { headers: this.getHeaders() }).subscribe({
    next: (res) => this.cashClose = res,
    error: () => this.cashClose = null
  });
}


onPeriodChange() {
    // Si cambia a algo diferente de custom, cargamos de una vez
    if (this.period !== 'custom') {
      this.customDate = ''; // Limpiamos fecha personalizada si cambia a otro filtro
      this.loadEarnings();
      this.filterHistoryLocally();
      this.loadCashClose();
    }
  }

  onCustomDateChange() {
    // Se ejecuta al seleccionar la fecha en el ion-datetime
    if (this.customDate) {
      this.loadEarnings();
      this.filterHistoryLocally();
      this.loadCashClose();
    }
  }

  filterHistoryLocally() {
  const today = new Date();

  if (this.period === 'daily') {
    const todayStr = today.toLocaleDateString('en-CA');
    this.history = this.allHistory.filter(s => {
      return new Date(s.createdAt).toLocaleDateString('en-CA') === todayStr;
    });
  } 
  else if (this.period === 'custom' && this.customDate) {
    const customStr = this.customDate.split('T')[0];
    this.history = this.allHistory.filter(s => {
      return new Date(s.createdAt).toLocaleDateString('en-CA') === customStr;
    });
  }
  else if (this.period === 'weekly') {
    const weekStart = this.getStartOfWeek(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59);
    this.history = this.allHistory.filter(s => {
      const d = new Date(s.createdAt);
      return d >= weekStart && d <= weekEnd;
    });
  }
  else if (this.period === 'biweekly') {
    const day = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = day <= 15 ? new Date(year, month, 1) : new Date(year, month, 16);
    const end = day <= 15 ? new Date(year, month, 15, 23, 59, 59) : new Date(year, month + 1, 0, 23, 59, 59);
    this.history = this.allHistory.filter(s => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });
  }
  else if (this.period === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    this.history = this.allHistory.filter(s => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });
  }
  else {
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

}