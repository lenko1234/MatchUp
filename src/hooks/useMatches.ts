import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../firebase';
import { Match } from '../types/Match';

export function usePartidosAbiertos() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    console.log('🔥 Setting up Firestore listener...');
    
    try {
      const q = query(
        collection(db, 'matches'),
        where('estado', '==', 'abierto'),
        orderBy('fecha', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          console.log('✅ Firestore snapshot received:', snapshot.size, 'documents');
          const matchesData: Match[] = [];
          
          snapshot.forEach((doc) => {
            matchesData.push({ id: doc.id, ...doc.data() } as Match);
          });
          
          setMatches(matchesData);
          setLoading(false);
          setError(null);
          console.log('📊 Matches loaded successfully:', matchesData.length);
        },
        (error) => {
          console.error('❌ Firestore listener error:', error);
          setLoading(false);
          setMatches([]);
          
          if (error.code === 'unavailable') {
            setError('Servicio temporalmente no disponible');
          } else if (error.code === 'permission-denied') {
            setError('Sin permisos para acceder a los partidos');
          } else if (error.code === 'failed-precondition') {
            setError('Error de configuración de Firestore');
          } else {
            setError(`Error de conexión: ${error.code}`);
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up listener:', error);
      setError('Error al configurar la conexión');
      setLoading(false);
    }
  }, []);

  return { matches, loading, error, refresh };
}

export function usePartidosCanchero(cancheroId: string) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (!cancheroId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    console.log('🔥 Setting up canchero matches listener for:', cancheroId);
    
    try {
      const q = query(
        collection(db, 'matches'),
        where('cancheroId', '==', cancheroId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          console.log('✅ Canchero matches snapshot:', snapshot.size, 'documents');
          const matchesData: Match[] = [];
          
          snapshot.forEach((doc) => {
            matchesData.push({ id: doc.id, ...doc.data() } as Match);
          });
          
          const sortedMatches = matchesData.sort((a, b) => {
            const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date();
            const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date();
            return dateB.getTime() - dateA.getTime();
          });
          
          setMatches(sortedMatches);
          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('❌ Canchero matches error:', error);
          setError(`Error: ${error.code}`);
          setLoading(false);
          setMatches([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up canchero listener:', error);
      setError('Error al configurar la conexión');
      setLoading(false);
    }
  }, [cancheroId, refresh]);

  return { matches, loading, error, refresh };
}
