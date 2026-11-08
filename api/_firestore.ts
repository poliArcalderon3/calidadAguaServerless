/**
 * Conexión compartida a Cloud Firestore para las Vercel Functions.
 * (Los archivos de /api que empiezan con "_" no se publican como funciones).
 *
 * En Vercel la credencial llega en la variable de entorno FIREBASE_SERVICE_ACCOUNT
 * (el contenido del JSON de la cuenta de servicio). En local se usa el emulador.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelResponse } from '@vercel/node';

function iniciar() {
  if (getApps().length) return;
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-agua' });
    return;
  }
  const cuenta = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!cuenta) throw new Error('Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT');
  initializeApp({ credential: cert(JSON.parse(cuenta)) });
}

iniciar();
export const db = getFirestore();
export const muestras = db.collection('muestras');

/** Respuesta de error uniforme para todas las funciones */
export function fallo(res: VercelResponse, e: unknown) {
  console.error(e);
  res.status(500).json({ error: 'Error consultando Firestore' });
}
