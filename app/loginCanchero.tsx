import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../src/firebase';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// Utilidades para manejar usernames localmente (copiadas de loginJugador)
const USERNAME_STORAGE_KEY = 'usernames_map';

const saveUsernameMapping = (username: string, email: string) => {
  if (typeof window !== 'undefined') {
    try {
      const existingMappings = getUsernameMappings();
      const updatedMappings = { ...existingMappings, [username.toLowerCase()]: email };
      localStorage.setItem(USERNAME_STORAGE_KEY, JSON.stringify(updatedMappings));
    } catch (error) {
      console.error('Error saving username mapping:', error);
    }
  }
};

const getUsernameMappings = (): Record<string, string> => {
  if (typeof window !== 'undefined') {
    try {
      const mappings = localStorage.getItem(USERNAME_STORAGE_KEY);
      return mappings ? JSON.parse(mappings) : {};
    } catch (error) {
      console.error('Error retrieving username mappings:', error);
      return {};
    }
  }
  return {};
};

const getEmailByUsername = (username: string): string | null => {
  const mappings = getUsernameMappings();
  return mappings[username.toLowerCase()] || null;
};

WebBrowser.maybeCompleteAuthSession();

export default function LoginCanchero() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [usuario, setUsuario] = useState('');
  const [nombreCancha, setNombreCancha] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '813594112887-o0275e55c1087q0dsdu8tsotv7nqlv1c.apps.googleusercontent.com',
    androidClientId: '834802568976-2v6v6v6v6v6v6v6v6v6v6v6v6v6v6v.apps.googleusercontent.com',
    iosClientId: '834802568976-2v6v6v6v6v6v6v6v6v6v6v6v6v6v6v.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params;
      if (!access_token) {
        Alert.alert('Error', 'No se recibió el access token de Google.');
        return;
      }
      const credential = GoogleAuthProvider.credential(null, access_token);
      signInWithCredential(auth, credential)
        .then(() => {
          Alert.alert('¡Bienvenido canchero!');
          router.replace('/canchero');
        })
        .catch((error) => {
          Alert.alert('Error', error.message);
        });
    }
  }, [response]);

  const handleLogin = async () => {
    console.log('handleLogin de canchero ejecutándose...', { email, password: '***' });
    
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    // Detectar si el usuario ingresó un email o un username
    const isEmail = email.includes('@');
    let loginEmail = email;

    if (!isEmail) {
      // Es un username, buscar el email correspondiente
      try {
        const foundEmail = await getEmailByUsername(email);
        if (!foundEmail) {
          Alert.alert('Error', 'Usuario no encontrado. Verifica tu usuario o email.');
          return;
        }
        loginEmail = foundEmail;
      } catch (error) {
        Alert.alert('Error', 'Error al buscar el usuario. Intenta con tu email.');
        return;
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      
      // TEMPORALMENTE SIMPLIFICADO: Sin verificación de tipo de usuario para evitar errores de Firestore
      // TODO: Implementar verificación alternativa sin Firestore
      
      Alert.alert('¡Bienvenido canchero!');
      router.replace('/canchero');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert('Usuario no encontrado. ¿Deseas registrarte?', '', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrarme', onPress: () => setIsRegister(true) }
        ]);
      } else if (error.code === 'auth/wrong-password') {
        Alert.alert('Contraseña incorrecta.');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleRegister = async () => {
    console.log('=== INICIO handleRegister CANCHERO ===');
    console.log('Estados actuales:', {
      email,
      password: password ? '***' : 'VACÍO',
      nombre,
      apellido,
      usuario,
      nombreCancha,
      direccion,
      telefono
    });

    if (!email || !password || !nombre || !apellido || !usuario || !nombreCancha || !direccion || !telefono) {
      console.log('❌ Faltan campos obligatorios');
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    console.log('✅ Todos los campos están completos');

    // Validaciones adicionales
    if (password.length < 6) {
      console.log('❌ Contraseña muy corta');
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      console.log('❌ Email inválido');
      Alert.alert('Error', 'Por favor ingresa un email válido.');
      return;
    }

    console.log('✅ Validaciones pasadas');

    try {
      // Verificar que el username no esté en uso
      const existingUser = getEmailByUsername(usuario);
      if (existingUser) {
        console.log('❌ Username ya existe');
        Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor elige otro.');
        return;
      }

      console.log('✅ Username disponible, iniciando registro...');

      // Crear el usuario en Firebase Auth
      console.log('Intentando registro con:', { email, password: '***', usuario });
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Guardar el mapping username-email localmente
      saveUsernameMapping(usuario, email);
      
      // Actualizar el perfil en Firebase Auth
      await updateProfile(userCredential.user, { 
        displayName: `${nombre} ${apellido} - ${nombreCancha}` 
      });

      // Crear establishment automáticamente
      console.log('Creando establishment automáticamente...');
      try {
        await addDoc(collection(db, 'establishments'), {
          ownerId: userCredential.user.uid,
          nombre: nombreCancha,
          direccion: direccion,
          telefono: telefono,
          descripcion: `Establecimiento de ${nombre} ${apellido}`,
          canchas: [],
          createdAt: new Date(),
          ownerName: `${nombre} ${apellido}`,
          ownerEmail: email
        });
        console.log('✅ Establishment creado exitosamente');
      } catch (establishmentError) {
        console.error('Error creando establishment:', establishmentError);
        // No fallar el registro por esto, solo log
      }

      Alert.alert('¡Registro exitoso! Ahora puedes iniciar sesión con tu email o usuario.');
      setIsRegister(false);
    } catch (error: any) {
      console.error('Error completo en registro de canchero:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Error', 'Este email ya está registrado. ¿Deseas iniciar sesión?');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Error', 'El formato del email no es válido.');
      } else if (error.code === 'auth/operation-not-allowed') {
        Alert.alert('Error', 'El registro con email/contraseña no está habilitado.');
      } else {
        Alert.alert('Error', `Error en el registro: ${error.message}\nCódigo: ${error.code}`);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.titulo}>{isRegister ? 'Registrarse como Canchero' : 'Iniciar sesión - Canchero'}</Text>
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#888"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
            />
          )}
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="#888"
              value={apellido}
              onChangeText={setApellido}
              autoCapitalize="words"
            />
          )}
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor="#888"
              value={usuario}
              onChangeText={setUsuario}
              autoCapitalize="none"
            />
          )}
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Nombre de la Cancha"
              placeholderTextColor="#888"
              value={nombreCancha}
              onChangeText={setNombreCancha}
              autoCapitalize="words"
            />
          )}
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Dirección de la Cancha"
              placeholderTextColor="#888"
              value={direccion}
              onChangeText={setDireccion}
              autoCapitalize="words"
            />
          )}
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Teléfono de contacto"
              placeholderTextColor="#888"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email o Usuario"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            onSubmitEditing={() => {
              if (!isRegister) {
                handleLogin();
              }
            }}
            returnKeyType={isRegister ? "next" : "go"}
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onSubmitEditing={isRegister ? handleRegister : handleLogin}
              returnKeyType={isRegister ? "done" : "go"}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#888" />
            </TouchableOpacity>
          </View>
          {!isRegister && (
            <View style={styles.buttonSpacing}>
              <Button
                title="Registrarme con Google"
                onPress={() => promptAsync()}
                disabled={!request}
                color="#4285F4"
              />
            </View>
          )}
          {isRegister ? (
            <>
              <View style={styles.buttonSpacing}>
                <Button title="Registrarme" onPress={handleRegister} />
              </View>
              <TouchableOpacity onPress={() => setIsRegister(false)} style={styles.linkButton}>
                <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.buttonSpacing}>
                <Button title="Ingresar" onPress={handleLogin} />
              </View>
              <View style={styles.buttonSpacing}>
                <Button title="Crear cuenta" onPress={() => setIsRegister(true)} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    minHeight: '100%',
  },
  buttonSpacing: {
    marginBottom: 16,
    width: '100%',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  eyeButton: {
    padding: 8,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});