import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonBackButton, IonButtons } from '@ionic/angular/standalone';
import { AuthService } from '../../../services/auth';

const API = 'https://awake-grace-production.up.railway.app';

@Component({
  selector: 'app-barber-detail',
  templateUrl: './barber-detail.page.html',
  styleUrls: ['./barber-detail.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonBackButton, IonButtons, CommonModule]
})
export class BarberDetailPage implements OnInit {

  barberId = '';
  barberName = '';
  history: any[] = [];

  constructor(private route: ActivatedRoute, private auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.barberId = this.route.snapshot.paramMap.get('barberId') || '';
    this.barberName = this.route.snapshot.paramMap.get('barberName') || '';
    this.loadHistory();
  }

  getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  loadHistory() {
    this.http.get<any[]>(`${API}/services/history/${this.barberId}`, { headers: this.getHeaders() }).subscribe({
      next: (res) => this.history = res,
      error: () => console.error('Error cargando historial')
    });
  }
}