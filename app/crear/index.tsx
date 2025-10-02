

import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { getAuth } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { MatchService } from '../../src/services/MatchService';
import { useRouter } from 'expo-router';

export default function Crear() {
  const [nombreCancha, setNombreCancha] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [jugadoresMax, setJugadoresMax] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoAcceso, setTipoAcceso] = useState<'publico' | 'privado'>('publico');
  const [contraseña, setContraseña] = useState('');

  const router = useRouter();

  const [tipoPartido, setTipoPartido] = useState<'masculino' | 'femenino' | 'mixto' | ''>('');

  const crearPartido = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear partidos');
      return;
    }

    // Obtener sexo del usuario
    let sexo = '';
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const profileDoc = await getDoc(doc(require('../../src/firebase').db, 'users', user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        sexo = profileData.sexo || '';
      }
    } catch (e) {}

    // Validar tipoPartido
    let tipoFinal = tipoPartido;
    if (!tipoFinal) {
      // Si el usuario no seleccionó, asignar por defecto
      if (sexo === 'hombre') tipoFinal = 'masculino';
      else if (sexo === 'mujer') tipoFinal = 'femenino';
      else tipoFinal = 'mixto';
    }
    if (sexo === 'hombre' && tipoFinal === 'femenino') {
      Alert.alert('Error', 'No puedes crear partido femenino');
      return;
    }
    if (sexo === 'mujer' && tipoFinal === 'masculino') {
      Alert.alert('Error', 'No puedes crear partido masculino');
      return;
    }

    if (!nombreCancha.trim() || !fecha.trim() || !hora.trim() || !jugadoresMax.trim()) {
      Alert.alert('Error', 'Por favor completá los campos obligatorios');
      return;
    }

    const jugadoresMaxNumero = parseInt(jugadoresMax);
    if (isNaN(jugadoresMaxNumero) || jugadoresMaxNumero <= 0) {
      Alert.alert('Error', 'La cantidad máxima de jugadores debe ser un número válido');
      return;
    }

    if (tipoAcceso === 'privado' && !contraseña.trim()) {
      Alert.alert('Error', 'Los partidos privados requieren contraseña');
      return;
    }

    try {
      const fechaCompleta = new Date(`${fecha}T${hora}:00`);
      if (isNaN(fechaCompleta.getTime())) {
        Alert.alert('Error', 'Formato de fecha u hora inválido');
        return;
      }

      await MatchService.crearPartido({
        nombreCancha,
        canchaId: nombreCancha,
        fecha: Timestamp.fromDate(fechaCompleta),
        hora,
        jugadoresMax: jugadoresMaxNumero,
        jugadores: [],
        estado: 'abierto',
        precio: precio ? parseFloat(precio) : 0,
        descripcion,
        tipoAcceso,
        contraseña: tipoAcceso === 'privado' ? contraseña : '',
        cancheroId: user.uid,
        tipoPartido: tipoFinal,
      });

      Alert.alert('¡Partido creado!', 'El partido se ha creado exitosamente');
      router.replace('/canchero');
      
  // Limpiar campos
  setNombreCancha('');
  setFecha('');
  setHora('');
  setJugadoresMax('');
  setPrecio('');
  setDescripcion('');
  setContraseña('');
  setTipoAcceso('publico');
  setTipoPartido('');
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al crear el partido');
    }
  };

  // Render opciones de tipoPartido según sexo
  const auth = getAuth();
  const user = auth.currentUser;
  const [userSexo, setUserSexo] = useState('');
  React.useEffect(() => {
    async function fetchSexo() {
      if (!user) return;
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const profileDoc = await getDoc(doc(require('../../src/firebase').db, 'users', user.uid));
        if (profileDoc.exists()) {
          setUserSexo(profileDoc.data().sexo || '');
        }
      } catch (e) {}
    }
    fetchSexo();
  }, [user]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Crear un partido</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Nombre de la cancha *" 
        value={nombreCancha} 
        onChangeText={setNombreCancha} 
        placeholderTextColor="#888" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Fecha (YYYY-MM-DD) *" 
        value={fecha} 
        onChangeText={setFecha} 
        placeholderTextColor="#888" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Hora (HH:mm) *" 
        value={hora} 
        onChangeText={setHora} 
        placeholderTextColor="#888" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Máximo de jugadores *" 
        value={jugadoresMax} 
        onChangeText={setJugadoresMax} 
        keyboardType="numeric" 
        placeholderTextColor="#888" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Precio (opcional)" 
        value={precio} 
        onChangeText={setPrecio} 
        keyboardType="numeric" 
        placeholderTextColor="#888" 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Descripción (opcional)" 
        value={descripcion} 
        onChangeText={setDescripcion} 
        placeholderTextColor="#888" 
        multiline
        numberOfLines={3}
      />

      <Text style={styles.subtitulo}>Tipo de partido</Text>
      <View style={styles.radioContainer}>
        {(userSexo === 'hombre' || userSexo === '') && (
          <>
            <Button
              title={tipoPartido === 'masculino' ? '● Masculino' : '○ Masculino'}
              onPress={() => setTipoPartido('masculino')}
            />
            <Button
              title={tipoPartido === 'mixto' ? '● Mixto' : '○ Mixto'}
              onPress={() => setTipoPartido('mixto')}
            />
          </>
        )}
        {userSexo === 'mujer' && (
          <>
            <Button
              title={tipoPartido === 'femenino' ? '● Femenino' : '○ Femenino'}
              onPress={() => setTipoPartido('femenino')}
            />
            <Button
              title={tipoPartido === 'mixto' ? '● Mixto' : '○ Mixto'}
              onPress={() => setTipoPartido('mixto')}
            />
          </>
        )}
      </View>

      <Text style={styles.subtitulo}>Tipo de acceso</Text>
      <View style={styles.radioContainer}>
        <Button
          title={tipoAcceso === 'publico' ? '● Público' : '○ Público'}
          onPress={() => setTipoAcceso('publico')}
        />
        <Button
          title={tipoAcceso === 'privado' ? '● Privado' : '○ Privado'}
          onPress={() => setTipoAcceso('privado')}
        />
      </View>

      {tipoAcceso === 'privado' && (
        <TextInput 
          style={styles.input} 
          placeholder="Contraseña para el partido *" 
          value={contraseña} 
          onChangeText={setContraseña} 
          secureTextEntry
          placeholderTextColor="#888" 
        />
      )}

      <Button title="Crear Partido" onPress={crearPartido} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f2f2f2' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subtitulo: { fontSize: 18, fontWeight: '600', marginTop: 10, marginBottom: 8 },
  input: { backgroundColor: '#fff', color: '#000', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
});