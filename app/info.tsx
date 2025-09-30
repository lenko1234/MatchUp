import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../src/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import app from '../src/firebase';
import { usePartidosCanchero } from '../src/hooks/useMatches';

const auth = getAuth(app);

export default function CancheroInfo() {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [editValue, setEditValue] = useState('');
  
  // Estados para la información editable del establecimiento
  const [establishmentInfo, setEstablishmentInfo] = useState({
    nombre: 'Mi Establecimiento',
    direccion: 'Av. Principal 123, Buenos Aires',
    telefono: '+54 11 1234-5678',
    horarios: 'Lun-Dom 08:00 - 23:00'
  });

  // Funciones para persistencia de datos en Firestore (compartida entre dispositivos)
  const saveEstablishmentData = async (data: any) => {
    if (!user?.uid) return;
    
    try {
      console.log(`💾 Guardando datos del establecimiento en Firestore:`, data);
      
      // Importar Firestore functions dinámicamente
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../src/firebase');
      
      // Guardar en Firestore en una colección 'establishments'
      const establishmentRef = doc(db, 'establishments', user.uid);
      await setDoc(establishmentRef, {
        ...data,
        updatedAt: new Date(),
        userId: user.uid
      }, { merge: true });
      
      console.log('✅ Datos guardados en Firestore');
    } catch (error) {
      console.error('❌ Error saving establishment data to Firestore:', error);
    }
  };

  const loadEstablishmentData = async () => {
    if (!user?.uid) return;
    
    try {
      console.log(`📖 Cargando datos del establecimiento desde Firestore`);
      
      // Importar Firestore functions dinámicamente
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../src/firebase');
      
      // Obtener de Firestore
      const establishmentRef = doc(db, 'establishments', user.uid);
      const establishmentDoc = await getDoc(establishmentRef);
      
      if (establishmentDoc.exists()) {
        const data = establishmentDoc.data();
        console.log('✅ Datos cargados desde Firestore:', data);
        setEstablishmentInfo({
          nombre: data.nombre || 'Mi Establecimiento',
          direccion: data.direccion || 'Av. Principal 123, Buenos Aires',
          telefono: data.telefono || '+54 11 1234-5678',
          horarios: data.horarios || 'Lun-Dom 08:00 - 23:00'
        });
      } else {
        console.log('📝 No hay datos del establecimiento, usando valores por defecto');
      }
    } catch (error) {
      console.error('❌ Error loading establishment data from Firestore:', error);
    }
  };

  // Hook para obtener estadísticas de partidos
  const { matches: partidos } = usePartidosCanchero(user?.uid || '');

  // Configurar botón de regreso en el header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cargar datos guardados cuando el usuario esté disponible
  useEffect(() => {
    const initializeData = async () => {
      if (user?.uid) {
        await loadEstablishmentData();
        
        // Si no hay datos guardados, guardar los valores por defecto
        try {
          const key = `establishment_${user.uid}`;
          let saved = null;
          
          // Load from Firestore
          const establishmentDoc = await getDoc(doc(db, 'establishments', user.uid));
          if (establishmentDoc.exists()) {
            const data = establishmentDoc.data();
            saved = JSON.stringify({
              establishmentName: data.establishmentName || '',
              ownerName: data.ownerName || '',
              direccion: data.direccion || '',
              telefono: data.telefono || '',
              email: data.email || ''
            });
          }
          
          // No guardar datos por defecto automáticamente
          // El usuario debe editar manualmente para guardar
        } catch (error) {
          console.error('Error initializing establishment data:', error);
        }
      }
    };

    initializeData();
  }, [user?.uid]);

  // Funciones para manejar la edición
  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (editValue.trim()) {
      const newData = {
        ...establishmentInfo,
        [editingField]: editValue.trim()
      };
      setEstablishmentInfo(newData);
      await saveEstablishmentData(newData);
      
      // Si se cambió el nombre del establecimiento, actualizar todos los partidos del canchero
      if (editingField === 'nombre' && user?.uid) {
        try {
          // Importar las funciones necesarias de Firestore
          const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
          const { db, COLLECTIONS } = await import('../src/firebase');
          
          // Buscar todos los partidos del canchero
          const partidosQuery = query(
            collection(db, COLLECTIONS.MATCHES), 
            where('cancheroId', '==', user.uid)
          );
          
          const querySnapshot = await getDocs(partidosQuery);
          
          // Actualizar cada partido con el nuevo nombre
          const updatePromises = querySnapshot.docs.map(partidoDoc => {
            const partidoRef = doc(db, COLLECTIONS.MATCHES, partidoDoc.id);
            return updateDoc(partidoRef, {
              nombreEstablecimiento: newData.nombre
            });
          });
          
          await Promise.all(updatePromises);
          console.log('✅ Nombres de establecimiento actualizados en todos los partidos');
          
        } catch (error) {
          console.error('Error actualizando partidos:', error);
        }
      }
      
      setShowEditModal(false);
      setEditingField('');
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingField('');
    setEditValue('');
  };

  // Calcular estadísticas
  const stats = {
    totalPartidos: partidos?.length || 0,
    partidosActivos: partidos?.filter(p => p.estado === 'abierto').length || 0,
    totalJugadores: partidos?.reduce((acc, partido) => acc + partido.jugadores.length, 0) || 0,
    ingresosTotales: partidos?.reduce((acc, partido) => acc + (partido.precio || 0), 0) || 0
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Información Personal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Información Personal</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user?.email || 'No disponible'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Usuario ID:</Text>
              <Text style={styles.infoValue}>{user?.uid?.substring(0, 10)}...</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tipo de cuenta:</Text>
              <Text style={[styles.infoValue, styles.cancheroLabel]}>Canchero</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <View style={styles.statusContainer}>
                <View style={styles.activeIndicator} />
                <Text style={styles.activeText}>Activo</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Información del Establecimiento */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Establecimiento</Text>
          </View>
          
          <View style={styles.infoCard}>
            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('nombre', establishmentInfo.nombre)}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <View style={styles.editableField}>
                <Text style={styles.infoValue}>{establishmentInfo.nombre}</Text>
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('direccion', establishmentInfo.direccion)}>
              <Text style={styles.infoLabel}>Dirección:</Text>
              <View style={styles.editableField}>
                <Text style={styles.infoValue}>{establishmentInfo.direccion}</Text>
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('telefono', establishmentInfo.telefono)}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <View style={styles.editableField}>
                <Text style={styles.infoValue}>{establishmentInfo.telefono}</Text>
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.infoRow} onPress={() => handleEditField('horarios', establishmentInfo.horarios)}>
              <Text style={styles.infoLabel}>Horarios:</Text>
              <View style={styles.editableField}>
                <Text style={styles.infoValue}>{establishmentInfo.horarios}</Text>
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Canchas Disponibles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="football" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Canchas Disponibles</Text>
          </View>
          
          <View style={styles.canchasContainer}>
            {['Cancha 1', 'Cancha 2', 'Cancha 3'].map((cancha, index) => (
              <View key={index} style={styles.canchaCard}>
                <View style={styles.canchaInfo}>
                  <Text style={styles.canchaName}>{cancha}</Text>
                  <Text style={styles.canchaType}>Fútbol 5</Text>
                </View>
                <View style={[styles.canchaStatus, index === 2 && styles.canchaUnavailable]}>
                  <Text style={[styles.canchaStatusText, index === 2 && styles.canchaUnavailableText]}>
                    {index === 2 ? 'No disponible' : 'Disponible'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Estadísticas</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalPartidos}</Text>
              <Text style={styles.statLabel}>Partidos Creados</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.partidosActivos}</Text>
              <Text style={styles.statLabel}>Partidos Activos</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalJugadores}</Text>
              <Text style={styles.statLabel}>Total Jugadores</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${stats.ingresosTotales.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Ingresos Totales</Text>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Acciones</Text>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditField('nombre', establishmentInfo.nombre)}
            >
              <Ionicons name="create" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Editar Nombre</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleEditField('direccion', establishmentInfo.direccion)}
            >
              <Ionicons name="business" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Editar Dirección</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
            >
              <Ionicons name="football" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Gestionar Canchas</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Edición */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Editar {editingField === 'nombre' ? 'Nombre' :
                     editingField === 'direccion' ? 'Dirección' :
                     editingField === 'telefono' ? 'Teléfono' : 'Horarios'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Ingrese ${editingField}`}
              multiline={editingField === 'direccion' || editingField === 'horarios'}
              numberOfLines={editingField === 'direccion' || editingField === 'horarios' ? 3 : 1}
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleCancelEdit}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveEdit}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header navigation
  headerButton: {
    padding: 4,
    marginLeft: 15,
  },
  
  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  // Info Cards
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  cancheroLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  activeText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  
  // Canchas
  canchasContainer: {
    gap: 8,
  },
  canchaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  canchaInfo: {
    flex: 1,
  },
  canchaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  canchaType: {
    fontSize: 12,
    color: '#666',
  },
  canchaStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e8f5e8',
  },
  canchaUnavailable: {
    backgroundColor: '#ffebee',
  },
  canchaStatusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  canchaUnavailableText: {
    color: '#f44336',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Actions
  actionsContainer: {
    gap: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Loading
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
  
  // Editable fields
  editableField: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});