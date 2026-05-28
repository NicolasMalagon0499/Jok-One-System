import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonBackButton, IonButtons, IonTextarea } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';

const API = 'https://awake-grace-production.up.railway.app';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrls: ['./expenses.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel, IonSelect, IonSelectOption, IonBackButton, IonButtons, IonTextarea, CommonModule, FormsModule]
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

  constructor(private auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadExpenses();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  loadExpenses() {
    this.http.get<any>(`${API}/expenses/monthly`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        this.expenses = res.expenses;
        this.monthlyTotal = res.total;
        this.byCategory = res.byCategory;
      },
      error: () => console.error('Error cargando gastos')
    });
  }

  getCategoryLabel(value: string) {
    return this.categories.find(c => c.value === value)?.label || value;
  }

  createExpense() {
    this.http.post<any>(`${API}/expenses`, this.newExpense, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.newExpense = { category: 'RENT', description: '', amount: 0 };
        this.loadExpenses();
        alert('Gasto registrado!');
      },
      error: () => alert('Error registrando gasto')
    });
  }
}