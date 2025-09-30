import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>¿Cómo quieres ingresar?</Text>
      <Text style={styles.subtitulo}>Selecciona tu tipo de usuario</Text>
      
      <TouchableOpacity 
        style={styles.optionButton}
        onPress={() => router.push('/loginJugador')}
      >
        <View style={styles.optionContent}>
          <Ionicons name="person" size={40} color="#007AFF" />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Soy Jugador</Text>
            <Text style={styles.optionDescription}>Buscar y unirme a partidos</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.optionButton}
        onPress={() => router.push('/loginCanchero')}
      >
        <View style={styles.optionContent}>
          <Ionicons name="business" size={40} color="#4CAF50" />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Soy Canchero</Text>
            <Text style={styles.optionDescription}>Gestionar mi cancha y partidos</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitulo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionButton: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  optionText: {
    flex: 1,
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
});