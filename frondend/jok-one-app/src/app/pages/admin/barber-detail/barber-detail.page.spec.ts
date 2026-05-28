import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarberDetailPage } from './barber-detail.page';

describe('BarberDetailPage', () => {
  let component: BarberDetailPage;
  let fixture: ComponentFixture<BarberDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BarberDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
