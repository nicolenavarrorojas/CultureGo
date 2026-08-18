export interface Usuario {
  id_usuario: string; // uuid (coincide con el id de Supabase Auth)
  nombre: string;
  email: string;
  id_avatar?: string | null;
  fecha_registro: string; 
  es_admin: boolean; // true si el registro corresponde a un admin
}

// Administrador hereda de Usuario (no es un rol string aparte).
export interface Administrador extends Usuario {
  es_admin: true;
}