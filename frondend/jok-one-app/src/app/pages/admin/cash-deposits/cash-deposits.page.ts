import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  IonContent, IonHeader, IonToolbar, IonCard,
  IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonBackButton,
  IonButtons, IonDatetime, IonIcon, IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircleOutline, cashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../../environments/environment';
import { formatLongDateEs } from '../../../utils/format-date';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';
import { ThousandsDirective } from '../../../directives/thousands.directive';

const API = environment.apiUrl;

@Component({
  selector: 'app-cash-deposits',
  templateUrl: './cash-deposits.page.html',
  styleUrls: ['./cash-deposits.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonCard,
    IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonBackButton,
    IonButtons, IonDatetime, IonIcon, IonRefresher, IonRefresherContent,
    ThemeToggleComponent, ThousandsDirective
  ]
})
export class CashDepositsPage implements OnInit {

  rangeStart = '';
  rangeEnd = '';
  days: any[] = [];
  totalPending = 0;
  totalDeposited = 0;
  loading = false;

  // Fila que se está marcando como consignada ahora mismo (null = ninguna).
  depositingDate: string | null = null;
  depositForm = { amount: 0, note: '' };

  constructor(private auth: AuthService, private http: HttpClient) {
    addIcons({ checkmarkCircle, closeCircleOutline, cashOutline });
  }

  ngOnInit() {
    // Por defecto, la quincena actual (1-15 o 16-fin de mes): es lo que el
    // admin revisa normalmente para cuadrar cuentas.
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    let start: Date, end: Date;
    if (day <= 15) {
      start = new Date(year, month, 1);
      end = new Date(year, month, 15);
    } else {
      start = new Date(year, month, 16);
      end = new Date(year, month + 1, 0);
    }
    this.rangeStart = this.toIsoDate(start);
    this.rangeEnd = this.toIsoDate(end);
    this.loadSummary();
  }

  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  dateLabel(dateStr: string): string {
    return formatLongDateEs(dateStr);
  }

  get rangeStartLabel(): string {
    return formatLongDateEs(this.rangeStart);
  }

  get rangeEndLabel(): string {
    return formatLongDateEs(this.rangeEnd);
  }

  loadSummary() {
    if (!this.rangeStart || !this.rangeEnd) return;
    this.loading = true;
    const params = new HttpParams()
      .set('startDate', this.rangeStart.split('T')[0])
      .set('endDate', this.rangeEnd.split('T')[0]);

    this.http.get<any>(`${API}/cash-deposits`, { headers: this.getHeaders(), params }).subscribe({
      next: (res) => {
        this.days = res.days || [];
        this.totalPending = res.totalPending || 0;
        this.totalDeposited = res.totalDeposited || 0;
        this.loading = false;
      },
      error: () => {
        console.error('Error cargando el cierre de caja');
        this.loading = false;
      }
    });
  }

  onRangeChange() {
    if (!this.rangeStart || !this.rangeEnd) return;
    if (this.rangeStart.split('T')[0] > this.rangeEnd.split('T')[0]) {
      [this.rangeStart, this.rangeEnd] = [this.rangeEnd, this.rangeStart];
    }
    this.loadSummary();
  }

  refreshAll(event: any) {
    this.loadSummary();
    setTimeout(() => event.target.complete(), 500);
  }

  startDeposit(day: any) {
    this.depositingDate = day.date;
    this.depositForm = { amount: day.expectedCash > 0 ? day.expectedCash : 0, note: '' };
  }

  cancelDeposit() {
    this.depositingDate = null;
  }

  confirmDeposit(date: string) {
    if (!this.depositForm.amount || Number(this.depositForm.amount) <= 0) {
      alert('Ingresa el monto que se consignó.');
      return;
    }
    const payload = { depositedAmount: Number(this.depositForm.amount), note: this.depositForm.note };
    this.http.post(`${API}/cash-deposits/${date}`, payload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.depositingDate = null;
        this.loadSummary();
      },
      error: () => alert('Error registrando la consignación')
    });
  }

  undoDeposit(date: string) {
    if (!confirm('¿Deshacer esta consignación? El día volverá a quedar pendiente.')) return;
    this.http.delete(`${API}/cash-deposits/${date}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.loadSummary(),
      error: () => alert('Error deshaciendo la consignación')
    });
  }
}
