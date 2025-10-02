import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../src/firebase';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// Utilidades para manejar usernames localmente
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

export default function LoginJugador() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [gender, setGender] = useState<'hombre' | 'mujer' | 'prefiero no decirlo' | ''>('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [usuario, setUsuario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Modo de prueba temporal para evitar problemas de Firestore
  const TEST_MODE = false;

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: '813594112887-o0275e55c1087q0dsdu8tsotv7nqlv1c.apps.googleusercontent.com',
    androidClientId: '834802568976-2v6v6v6v6v6v6v6v6v6v6v6v6v6v6v.apps.googleusercontent.com', // Reemplaza por tu clientId de Android
    iosClientId: '834802568976-2v6v6v6v6v6v6v6v6v6v6v6v6v6v6v.apps.googleusercontent.com', // Reemplaza por tu clientId de iOS
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
          Alert.alert('¡Bienvenido con Google!');
          router.replace('/partidos');
        })
        .catch((error) => {
          Alert.alert('Error', error.message);
        });
    }
  }, [response]);

  const handleLogin = async () => {
    console.log('handleLogin ejecutándose...', { email, password: '***' });
    
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    // Detectar si el usuario ingresó un email o un username
    const isEmail = email.includes('@');
    let loginEmail = email;

    // Si no es email, buscar el email correspondiente al username
    if (!isEmail) {
      const emailFromUsername = getEmailByUsername(email);
      if (emailFromUsername) {
        loginEmail = emailFromUsername;
        console.log('Username encontrado, usando email:', loginEmail);
      } else {
        Alert.alert('Username no encontrado', 'No se encontró una cuenta con ese username. ¿Deseas registrarte?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Registrarme', onPress: () => setIsRegister(true) }
        ]);
        return;
      }
    }

    try {
      console.log('Intentando login con email:', loginEmail);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      console.log('Login exitoso con Firebase Auth');
      
      // Login exitoso - ir directamente a la pantalla de partidos
      Alert.alert('¡Bienvenido!', 'Login exitoso');
      router.replace('/partidos');
      
    } catch (error: any) {
      console.error('Error en login:', error);
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
    console.log('=== INICIO handleRegister ===');
    console.log('Estados actuales:', {
      email,
      password: password ? '***' : 'VACÍO',
      gender,
      nombre,
      apellido,
      usuario,
      fechaNacimiento: fechaNacimiento ? fechaNacimiento.toISOString() : 'NO SELECCIONADA'
    });

    if (!email || !password || !gender || !nombre || !apellido || !usuario || !telefono || !fechaNacimiento) {
      console.log('❌ Faltan campos obligatorios');
      Alert.alert('Error', 'Por favor completa todos los campos, incluyendo nombre, apellido, usuario, teléfono, fecha de nacimiento y género.');
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

    // Verificar si el username ya existe
    const existingEmail = getEmailByUsername(usuario);
    if (existingEmail) {
      console.log('❌ Username ya existe');
      Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor elige otro.');
      return;
    }

    console.log('✅ Username disponible, iniciando registro...');

    try {
      console.log('Intentando registro con:', { email, password: '***', usuario });

      // Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Guardar el mapping username-email localmente
      saveUsernameMapping(usuario, email);

      // Actualizar el perfil en Firebase Auth con la información del usuario
      await updateProfile(userCredential.user, { 
        displayName: `${nombre} ${apellido}` 
      });

      // Guardar datos extra en Firestore
      try {
        const { setDoc, doc } = await import('firebase/firestore');
        await setDoc(doc(require('../src/firebase').db, 'users', userCredential.user.uid), {
          username: usuario,
          nombreCompleto: `${nombre} ${apellido}`,
          sexo: gender,
          telefono,
          fechaNacimiento: fechaNacimiento ? fechaNacimiento.toISOString().split('T')[0] : '',
          email,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error guardando datos extra en Firestore:', e);
      }

      Alert.alert('¡Registro exitoso!', 'Ahora puedes iniciar sesión con tu email o username.');
      setIsRegister(false);
    } catch (error: any) {
      console.error('Error completo en registro:', error);
      
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
          <Text style={styles.titulo}>{isRegister ? 'Registrarse' : 'Iniciar sesión'}</Text>
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
              placeholder="Número de teléfono"
              placeholderTextColor="#888"
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          )}
          {isRegister && (
            <View style={styles.datePickerContainer}>
              <Text style={styles.pickerLabel}>Fecha de nacimiento:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    fontSize: '16px',
                    marginTop: '4px',
                    height: '50px',
                    boxSizing: 'border-box',
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  min="1920-01-01"
                  value={fechaNacimiento ? fechaNacimiento.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFechaNacimiento(new Date(e.target.value));
                    }
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateButtonText}>
                      {fechaNacimiento ? fechaNacimiento.toLocaleDateString() : 'Selecciona fecha'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={fechaNacimiento || new Date(2000, 0, 1)}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      minimumDate={new Date(1920, 0, 1)}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setFechaNacimiento(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
            </View>
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
          {isRegister && (
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Género:</Text>
              <View style={styles.genderButtonRow}>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'hombre' && styles.genderSelected]}
                  onPress={() => setGender('hombre')}
                >
                  <Text style={styles.genderText}>Hombre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'mujer' && styles.genderSelected]}
                  onPress={() => setGender('mujer')}
                >
                  <Text style={styles.genderText}>Mujer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, gender === 'prefiero no decirlo' && styles.genderSelected]}
                  onPress={() => setGender('prefiero no decirlo')}
                >
                  <Text style={styles.genderText}>Prefiero no decirlo</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
                <TouchableOpacity 
                  style={styles.registerButton} 
                  onPress={() => {
                    console.log('🔥 CLICK EN REGISTRARME DETECTADO');
                    handleRegister();
                  }}
                >
                  <Text style={styles.registerButtonText}>Registrarme</Text>
                </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeModalButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  closeModalText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  datePickerContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginTop: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  genderContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 16,
    width: '100%',
  },
  genderLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  genderButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  genderButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    minWidth: '30%',
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
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
  registerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
