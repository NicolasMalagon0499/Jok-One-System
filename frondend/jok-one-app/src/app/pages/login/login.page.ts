import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonSpinner, ViewWillEnter } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonButton, IonInput, IonItem, IonLabel, IonSpinner, CommonModule, FormsModule, ThemeToggleComponent]
})
export class LoginPage implements ViewWillEnter {

  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  // Ionic reutiliza la instancia de esta página en vez de recrearla cada vez
  // que se navega a /login (ion-router-outlet cachea páginas), así que
  // ngOnInit no vuelve a correr. Sin este reseteo, después de cerrar sesión
  // el formulario reaparecía con el correo/clave anteriores y el botón
  // congelado en "cargando" si el login previo había sido exitoso.
  ionViewWillEnter() {
    this.email = '';
    this.password = '';
    this.loading = false;
    this.error = '';
  }

  async login() {
    this.loading = true;
    this.error = '';

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.saveToken(res.token, res.user);
        this.loading = false;
        if (this.auth.isAdmin()) {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/barber/home']);
        }
      },
      error: () => {
        this.error = 'Credenciales inválidas';
        this.loading = false;
      }
    });
  }
}