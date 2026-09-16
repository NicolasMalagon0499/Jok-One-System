import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, IonBadge, IonDatetime, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../../environments/environment';
import { formatLongDateEs } from '../../../utils/format-date';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';

const API = environment.apiUrl;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonSelect,
    IonSelectOption, IonBadge, IonDatetime, CommonModule, FormsModule, ThemeToggleComponent,
    IonRefresher, IonRefresherContent
  ]
})
export class DashboardPage implements OnInit {

  barbers: any[] = [];
  allBarbers: any[] = [];
  businessSummary: any = {};
  lowStockProducts: any[] = [];
  period = 'monthly';
  customDate: string = ''; // 📅 Variable para almacenar la fecha específica seleccionada

  get selectedDateLabel(): string {
    return formatLongDateEs(this.customDate);
  }

  // Los gastos (arriendo, servicios, etc.) se registran con cadencia mensual,
  // así que compararlos contra cualquier período que no sea el mes completo
  // (día, semana, quincena, fecha específica) es engañoso. Esa sección solo
  // se muestra cuando el período seleccionado es "Mes".
  get showExpenses(): boolean {
    return this.period === 'monthly';
  }

  constructor(private auth: AuthService, private http: HttpClient, public router: Router) {}

  ngOnInit() {
    this.loadEarnings();
    this.loadAllBarbers();
    this.loadLowStock();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

 loadEarnings() {
  let endpoint = `${API}/services/${this.period}`;
  let params = new HttpParams();

  if (this.period === 'custom') {
    if (!this.customDate) return;
    const formattedDate = this.customDate.split('T')[0];
    endpoint = `${API}/services/daily`; // ← usa daily con fecha
    params = params.set('date', formattedDate);
  }

  this.http.get<any>(endpoint, { headers: this.getHeaders(), params }).subscribe({
    next: (res) => {
      this.barbers = res.barbers || [];
      this.businessSummary = res.businessSummary || {};
    },
    error: (err) => console.error('Error cargando ganancias:', err)
  });
}

  loadAllBarbers() {
    this.http.get<any[]>(`${API}/users/barbers`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.allBarbers = res,
      error: () => console.error('Error cargando barberos')
    });
  }

  refreshAll(event: any) {
    this.loadEarnings();
    this.loadAllBarbers();
    this.loadLowStock();
    setTimeout(() => event.target.complete(), 500);
  }

  loadLowStock() {
    this.http.get<any[]>(`${API}/products/low-stock`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.lowStockProducts = res,
      error: () => console.error('Error cargando stock')
    });
  }

  onPeriodChange() {
    // Si cambia a algo diferente de custom, cargamos de una vez
    if (this.period !== 'custom') {
      this.customDate = ''; // Limpiamos fecha personalizada si cambia a otro filtro
      this.loadEarnings();
    }
  }

  onCustomDateChange() {
    // Se ejecuta al seleccionar la fecha en el ion-datetime
    if (this.customDate) {
      this.loadEarnings();
    }
  }

  getBarberEarnings(barberId: string) {
    return this.barbers.find(b => b.barberId === barberId);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}