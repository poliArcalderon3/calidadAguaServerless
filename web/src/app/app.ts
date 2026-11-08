import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AguaService, Muestra, PARAMETROS } from './agua.service';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly agua = inject(AguaService);
  protected readonly parametros = PARAMETROS;

  // Búsqueda
  protected readonly modo = signal<'id' | 'solidos'>('id');
  protected readonly texto = signal('');
  protected readonly resultado = signal<Muestra | null>(null);
  protected readonly mensaje = signal('');

  // Tabla paginada
  protected readonly filas = signal<Muestra[]>([]);
  protected readonly siguiente = signal<string | null>(null);
  protected readonly anteriores = signal<(string | null)[]>([]);
  private desdeActual: string | null = null;

  constructor() {
    this.cargarPagina(null);
  }

  protected buscar(evento: Event) {
    evento.preventDefault();
    const valor = this.texto().trim();
    if (!valor) return;
    this.resultado.set(null);
    this.mensaje.set('Buscando…');

    if (this.modo() === 'id') {
      // Acepta "M-0004", "m-4" o solo "4"
      const numero = valor.replace(/^m-?/i, '');
      const id = /^\d+$/.test(numero) ? `M-${numero.padStart(4, '0')}` : valor;
      this.agua.buscarPorId(id).subscribe({
        next: (m) => this.mostrar(m),
        error: () => this.mensaje.set(`No existe la muestra ${id}.`),
      });
    } else {
      this.agua.buscarPorSolidos(valor).subscribe({
        next: (r) => r.resultados.length ? this.mostrar(r.resultados[0]) : this.mensaje.set(`Ninguna muestra tiene ${valor} ppm de sólidos.`),
        error: () => this.mensaje.set('Escribe un número, por ejemplo 22018.42'),
      });
    }
  }

  protected mostrar(m: Muestra) {
    this.resultado.set(m);
    this.mensaje.set('');
  }

  protected cambiarModo(modo: 'id' | 'solidos') {
    this.modo.set(modo);
    this.texto.set('');
    this.resultado.set(null);
    this.mensaje.set('');
  }

  protected paginaSiguiente() {
    this.anteriores.update((a) => [...a, this.desdeActual]);
    this.cargarPagina(this.siguiente());
  }

  protected paginaAnterior() {
    const a = [...this.anteriores()];
    const desde = a.pop() ?? null;
    this.anteriores.set(a);
    this.cargarPagina(desde);
  }

  private cargarPagina(desde: string | null) {
    this.desdeActual = desde;
    this.agua.listar('', desde, 10).subscribe((p) => {
      this.filas.set(p.resultados);
      this.siguiente.set(p.siguiente);
    });
  }

  protected valor(m: Muestra, clave: string) {
    return m[clave as keyof Muestra] as number | null;
  }
}
