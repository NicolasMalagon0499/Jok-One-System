import { Directive, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, HostListener, AfterViewInit } from '@angular/core';

// Bound como [(appThousands)]="model.campo" en un <ion-input type="text" inputmode="numeric">.
// No usa ngModel/ControlValueAccessor a propósito: Ionic ya registra su propio
// accessor en ion-input, y dos accessors sobre el mismo elemento chocan. Este
// directive solo formatea lo que se ve (puntos de mil, es-CO) y emite el
// número plano hacia el modelo.
@Directive({
  selector: 'ion-input[appThousands]',
  standalone: true
})
export class ThousandsDirective implements OnChanges, AfterViewInit {
  @Input('appThousands') value: number | null | undefined = 0;
  @Output('appThousandsChange') valueChange = new EventEmitter<number>();

  constructor(private el: ElementRef<HTMLIonInputElement>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && !changes['value'].isFirstChange()) {
      this.render(this.value);
    }
  }

  ngAfterViewInit() {
    // El custom element de Ionic puede tardar un tick en "upgradearse";
    // formateamos después de ese tick para que se vea bien desde el inicio.
    setTimeout(() => this.render(this.value), 0);
  }

  @HostListener('ionInput', ['$event'])
  onIonInput(event: CustomEvent) {
    const raw = (event.detail?.value ?? '').toString();
    const digits = raw.replace(/\D/g, '');
    const num = digits ? Number(digits) : 0;
    this.render(num, digits.length > 0);
    this.valueChange.emit(num);
  }

  private render(value: number | null | undefined, forceZero = false) {
    const num = Number(value) || 0;
    const showValue = num !== 0 || forceZero;
    (this.el.nativeElement as any).value = showValue ? new Intl.NumberFormat('es-CO').format(num) : '';
  }
}
