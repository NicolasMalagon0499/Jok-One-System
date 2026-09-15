import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel,
  IonBackButton, IonButtons, IonRow, IonCol, IonIcon, IonBadge, AlertController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '../../../services/auth';
import { environment } from '../../../../environments/environment';
import { EditProductModalComponent } from '../../../components/edit-product-modal/edit-product-modal.component';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';

const API = environment.apiUrl;
@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonToolbar, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel,
    IonBackButton, IonButtons, IonRow, IonCol, IonIcon, IonBadge, CommonModule, FormsModule, ThemeToggleComponent
  ]
})
export class InventoryPage implements OnInit {

  products: any[] = [];

  newProduct = {
    name: '',
    description: '',
    stock: 0,
    minStock: 3,
    salePrice: 0,
    costPrice: 0
  };

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {
    // Registramos los íconos de Ionicons que usamos en el HTML
    addIcons({ createOutline, trashOutline });
  }

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
        this.newProduct = { name: '', description: '', stock: 0, minStock: 3, salePrice: 0, costPrice: 0 };
        this.loadProducts();
        alert('Producto creado!');
      },
      error: () => alert('Error creando producto')
    });
  }

  // MODAL COMPLETO PARA EDITAR NOMBRE, DESCRIPCIÓN, STOCK, PRECIOS Y AVISO DE STOCK BAJO
  async editarProducto(product: any) {
    const modal = await this.modalCtrl.create({
      component: EditProductModalComponent,
      componentProps: { product: { ...product } }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      this.loadProducts();
    }
  }

  // VENTANA EMERGENTE PARA EDITAR EL STOCK
  async modificarStock(product: any) {
    const alertBox = await this.alertCtrl.create({
      header: `Editar Stock: ${product.name}`,
      inputs: [
        {
          name: 'nuevoStock',
          type: 'number',
          placeholder: 'Cantidad en inventario',
          value: product.stock
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const cantidad = parseInt(data.nuevoStock);
            if (!isNaN(cantidad)) {
              this.actualizarStockBackend(product.id, cantidad);
            }
          }
        }
      ]
    });
    await alertBox.present();
  }

  actualizarStockBackend(id: string, stock: number) {
    this.http.patch(`${API}/products/${id}/stock`, { stock }, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadProducts(); // Refresca la lista de inmediato
      },
      error: () => alert('Error al actualizar el stock en el servidor')
    });
  }

  // ALERTA DE SEGURIDAD ANTES DE ELIMINAR
  async confirmarEliminar(product: any) {
    const alertBox = await this.alertCtrl.create({
      header: '¿Eliminar producto?',
      message: `¿Estás seguro de eliminar "${product.name}"? Se borrará de forma permanente.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.eliminarProductoBackend(product.id);
          }
        }
      ]
    });
    await alertBox.present();
  }

  eliminarProductoBackend(id: string) {
    this.http.delete(`${API}/products/${id}`, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadProducts(); // Refresca la lista de inmediato
      },
      error: () => alert('No se pudo eliminar. El producto podría estar amarrado a un servicio del historial.')
    });
  }
}