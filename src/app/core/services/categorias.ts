import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Categoria } from '../models';

@Injectable({
  providedIn: 'root',
})
export class Categorias {
  private supabase = inject(Supabase).client;

  async listar(): Promise<Categoria[]> {
    const { data, error } = await this.supabase.from('categoria').select('*').order('nombre');
    if (error) throw error;
    return data as Categoria[];
  }
}