import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';

const API = 'https://awake-grace-production.up.railway.app';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSelect, IonSelectOption, CommonModule, FormsModule]
})
export class HomePage implements OnInit {

  user: any;
  products: any[] = [];
  earnings: any = {};
  history: any[] = [];
  paymentMethod = 'CASH';
  period = 'daily';

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

  selectedProduct = {
    productId: '',
    quantity: 1,
    type: 'SOLD'
  };

  constructor(private auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.service.barberId = this.user.id;
    this.loadProducts();
    this.loadEarnings();
    this.loadHistory();
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
    const endpoint = this.period === 'daily'
      ? `${API}/services/daily/${this.user.id}`
      : `${API}/services/${this.period}/${this.user.id}`;

    this.http.get<any>(endpoint, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        // si viene en formato {barbers: [...]} extraer el del barbero actual
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

  selectedDate = '';

  earningsByDate: any = null;

loadEarningsByDate() {
  this.http.get<any[]>(`${API}/services/history/${this.user.id}?date=${this.selectedDate}`, { headers: this.getHeaders() }).subscribe({
    next: (res) => {
      let totalServices = 0, totalTips = 0, totalCash = 0, totalQr = 0;
      res.forEach((s: any) => {
        totalServices += s.price;
        totalTips += s.tip;
        totalCash += s.cashAmount ?? 0;
        totalQr += s.qrAmount ?? 0;
      });
      this.earningsByDate = { totalServices, totalTips, totalCash, totalQr };
    },
    error: () => console.error('Error')
  });
}

loadHistory() {
  const url = this.selectedDate
    ? `${API}/services/history/${this.user.id}?date=${this.selectedDate}`
    : `${API}/services/history/${this.user.id}`;

  this.http.get<any[]>(url, { headers: this.getHeaders() }).subscribe({
    next: (res) => this.history = res,
    error: () => console.error('Error cargando historial')
  });
}

onDateChange() {
  this.loadHistory();
  if (this.selectedDate) {
    this.loadEarningsByDate();
  } else {
    this.earningsByDate = null;
  }
}

  onPeriodChange() {
    this.loadEarnings();
  }

  onPaymentMethodChange() {
    this.service.cashAmount = 0;
    this.service.qrAmount = 0;
    this.service.specialEvent = '';
  }

  addProduct() {
    if (this.selectedProduct.productId) {
      this.service.products.push({ ...this.selectedProduct });
      this.selectedProduct = { productId: '', quantity: 1, type: 'SOLD' };
    }
  }

  removeProduct(index: number) {
    this.service.products.splice(index, 1);
  }

  getProductName(productId: string) {
    return this.products.find(p => p.id === productId)?.name || productId;
  }

  createService() {
    if (this.paymentMethod === 'CASH') {
      this.service.cashAmount = this.service.price;
      this.service.qrAmount = 0;
    } else if (this.paymentMethod === 'QR') {
      this.service.qrAmount = this.service.price;
      this.service.cashAmount = 0;
    }

    this.http.post<any>(`${API}/services/create`, this.service, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.service = { price: 0, tip: 0, cashAmount: 0, qrAmount: 0, specialEvent: '', clientType: 'RETURNING', barberId: this.user.id, products: [] };
        this.paymentMethod = 'CASH';
        this.loadEarnings();
        this.loadHistory();
        alert('Servicio registrado!');
      },
      error: () => alert('Error registrando servicio')
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }


  
}