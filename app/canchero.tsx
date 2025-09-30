import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  FlatList,
  Switch,
  ActivityIndicator,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';

import app from '../src/firebase';
import { usePartidosCanchero } from '../src/hooks/useMatches';
import { MatchService } from '../src/services/MatchService';
import { Match } from '../src/types/Match';

const auth = getAuth(app);

// Tipos de datos
interface Cancha {
  id: string;
  nombre: string;
  establecimiento: string;
  disponible: boolean;
}

// Componente FormModal separado para evitar re-renders
interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
  canchas: Cancha[];
  onDateChange: (event: any, selectedDate?: Date) => void;
  onTimeChange: (event: any, selectedTime?: Date) => void;
}

const FormModal = React.memo(({ 
  visible, 
  onClose, 
  onSubmit, 
  title, 
  formData, 
  setFormData, 
  canchas,
  onDateChange,
  onTimeChange
}: FormModalProps) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelButton}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={() => {
          console.log('🔘 Botón Guardar presionado');
          onSubmit();
        }}>
          <Text style={styles.saveButton}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* Selector de Fecha */}
        <Text style={styles.fieldLabel}>Fecha del Partido</Text>
        {Platform.OS === 'web' ? (
          <View style={styles.pickerContainer}>
            <input
              type="date"
              value={formData.fecha.toISOString().split('T')[0]}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                onDateChange(null, selectedDate);
              }}
              style={{
                padding: 15,
                fontSize: 16,
                borderRadius: 8,
                border: '1px solid #ddd',
                width: '100%',
                backgroundColor: '#f9f9f9'
              }}
            />
          </View>
        ) : (
          <DateTimePicker
            value={formData.fecha}
            mode="date"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
            style={styles.picker}
          />
        )}

        <Text style={styles.fieldLabel}>Hora del Partido</Text>
        {Platform.OS === 'web' ? (
          <View style={styles.pickerContainer}>
            <View style={styles.timePickerRow}>
              <select
                value={formData.hora.getHours()}
                onChange={(e) => {
                  const newHour = parseInt(e.target.value);
                  const selectedTime = new Date(2000, 0, 1, newHour, formData.hora.getMinutes());
                  onTimeChange(null, selectedTime);
                }}
                style={{
                  padding: 15,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: '#f9f9f9',
                  flex: 1,
                  marginRight: 10
                }}
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <select
                value={formData.hora.getMinutes()}
                onChange={(e) => {
                  const newMinutes = parseInt(e.target.value);
                  const selectedTime = new Date(2000, 0, 1, formData.hora.getHours(), newMinutes);
                  onTimeChange(null, selectedTime);
                }}
                style={{
                  padding: 15,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  backgroundColor: '#f9f9f9',
                  flex: 1
                }}
              >
                <option value={0}>00</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={45}>45</option>
              </select>
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={formData.hora}
            mode="time"
            display={Platform.OS === 'ios' ? 'compact' : 'default'}
            onChange={(event, selectedTime) => {
              if (selectedTime) {
                // Redondear a los 15 minutos más cercanos
                const minutes = selectedTime.getMinutes();
                const roundedMinutes = Math.round(minutes / 15) * 15;
                const adjustedTime = new Date(selectedTime);
                adjustedTime.setMinutes(roundedMinutes % 60);
                if (roundedMinutes >= 60) {
                  adjustedTime.setHours(adjustedTime.getHours() + 1);
                }
                onTimeChange(event, adjustedTime);
              }
            }}
            style={styles.picker}
          />
        )}

        <Text style={styles.fieldLabel}>Cancha</Text>
        <View style={styles.pickerContainer}>
          {canchas.map(cancha => (
            <TouchableOpacity
              key={cancha.id}
              style={[
                styles.pickerOption,
                formData.canchaId === cancha.id && styles.pickerSelected,
                !cancha.disponible && styles.pickerDisabled
              ]}
              onPress={() => cancha.disponible && setFormData(prev => ({ ...prev, canchaId: cancha.id }))}
              disabled={!cancha.disponible}
            >
              <Text style={[
                styles.pickerText,
                formData.canchaId === cancha.id && styles.pickerTextSelected,
                !cancha.disponible && styles.pickerTextDisabled
              ]}>
                {cancha.nombre} {!cancha.disponible && '(No disponible)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Precio</Text>
        <TextInput
          style={styles.input}
          value={formData.precio.toString()}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            setFormData(prev => ({ 
              ...prev, 
              precio: isNaN(num) ? 0 : Math.max(0, num)
            }));
          }}
          keyboardType="numeric"
          placeholder="15000"
        />

        <Text style={styles.fieldLabel}>Jugadores máximos</Text>
        <TextInput
          style={styles.input}
          value={formData.jugadoresMax.toString()}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            setFormData(prev => ({ 
              ...prev, 
              jugadoresMax: isNaN(num) ? 10 : Math.max(1, Math.min(50, num))
            }));
          }}
          keyboardType="numeric"
          placeholder="10"
        />

        <Text style={styles.fieldLabel}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.descripcion}
          onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text }))}
          placeholder="Descripción del partido (opcional)"
          multiline
          numberOfLines={3}
        />
      </ScrollView>
    </View>
  </Modal>
));

const CancheroScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPartido, setSelectedPartido] = useState<Match | null>(null);

  // Función para obtener datos del establecimiento desde Firestore
  const getEstablishmentData = async (uid: string) => {
    try {
      console.log(`🔍 Cargando datos del establecimiento desde Firestore para ${uid}`);
      
      // Importar Firestore functions dinámicamente
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../src/firebase');
      
      // Obtener de Firestore
      const establishmentRef = doc(db, 'establishments', uid);
      const establishmentDoc = await getDoc(establishmentRef);
      
      if (establishmentDoc.exists()) {
        const data = establishmentDoc.data();
        console.log('✅ Datos del establecimiento encontrados:', data);
        return data;
      } else {
        console.log('📝 No hay datos del establecimiento en Firestore');
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading establishment data from Firestore:', error);
      return null;
    }
  };

  // Hook para obtener partidos en tiempo real del canchero - SIEMPRE llamar hooks
  const { matches: allPartidos, loading, error } = usePartidosCanchero(user?.uid || '');
  
  // Filtrar partidos solo si hay usuario logueado
  const partidos = user ? allPartidos : [];

  // Estados para formulario de creación/edición
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const roundedHour = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    roundedHour.setMinutes(roundedMinutes % 60);
    if (roundedMinutes >= 60) {
      roundedHour.setHours(roundedHour.getHours() + 1);
    }
    roundedHour.setSeconds(0);
    roundedHour.setMilliseconds(0);
    
    return {
      fecha: new Date(),
      hora: roundedHour,
      canchaId: '',
      precio: 0,
      jugadoresMax: 10,
      descripcion: ''
    };
  });

  // Estados para mostrar los pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Configurar título dinámico en el header
  useLayoutEffect(() => {
    const updateTitle = async () => {
      let title = 'Canchero';
      if (user?.uid) {
        const data = await getEstablishmentData(user.uid);
        if (data?.nombre) {
          title = data.nombre;
        }
      }
      
      navigation.setOptions({
        title: title,
      headerRight: () => (
        <View style={styles.headerRightButtons}>
          <TouchableOpacity 
            onPress={() => router.navigate('/info' as any)}
            style={styles.headerButton}
          >
            <Ionicons name="information-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleLogout}
            style={styles.headerButton}
          >
            <Ionicons name="log-out" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ),
    });
    };

    updateTitle();
  }, [navigation, user?.uid, getEstablishmentData]);

  // Actualizar título cuando regrese a esta pantalla (desde /info)
  useFocusEffect(
    useCallback(() => {
      const updateTitleOnFocus = async () => {
        if (user?.uid) {
          const data = await getEstablishmentData(user.uid);
          const title = data?.nombre || 'Canchero';
          navigation.setOptions({ title });
        }
      };
      
      updateTitleOnFocus();
    }, [user?.uid, navigation, getEstablishmentData])
  );

  // Verificar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        Alert.alert('Acceso denegado', 'Debes iniciar sesión para acceder.');
        router.replace('/login');
        return;
      }
      setUser(currentUser);
      loadCanchas();
    });

    return () => unsubscribe();
  }, []);

  // Cargar canchas del establecimiento
  const loadCanchas = () => {
    // Simular carga de canchas del establecimiento
    // TODO: Reemplazar con llamada real a Firestore
    const canchesSimuladas: Cancha[] = [
      { id: '1', nombre: 'Cancha 1', establecimiento: 'Mi Establecimiento', disponible: true },
      { id: '2', nombre: 'Cancha 2', establecimiento: 'Mi Establecimiento', disponible: true },
      { id: '3', nombre: 'Cancha 3', establecimiento: 'Mi Establecimiento', disponible: false },
    ];
    setCanchas(canchesSimuladas);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Error al cerrar sesión');
    }
  };

  // Funciones para manejar date/time pickers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, fecha: selectedDate }));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setFormData(prev => ({ ...prev, hora: selectedTime }));
    }
  };

  // Función para resetear el formulario
  const resetForm = useCallback(() => {
    setFormData({
      fecha: new Date(),
      hora: new Date(),
      canchaId: '',
      precio: 0,
      jugadoresMax: 10,
      descripcion: ''
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedPartido(null);
    resetForm();
  }, [resetForm]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
  }, [resetForm]);

  const handleCreatePartido = useCallback(async () => {
    console.log('🔥 handleCreatePartido llamado');
    console.log('👤 Usuario actual:', user?.email);
    console.log('📝 Datos del formulario:', formData);
    
    if (!user) {
      console.log('❌ No hay usuario autenticado');
      Alert.alert('Error', 'Debes estar autenticado');
      return;
    }

    // Validaciones
    if (!formData.fecha || !formData.hora || !formData.canchaId) {
      console.log('❌ Faltan campos obligatorios:', {
        fecha: formData.fecha,
        hora: formData.hora,
        canchaId: formData.canchaId
      });
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    console.log('✅ Validaciones pasadas, creando partido...');

    try {
      // Verificar token de autenticación antes de proceder
      console.log('🔑 Verificando autenticación del usuario...');
      const token = await user.getIdToken(true); // Forzar refresh del token
      console.log('✅ Token de autenticación verificado');
      
      // Combinar fecha y hora en una sola fecha
      const fechaCompleta = new Date(
        formData.fecha.getFullYear(),
        formData.fecha.getMonth(),
        formData.fecha.getDate(),
        formData.hora.getHours(),
        formData.hora.getMinutes()
      );

      console.log('📅 Fecha creada:', fechaCompleta);

      const canchaSeleccionada = canchas.find(c => c.id === formData.canchaId);
      console.log('🏟️ Cancha seleccionada:', canchaSeleccionada);
      
      // Obtener nombre del establecimiento desde Firestore
      let nombreEstablecimiento = 'Mi Establecimiento';
      const establishmentData = await getEstablishmentData(user.uid);
      if (establishmentData?.nombre) {
        nombreEstablecimiento = establishmentData.nombre;
      }
      
      const matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'> = {
        fecha: Timestamp.fromDate(fechaCompleta),
        canchaId: formData.canchaId,
        cancheroId: user.uid,
        estado: 'abierto',
        jugadores: [],
        nombreCancha: canchaSeleccionada?.nombre,
        nombreEstablecimiento: nombreEstablecimiento,
        precio: formData.precio,
        jugadoresMax: formData.jugadoresMax,
        descripcion: formData.descripcion,
      };

      console.log('🔥 Datos del partido a crear:', matchData);
      console.log('🔥 Llamando MatchService.crearPartido...');
      const matchId = await MatchService.crearPartido(matchData);
      console.log('✅ Partido creado con ID:', matchId);
      
      Alert.alert('Éxito', '¡Partido creado exitosamente! Ya está disponible para los jugadores.');
      closeCreateModal();
    } catch (error: any) {
      console.error('❌ Error creando partido:', error);
      
      // Mostrar mensaje específico según el tipo de error
      let errorMessage = 'No se pudo crear el partido';
      if (error.message?.includes('permisos')) {
        errorMessage = 'Error de permisos. Verifica tu autenticación.';
      } else if (error.message?.includes('autenticación') || error.message?.includes('token')) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      } else if (error.message?.includes('conexión')) {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  }, [formData, canchas, user, closeCreateModal]);

  const handleEditPartido = useCallback(async () => {
    if (!selectedPartido || !user) {
      Alert.alert('Error', 'No hay partido seleccionado para editar.');
      return;
    }

    // Validaciones básicas
    if (!formData.fecha || !formData.hora || !formData.canchaId) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios.');
      return;
    }

    try {
      // Combinar fecha y hora en una sola fecha
      const fechaCompleta = new Date(
        formData.fecha.getFullYear(),
        formData.fecha.getMonth(),
        formData.fecha.getDate(),
        formData.hora.getHours(),
        formData.hora.getMinutes()
      );

      const canchaSeleccionada = canchas.find(c => c.id === formData.canchaId);
      
      const cambios: Partial<Match> = {
        fecha: Timestamp.fromDate(fechaCompleta),
        canchaId: formData.canchaId,
        nombreCancha: canchaSeleccionada?.nombre,
        precio: formData.precio,
        jugadoresMax: formData.jugadoresMax,
        descripcion: formData.descripcion,
      };
      
      console.log('🔥 Actualizando partido en Firestore:', selectedPartido.id, cambios);
      await MatchService.actualizarPartido(selectedPartido.id!, cambios);
      
      Alert.alert('Éxito', '¡Partido actualizado! Los cambios son visibles para todos los jugadores.');
      closeEditModal();
    } catch (error) {
      console.error('❌ Error actualizando partido:', error);
      Alert.alert('Error', 'Error al actualizar el partido.');
    }
  }, [selectedPartido, formData, canchas, user, closeEditModal]);

  const handleDeletePartido = (partidoId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este partido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await MatchService.eliminarPartido(partidoId);
              Alert.alert('Éxito', 'Partido eliminado correctamente.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el partido.');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (partido: Match) => {
    try {
      console.log('Abriendo modal de edición para partido:', partido.id);
      setSelectedPartido(partido);
      
      // Convertir Timestamp a objetos Date para fecha y hora
      const fecha = partido.fecha.toDate();
      const fechaDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const horaDate = new Date(2000, 0, 1, fecha.getHours(), fecha.getMinutes());
      
      // Encontrar la cancha correspondiente
      const canchaCorrespondiente = canchas.find(c => c.nombre === partido.nombreCancha || c.id === partido.canchaId);
      
      const newFormData = {
        fecha: fechaDate,
        hora: horaDate,
        canchaId: canchaCorrespondiente?.id || partido.canchaId,
        precio: partido.precio || 0,
        jugadoresMax: partido.jugadoresMax || 10,
        descripcion: partido.descripcion || ''
      };
      
      console.log('Datos del formulario a establecer:', newFormData);
      setFormData(newFormData);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error al abrir modal de edición:', error);
      Alert.alert('Error', 'Error al cargar los datos del partido para edición.');
    }
  };

  const renderPartidoItem = ({ item }: { item: Match }) => {
    const fecha = item.fecha.toDate();
    const isOwner = user?.uid === item.cancheroId;

    return (
      <View style={styles.partidoCard}>
        <View style={styles.partidoHeader}>
          <Text style={styles.partidoFecha}>
            {fecha.toLocaleDateString()} - {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isOwner && (
            <View style={styles.partidoActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
                <Ionicons name="pencil" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeletePartido(item.id!)} style={styles.actionButton}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <Text style={styles.partidoCancha}>{item.nombreCancha || item.canchaId}</Text>
        
        <View style={styles.partidoInfo}>
          <View style={[styles.infoTag, item.estado === 'abierto' ? styles.abierto : styles.cerrado]}>
            <Text style={styles.infoText}>{item.estado}</Text>
          </View>
          <View style={styles.infoTag}>
            <Text style={styles.infoText}>{item.jugadores.length}/{item.jugadoresMax || 10} jugadores</Text>
          </View>
        </View>
        
        {item.precio && item.precio > 0 && (
          <Text style={styles.partidoPrecio}>${item.precio.toLocaleString()}</Text>
        )}
        
        {item.descripcion && <Text style={styles.partidoDesc}>{item.descripcion}</Text>}
        
        {/* Lista de jugadores unidos */}
        {item.jugadores && item.jugadores.length > 0 && (
          <View style={styles.jugadoresSection}>
            <Text style={styles.jugadoresTitulo}>Jugadores Unidos:</Text>
            <View style={styles.jugadoresList}>
              {item.jugadores.map((jugador, index) => (
                <View key={jugador.uid} style={styles.jugadorItem}>
                  <View style={styles.jugadorInfo}>
                    <Ionicons name="person" size={16} color="#007AFF" />
                    <Text style={styles.jugadorNombre}>
                      {jugador.displayName || jugador.email}
                    </Text>
                  </View>
                  <Text style={styles.jugadorEmail}>{jugador.email}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
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
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header de partidos con botón crear */}
      <View style={styles.partidosHeader}>
        <Text style={styles.partidosTitle}>Mis Partidos ({partidos.length})</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Crear Partido</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de partidos */}
      <FlatList
        data={partidos}
        renderItem={renderPartidoItem}
        keyExtractor={(item) => item.id!}
        style={styles.partidosList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No has creado ningún partido aún</Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createFirstButtonText}>Crear tu primer partido</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modals */}
      <FormModal
        visible={showCreateModal}
        onClose={closeCreateModal}
        onSubmit={handleCreatePartido}
        title="Crear Partido"
        formData={formData}
        setFormData={setFormData}
        canchas={canchas}
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
      />

      <FormModal
        visible={showEditModal}
        onClose={closeEditModal}
        onSubmit={handleEditPartido}
        title="Editar Partido"
        formData={formData}
        setFormData={setFormData}
        canchas={canchas}
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
      />
    </View>
  );
};

export default React.memo(CancheroScreen);
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header navigation styles
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginRight: 15,
  },
  headerButton: {
    padding: 4,
  },

  // Header partidos styles
  partidosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 0,
  },
  partidosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  // Partidos list styles
  partidosList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  partidoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  partidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  partidoFecha: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  partidoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f8f8f8',
  },
  partidoCancha: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  partidoInfo: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  infoTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  privado: {
    backgroundColor: '#fff3e0',
  },
  publico: {
    backgroundColor: '#e8f5e8',
  },
  infoText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  partidoPrecio: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 3,
  },
  partidoDesc: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 2,
  },

  // Create button styles
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50, // Para el safe area
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Form styles
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  dateTimeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textTransform: 'capitalize',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },

  // Picker styles
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  pickerDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  pickerTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerTextDisabled: {
    color: '#999',
  },

  // Estados de partidos
  abierto: {
    backgroundColor: '#e8f5e8',
  },
  cerrado: {
    backgroundColor: '#ffebee',
  },

  // Loading y error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Estilos para lista de jugadores
  jugadoresSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  jugadoresTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  jugadoresList: {
    gap: 4,
  },
  jugadorItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  jugadorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  jugadorNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  jugadorEmail: {
    fontSize: 11,
    color: '#666',
    marginLeft: 20,
  },
  webPickerContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  picker: {
    marginVertical: 10,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
