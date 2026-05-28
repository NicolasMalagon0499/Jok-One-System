import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = 'https://awake-grace-production.up.railway.app';
@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<any>(`${API}/auth/login`, { email, password });
  }

  saveToken(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAdmin() {
    return this.getUser()?.role === 'ADMIN';
  }

  isBarber() {
    return this.getUser()?.role === 'BARBER';
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn() {
    return !!this.getToken();
  }
}