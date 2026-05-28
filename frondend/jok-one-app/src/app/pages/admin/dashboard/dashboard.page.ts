import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, IonBadge } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';

const API = 'https://awake-grace-production.up.railway.app';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonItem, IonLabel, IonSelect, IonSelectOption, IonBadge, CommonModule, FormsModule]
})
export class DashboardPage implements OnInit {

  barbers: any[] = [];
  allBarbers: any[] = [];
  businessSummary: any = {};
  lowStockProducts: any[] = [];
  period = 'daily';

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
    const endpoint = `${API}/services/${this.period}`;
    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.barbers = res.barbers;
        this.businessSummary = res.businessSummary;
      },
      error: () => console.error('Error cargando ganancias')
    });
  }

  loadAllBarbers() {
    this.http.get<any[]>(`${API}/users/barbers`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.allBarbers = res,
      error: () => console.error('Error cargando barberos')
    });
  }

  loadLowStock() {
    this.http.get<any[]>(`${API}/products/low-stock`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.lowStockProducts = res,
      error: () => console.error('Error cargando stock')
    });
  }

  onPeriodChange() {
    this.loadEarnings();
  }

  getBarberEarnings(barberId: string) {
    return this.barbers.find(b => b.barberId === barberId);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}