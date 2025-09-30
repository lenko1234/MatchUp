import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { Match } from '../types/Match';
import { getAuth } from 'firebase/auth';

let isNetworkEnabled = true;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Firestore operation timeout')), timeoutMs)
    )
  ]);
};

const resetNetworkConnection = async (): Promise<void> => {
  try {
    try {
      await disableNetwork(db);
    } catch (e: any) {
      // Error esperado al desconectar
    }
    
    isNetworkEnabled = false;
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await enableNetwork(db);
    isNetworkEnabled = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    isNetworkEnabled = true;
    throw error;
  }
};

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

    if (partidoData.cancheroId !== user.uid) {
      throw new Error('Solo puedes crear partidos para tus propias canchas');
    }

    const nuevoPartido: Omit<Match, 'id'> = {
      ...partidoData,
      jugadores: [],
      estado: 'abierto',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    try {
      const docRef = await withTimeout(
        addDoc(collection(db, COLLECTIONS.MATCHES), nuevoPartido),
        8000
      );
      
      return docRef.id;
      
    } catch (error: any) {
      try {
        await resetNetworkConnection();
        const docRef = await withTimeout(
          addDoc(collection(db, COLLECTIONS.MATCHES), nuevoPartido),
          10000
        );
        return docRef.id;
        
      } catch (secondError: any) {
        if (error?.code === 'permission-denied') {
          throw new Error('No tienes permisos para crear partidos');
        }
        if (error?.code === 'unauthenticated') {
          throw new Error('Sesión expirada. Inicia sesión nuevamente');
        }
        throw new Error('Error al crear el partido. Verifica tu conexión');
      }
    }
  }

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
      
      await updateDoc(partidoRef, datosActualizacion);
    } catch (error) {
      throw new Error('Error al actualizar el partido');
    }
  }

  static async eliminarPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      await deleteDoc(partidoRef);
    } catch (error) {
      throw new Error('Error al eliminar el partido');
    }
  }

  static async unirseAPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      await updateDoc(partidoRef, {
        jugadores: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      throw new Error('Error al unirse al partido');
    }
  }

  static async abandonarPartido(matchId: string): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      await updateDoc(partidoRef, {
        jugadores: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      throw new Error('Error al abandonar el partido');
    }
  }

  // Métodos mejorados que manejan objetos completos de jugador
  static async unirsePartido(matchId: string, jugador: { uid: string; displayName: string; email: string }): Promise<void> {
    try {
      console.log('🔄 Uniéndose al partido:', matchId, jugador);
      
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      await withTimeout(updateDoc(partidoRef, {
        jugadores: arrayUnion(jugador),
        updatedAt: serverTimestamp()
      }), 10000);
      
      console.log('✅ Jugador unido exitosamente al partido');
      
    } catch (error: any) {
      console.error('❌ Error al unirse al partido:', error);
      throw new Error(`Error al unirse al partido: ${error.message}`);
    }
  }

  static async salirPartido(matchId: string, jugadorUid: string): Promise<void> {
    try {
      console.log('🔄 Saliendo del partido:', matchId, jugadorUid);
      
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      
      // Necesitamos obtener el partido actual para encontrar el jugador exacto
      const partidoDoc = await withTimeout(
        import('firebase/firestore').then(({ getDoc }) => getDoc(partidoRef)),
        10000
      );
      
      if (!partidoDoc.exists()) {
        throw new Error('Partido no encontrado');
      }
      
      const partidoData = partidoDoc.data() as Match;
      const jugadorARemover = partidoData.jugadores.find(j => j.uid === jugadorUid);
      
      if (!jugadorARemover) {
        throw new Error('Jugador no encontrado en el partido');
      }
      
      await withTimeout(updateDoc(partidoRef, {
        jugadores: arrayRemove(jugadorARemover),
        updatedAt: serverTimestamp()
      }), 10000);
      
      console.log('✅ Jugador removido exitosamente del partido');
      
    } catch (error: any) {
      console.error('❌ Error al salir del partido:', error);
      throw new Error(`Error al salir del partido: ${error.message}`);
    }
  }

  static async unirsePartidoConPassword(matchId: string, jugador: { uid: string; displayName: string; email: string }, password: string): Promise<void> {
    try {
      console.log('🔄 Uniéndose al partido con contraseña:', matchId);
      
      // Verificar contraseña del partido
      const partidoRef = doc(db, COLLECTIONS.MATCHES, matchId);
      const partidoDoc = await withTimeout(
        import('firebase/firestore').then(({ getDoc }) => getDoc(partidoRef)),
        10000
      );
      
      if (!partidoDoc.exists()) {
        throw new Error('Partido no encontrado');
      }
      
      const partidoData = partidoDoc.data() as Match;
      
      if (partidoData.password !== password) {
        throw new Error('Contraseña incorrecta');
      }
      
      // Si la contraseña es correcta, unirse al partido
      await this.unirsePartido(matchId, jugador);
      
    } catch (error: any) {
      console.error('❌ Error al unirse con contraseña:', error);
      throw error;
    }
  }
}