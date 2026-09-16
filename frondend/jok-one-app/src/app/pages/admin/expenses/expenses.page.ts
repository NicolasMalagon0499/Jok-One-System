import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonBackButton,
  IonButtons,
  IonTextarea,
  IonRow,
  IonCol,
  IonIcon,
  ModalController,
  IonRefresher,
  IonRefresherContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';

import { AuthService } from '../../../services/auth';
import { environment } from '../../../../environments/environment';
import { EditExpenseModalComponent } from '../../../components/edit-expense-modal/edit-expense-modal.component';
import { ThemeToggleComponent } from '../../../components/theme-toggle/theme-toggle.component';

const API = environment.apiUrl;
@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    IonContent,
    IonHeader,
    IonToolbar,

    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,

    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,

    IonBackButton,
    IonButtons,
    IonTextarea,

    IonRow,
    IonCol,
    IonIcon,
    ThemeToggleComponent,
    IonRefresher,
    IonRefresherContent
  ]
})
export class ExpensesPage implements OnInit {

  expenses: any[] = [];
  monthlyTotal = 0;
  byCategory: any = {};

  newExpense = {
    category: 'RENT',
    description: '',
    amount: 0
  };

  categories = [
    { value: 'RENT', label: '🏠 Arriendo' },
    { value: 'WATER', label: '💧 Agua' },
    { value: 'ELECTRICITY', label: '⚡ Luz' },
    { value: 'INTERNET', label: '🌐 Internet' },
    { value: 'REPAIR', label: '🔧 Reparación' },
    { value: 'OTHER', label: '📝 Otro' }
  ];

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    addIcons({ createOutline, trashOutline });
  }

  ngOnInit() {
    this.loadExpenses();
  }

  getHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.getToken()}`
    });
  }

  loadExpenses() {
    this.http.get<any>(
      `${API}/expenses/monthly`,
      {
        headers: this.getHeaders()
      }
    ).subscribe({
      next: (res) => {
        this.expenses = res.expenses;
        this.monthlyTotal = res.total;
        this.byCategory = res.byCategory;
      },
      error: (err) => {
        console.error('Error cargando gastos', err);
      }
    });
  }

  refreshAll(event: any) {
    this.loadExpenses();
    setTimeout(() => event.target.complete(), 500);
  }

  getCategoryLabel(value: string) {
    return this.categories.find(
      c => c.value === value
    )?.label || value;
  }

  createExpense() {
    this.http.post<any>(
      `${API}/expenses`,
      this.newExpense,
      {
        headers: this.getHeaders()
      }
    ).subscribe({
      next: () => {

        this.newExpense = {
          category: 'RENT',
          description: '',
          amount: 0
        };

        this.loadExpenses();

        alert('Gasto registrado correctamente');
      },
      error: (err) => {
        console.error(err);
        alert('Error registrando gasto');
      }
    });
  }

  async editExpense(expense: any) {
    const modal = await this.modalCtrl.create({
      component: EditExpenseModalComponent,
      componentProps: { expense: { ...expense } }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      this.loadExpenses();
    }
  }

  deleteExpense(id: string) {

    const confirmed = confirm(
      '¿Deseas eliminar este gasto?'
    );

    if (!confirmed) {
      return;
    }

    this.http.delete(
      `${API}/expenses/${id}`,
      {
        headers: this.getHeaders()
      }
    ).subscribe({
      next: () => {
        this.loadExpenses();
        alert('Gasto eliminado correctamente');
      },
      error: (err) => {
        console.error(err);
        alert('Error eliminando gasto');
      }
    });
  }
}