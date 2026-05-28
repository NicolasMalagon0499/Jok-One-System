import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';

const API = 'https://awake-grace-production.up.railway.app';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonBackButton, IonButtons, CommonModule, FormsModule]
})
export class InventoryPage implements OnInit {

  products: any[] = [];

  newProduct = {
    name: '',
    description: '',
    stock: 0,
    salePrice: 0,
    costPrice: 0
  };

  constructor(private auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadProducts();
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

  createProduct() {
    this.http.post<any>(`${API}/products`, this.newProduct, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.newProduct = { name: '', description: '', stock: 0, salePrice: 0, costPrice: 0 };
        this.loadProducts();
        alert('Producto creado!');
      },
      error: () => alert('Error creando producto')
    });
  }
}