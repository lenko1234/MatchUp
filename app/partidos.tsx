import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import app from '../src/firebase';
import { usePartidosAbiertos } from '../src/hooks/useMatches';
import { MatchService } from '../src/services/MatchService';
import { Match } from '../src/types/Match';

const auth = getAuth(app);

export default function Partidos() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Verificar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        Alert.alert('Acceso denegado', 'Debes iniciar sesión para ver los partidos.');
        router.replace('/login');
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Hook para obtener partidos abiertos
  const { matches: partidos, loading, error } = usePartidosAbiertos();

  const handleJoinPartido = async (partido: Match) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    try {
      const isAlreadyJoined = partido.jugadores.some(jugador => jugador.uid === user.uid);
      
      if (isAlreadyJoined) {
        // Salir del partido
        await MatchService.salirPartido(partido.id!, user.uid);
        Alert.alert('✅', 'Te has salido del partido');
      } else {
        // Verificar capacidad
        if (partido.jugadores.length >= (partido.jugadoresMax || 10)) {
          Alert.alert('❌', 'Este partido ya está completo');
          return;
        }

        // Unirse al partido
        await MatchService.unirsePartido(partido.id!, {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Usuario',
          email: user.email || ''
        });
        Alert.alert('✅', 'Te has unido al partido');
      }
    } catch (error: any) {
      console.error('Error al unirse/salir del partido:', error);
      Alert.alert('Error', error.message || 'No se pudo procesar la acción');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando partidos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ Error al cargar los partidos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partidos Disponibles</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.switchRoleButton}
          onPress={() => router.push('/canchero')}
        >
          <Text style={styles.switchRoleButtonText}>Cambiar a Canchero</Text>
        </TouchableOpacity>
      </View>

      {partidos && partidos.length > 0 ? (
        <FlatList
          data={partidos}
          keyExtractor={(item) => item.id || ''}
          renderItem={({ item }) => {
            const isJoined = item.jugadores.some(jugador => jugador.uid === user?.uid);
            const isFull = item.jugadores.length >= (item.jugadoresMax || 10);
            
            return (
              <View style={[styles.partidoCard, isJoined && styles.partidoJoined]}>
                <View style={styles.partidoHeader}>
                  <View style={styles.partidoContent}>
                    <Text style={styles.partidoEstablecimiento}>{item.nombreEstablecimiento || 'Establecimiento'}</Text>
                    <View style={styles.partidoDetails}>
                      <Text style={styles.partidoCancha}>⚽ {item.nombreCancha || item.canchaId}</Text>
                      <Text style={styles.partidoFecha}>
                        📅 {item.fecha?.toDate?.()?.toLocaleDateString() || String(item.fecha)} • {item.hora}
                      </Text>
                      <View style={styles.partidoMeta}>
                        <Text style={[styles.partidoJugadores, isJoined && styles.partidoInfoJoined]}>
                          👥 {item.jugadores.length}/{item.jugadoresMax || 10}
                        </Text>
                        {item.precio && item.precio > 0 && (
                          <Text style={styles.partidoPrecio}>💰 ${item.precio.toLocaleString()}</Text>
                        )}
                        {item.requiresPassword && <Ionicons name="lock-closed" size={14} color="#666" />}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      isJoined ? styles.leaveButton : styles.joinButtonActive,
                      isFull && !isJoined && styles.disabledButton
                    ]}
                    onPress={() => handleJoinPartido(item)}
                    disabled={isFull && !isJoined}
                  >
                    <Text style={[
                      styles.joinButtonText,
                      isJoined ? styles.leaveButtonText : styles.joinButtonActiveText
                    ]}>
                      {isJoined ? 'Salir' : isFull ? 'Lleno' : 'Unirse'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {isJoined && (
                  <View style={styles.joinedIndicator}>
                    <Text style={styles.joinedBadge}>✅ Unido</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚽ No hay partidos disponibles</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  switchRoleButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  switchRoleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  partidoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  partidoContent: {
    flex: 1,
    marginRight: 12,
  },
  partidoEstablecimiento: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  partidoCancha: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 2,
  },
  partidoDetails: {
    marginTop: 2,
  },
  partidoFecha: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  partidoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partidoJugadores: {
    fontSize: 12,
    color: '#666',
  },
  partidoInfo: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Estilos para partidos interactivos
  partidoJoined: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },

  partidoInfoJoined: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  partidoPrecio: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  partidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  joinedIndicator: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  joinButtonActive: {
    backgroundColor: '#4CAF50',
  },
  leaveButton: {
    backgroundColor: '#FF5722',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  joinButtonActiveText: {
    color: '#fff',
  },
  leaveButtonText: {
    color: '#fff',
  },
  joinedBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
