import { Timestamp } from 'firebase/firestore';

export interface Jugador {
  uid: string;
  displayName: string;
  email: string;
  sexo?: string;
  username?: string;
}

export interface Match {
  id?: string; // Se genera automáticamente por Firestore
  fecha: Timestamp;
  canchaId: string;
  cancheroId: string; // uid de Firebase Auth
  estado: 'abierto' | 'en_juego' | 'finalizado';
  jugadores: Jugador[]; // array de objetos jugador con información completa

  // Campos adicionales opcionales
  tipoPartido?: 'masculino' | 'femenino' | 'mixto'; // tipo de partido según el sexo del creador
  hora?: string; // formato HH:MM para UI
  nombreCancha?: string;
  nombreEstablecimiento?: string; // nombre del establecimiento del canchero
  precio?: number;
  jugadoresMax?: number;
  descripcion?: string;
  tipoAcceso?: 'publico' | 'privado';
  contraseña?: string; // solo para partidos privados
  password?: string; // campo para contraseña de partido privado
  requiresPassword?: boolean; // indica si requiere contraseña
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  direccion?: string;
  ubicacion?: string;
}

export interface Cancha {
  id: string;
  nombre: string;
  establecimiento: string;
  disponible: boolean;
  cancheroId: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  rol: 'canchero' | 'jugador';
  nombre?: string;
  establecimiento?: string; // solo para cancheros
}