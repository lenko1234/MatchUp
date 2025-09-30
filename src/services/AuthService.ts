import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  getAuth,
  User
} from 'firebase/auth';

export class AuthService {
  
  /**
   * Registrar un nuevo usuario
   */
  static async registrarUsuario(email: string, password: string): Promise<User> {
    const auth = getAuth();
    
    try {
      console.log('🔐 AuthService: Registrando usuario:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthService: Usuario registrado exitosamente:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('❌ AuthService: Error registrando usuario:', error);
      throw new Error(`Error al registrar usuario: ${error.message}`);
    }
  }

  /**
   * Iniciar sesión
   */
  static async iniciarSesion(email: string, password: string): Promise<User> {
    const auth = getAuth();
    
    try {
      console.log('🔐 AuthService: Iniciando sesión:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthService: Sesión iniciada exitosamente:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('❌ AuthService: Error iniciando sesión:', error);
      throw new Error(`Error al iniciar sesión: ${error.message}`);
    }
  }

  /**
   * Cerrar sesión
   */
  static async cerrarSesion(): Promise<void> {
    const auth = getAuth();
    
    try {
      console.log('🔐 AuthService: Cerrando sesión...');
      await signOut(auth);
      console.log('✅ AuthService: Sesión cerrada exitosamente');
    } catch (error: any) {
      console.error('❌ AuthService: Error cerrando sesión:', error);
      throw new Error(`Error al cerrar sesión: ${error.message}`);
    }
  }

  /**
   * Obtener usuario actual
   */
  static getUsuarioActual(): User | null {
    const auth = getAuth();
    return auth.currentUser;
  }

  /**
   * Registrar o iniciar sesión automáticamente para testing
   */
  static async registrarOIniciarSesion(email: string, password: string = 'password123'): Promise<User> {
    try {
      // Intentar iniciar sesión primero
      return await this.iniciarSesion(email, password);
    } catch (error: any) {
      if (error.message.includes('user-not-found') || error.message.includes('wrong-password')) {
        // Si el usuario no existe, registrarlo
        console.log('👤 AuthService: Usuario no encontrado, registrando...');
        return await this.registrarUsuario(email, password);
      }
      throw error;
    }
  }
}