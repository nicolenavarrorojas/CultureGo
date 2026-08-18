import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase';
import { Comuna } from '../models';

@Injectable({
  providedIn: 'root',
})
export class Comunas {
  private supabase = inject(Supabase).client;

  async listar(): Promise<Comuna[]> {
    const { data, error } = await this.supabase.from('comuna').select('*').order('nombre');
    if (error) throw error;
    return data as Comuna[];
  }
}