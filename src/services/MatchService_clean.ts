import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { Match } from '../types/Match';
import { getAuth } from 'firebase/auth';

export class MatchService {
  
  /**
   * Crear un nuevo partido (solo para cancheros)
   */
  static async crearPartido(partidoData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar que el usuario sea el canchero del partido
    if (partidoData.cancheroId !== user.uid) {
      throw new Error('Solo puedes crear partidos para tus propias canchas');
    }

    const nuevoPartido: Omit<Match, 'id'> = {
      ...partidoData,
      jugadores: [], // Inicia vacío
      estado: 'abierto',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    try {
      console.log('🔥 MatchService: Creando partido en Firestore:', nuevoPartido);
      const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), nuevoPartido);
      console.log('✅ MatchService: Partido creado con ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ MatchService: Error creando partido:', error);
      throw new Error('Error al crear el partido');
    }
  }

  /**
   * Actualizar un partido existente (solo el canchero propietario)
   */
  static async actualizarPartido(matchId: string, cambios: Partial<Match>): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      const datosActualizacion = {
        ...cambios,
        updatedAt: serverTimestamp()
      };
      
      console.log('🔥 MatchService: Actualizando partido:', matchId, datosActualizacion);
      await updateDoc(partidoRef, datosActualizacion);
      console.log('✅ MatchService: Partido actualizado exitosamente');
    } catch (error) {
      console.error('❌ MatchService: Error actualizando partido:', error);
      throw new Error('Error al actualizar el partido');
    }
  }

  /**
   * Eliminar un partido (solo el canchero propietario)
   */
  static async eliminarPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      console.log('🔥 MatchService: Eliminando partido:', matchId);
      await deleteDoc(partidoRef);
      console.log('✅ MatchService: Partido eliminado exitosamente');
    } catch (error) {
      console.error('❌ MatchService: Error eliminando partido:', error);
      throw new Error('Error al eliminar el partido');
    }
  }

  /**
   * Unirse a un partido (solo para jugadores)
   */
  static async unirseAPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      // Usar arrayUnion para agregar el jugador de forma atómica
      await updateDoc(partidoRef, {
        jugadores: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ MatchService: Jugador agregado al partido:', matchId);
    } catch (error) {
      console.error('❌ MatchService: Error uniéndose al partido:', error);
      throw new Error('Error al unirse al partido');
    }
  }

  /**
   * Abandonar un partido (solo para jugadores)
   */
  static async abandonarPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      // Usar arrayRemove para quitar el jugador de forma atómica
      await updateDoc(partidoRef, {
        jugadores: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ MatchService: Jugador removido del partido:', matchId);
    } catch (error) {
      console.error('❌ MatchService: Error abandonando partido:', error);
      throw new Error('Error al abandonar el partido');
    }
  }
}