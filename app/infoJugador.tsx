// Removed stray JSX from top of file
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';

export default function InfoJugador() {
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<any>(null);
	const auth = getAuth();
	const user = auth.currentUser;

	useEffect(() => {
		async function fetchProfile() {
			if (!user) return;
			try {
				const docRef = doc(db, 'users', user.uid);
				const docSnap = await getDoc(docRef);
				if (docSnap.exists()) {
					setProfile(docSnap.data());
				} else {
					setProfile({});
				}
			} catch (e) {
				setProfile({});
			}
			setLoading(false);
		}
		fetchProfile();
	}, [user]);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={styles.loadingText}>Cargando perfil...</Text>
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.title}>Perfil privado de jugador</Text>
			<View style={styles.infoBox}>


				


				<Text style={styles.label}>Nombre completo:</Text>
				<Text style={styles.value}>{profile?.nombreCompleto || user?.displayName || '-'}</Text>

				<Text style={styles.label}>Nombre de usuario:</Text>
				<Text style={styles.value}>{profile?.username || '-'}</Text>

				<Text style={styles.label}>Número de teléfono:</Text>
				<Text style={styles.value}>{profile?.telefono || '-'}</Text>

				<Text style={styles.label}>Correo electrónico:</Text>
				<Text style={styles.value}>{user?.email || '-'}</Text>


				<Text style={styles.label}>Sexo:</Text>
				<Text style={styles.value}>{profile?.sexo || '-'}</Text>

				<Text style={styles.label}>Fecha de nacimiento:</Text>
				<Text style={styles.value}>{profile?.fechaNacimiento || '-'}</Text>

				<Text style={styles.label}>Redes sociales vinculadas:</Text>
				<Text style={styles.value}>{profile?.redesSociales || '-'}</Text>


				<Text style={styles.label}>Estado de la cuenta:</Text>
				<Text style={styles.value}>{profile?.estado || 'activa'}</Text>
			</View>
			<Text style={styles.privacidad}>🔒 Estos datos son privados y nunca se muestran públicamente sin tu permiso.</Text>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 20, backgroundColor: '#f2f2f2' },
	title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
	infoBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
	label: { fontWeight: 'bold', color: '#333', marginTop: 10 },
	value: { color: '#555', fontSize: 16, marginTop: 2 },
	privacidad: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 20 },
	loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
});
