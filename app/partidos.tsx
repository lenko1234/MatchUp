import React, { useEffect, useState, useCallback } from 'react';
import { Button } from 'react-native';
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
  RefreshControl,
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import app from '../src/firebase';
import { usePartidosAbiertos } from '../src/hooks/useMatches';
import { MatchService } from '../src/services/MatchService';
import { Match } from '../src/types/Match';
export default function PartidosScreen() {
  const auth = getAuth(app);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPartido, setSelectedPartido] = useState<Match | null>(null);
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [tipoElegido, setTipoElegido] = useState<'masculino' | 'femenino' | 'mixto' | ''>('');
  const [sexoJugador, setSexoJugador] = useState<string>('');

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

        // Si es el primer jugador y no hay tipoPartido definido, mostrar modal
        if (partido.jugadores.length === 0 && !partido.tipoPartido && !showTipoModal) {
          // Obtener sexo del usuario desde Firestore antes de mostrar el modal
          let sexo = '';
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const profileDoc = await getDoc(doc(require('../src/firebase').db, 'users', user.uid));
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              sexo = profileData.sexo || '';
            }
          } catch (e) {}
          setSexoJugador(sexo);
          setSelectedPartido(partido);
          setShowTipoModal(true);
          return;
        }

        // Obtener perfil del usuario para incluir sexo
        let sexo = '';
        let username = '';
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const profileDoc = await getDoc(doc(require('../src/firebase').db, 'users', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            sexo = profileData.sexo || '';
            username = profileData.username || '';
          }
        } catch (e) {
          // Si falla, sexo vacío
        }

        // Validar tipo de partido
        if (partido.tipoPartido === 'masculino' && sexo !== 'hombre') {
          Alert.alert('No puedes unirte a este partido, es solo para hombres');
          return;
        }
        if (partido.tipoPartido === 'femenino' && sexo !== 'mujer') {
          Alert.alert('No puedes unirte a este partido, es solo para mujeres');
          return;
        }
        // Mixto permite ambos

        await MatchService.unirsePartido(partido.id!, {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Usuario',
          email: user.email || '',
          sexo,
          username
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
    <ImageBackground source={require('../assets/images/Copilot_20250930_210440.png')} style={styles.background} resizeMode="cover">
      <View style={styles.container}>

      {/* Header superior blanco con texto y botones */}
      {/* Header con fondo de césped */}
      <ImageBackground source={require("../assets/cesped.png")} style={{ height: 60 }}>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.8)", // overlay semitransparente
          justifyContent: "center",
          alignItems: "center",
          borderBottomWidth: 2,
          borderBottomColor: "white",
          flexDirection: "row",
          paddingHorizontal: 16
        }}>
          <Text style={{ color: "white", fontSize: 20, flex: 1, textAlign: "center" }}>Partidos</Text>
          <View style={styles.topBarButtons}>
            <TouchableOpacity onPress={() => router.push('/infoJugador')} style={styles.topBarButton}>
              <Ionicons name="person-circle" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.topBarButton}>
              <Ionicons name="log-out" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

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

            // Color según tipoPartido
            let cardColor = '#fff';
            if (item.tipoPartido === 'masculino') cardColor = '#cce8ff';
            else if (item.tipoPartido === 'femenino') cardColor = '#ffd1e6';
            else if (item.tipoPartido === 'mixto') cardColor = '#e0e0e0';

            return (
              <TouchableOpacity onPress={() => { setSelectedPartido(item); setModalVisible(true); }}>
                <View style={[styles.partidoCard, isJoined && styles.partidoJoined, { backgroundColor: cardColor }]}> 
                  <View style={styles.partidoHeader}>
                    <View style={styles.partidoContent}>
                      <Text style={styles.partidoEstablecimiento}>{item.nombreEstablecimiento || 'Establecimiento'}</Text>
                      <View style={styles.partidoDetails}>
                        <Text style={styles.partidoCancha}>⚽ {item.nombreCancha || item.canchaId}</Text>
                        <Text style={styles.partidoFecha}>
                          📅 {item.fecha?.toDate?.()?.toLocaleString?.('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || String(item.fecha)}
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
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>⚽ No hay partidos disponibles</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Detalles del Partido</Text>
            <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>Descripción:</Text> {selectedPartido?.descripcion || '-'}</Text>
            <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>Sexo de los jugadores:</Text> {selectedPartido?.jugadores?.map(j => j.sexo || '-').join(', ')}</Text>
            <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>Dirección:</Text> {selectedPartido?.direccion || selectedPartido?.ubicacion || '-'}</Text>
            <Text style={{ marginBottom: 6 }}><Text style={{ fontWeight: 'bold' }}>Usuarios unidos:</Text> {selectedPartido?.jugadores?.map(j => j.displayName || j.username || j.email || '-').join(', ')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#007AFF', padding: 10, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para elegir tipo de partido si es el primer jugador */}
      <Modal
        visible={showTipoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTipoModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>¿Qué tipo de partido será?</Text>
            {/* Opciones según sexo del jugador */}
            {sexoJugador === 'hombre' ? (
              <React.Fragment>
                <Button title="Masculino" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'masculino' });
                    setTipoElegido('masculino');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'masculino' });
                  }
                }} />
                <Button title="Mixto" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'mixto' });
                    setTipoElegido('mixto');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'mixto' });
                  }
                }} />
              </React.Fragment>
            ) : sexoJugador === 'mujer' ? (
              <React.Fragment>
                <Button title="Femenino" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'femenino' });
                    setTipoElegido('femenino');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'femenino' });
                  }
                }} />
                <Button title="Mixto" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'mixto' });
                    setTipoElegido('mixto');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'mixto' });
                  }
                }} />
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Button title="Masculino" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'masculino' });
                    setTipoElegido('masculino');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'masculino' });
                  }
                }} />
                <Button title="Femenino" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'femenino' });
                    setTipoElegido('femenino');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'femenino' });
                  }
                }} />
                <Button title="Mixto" onPress={async () => {
                  setShowTipoModal(false);
                  if (selectedPartido) {
                    await MatchService.actualizarPartido(selectedPartido.id!, { tipoPartido: 'mixto' });
                    setTipoElegido('mixto');
                    handleJoinPartido({ ...selectedPartido, tipoPartido: 'mixto' });
                  }
                }} />
              </React.Fragment>
            )}
            <TouchableOpacity onPress={() => setShowTipoModal(false)} style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#007AFF', padding: 10, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topBar: {
    backgroundColor: '#121212',
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#272729',
    height: 64,
    justifyContent: 'center',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 775,
    marginLeft: 16,
    marginRight: 16,
    height: 64,
  },
  topBarTitle: {
    color: '#e5e5e7',
    fontSize: 22,
    fontWeight: '500',
    fontFamily: 'system-ui',
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  topBarButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
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
