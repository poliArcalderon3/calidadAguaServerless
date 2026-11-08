/**
 * Script de carga de la base de datos (Cloud Firestore).
 *
 * Lee datos/water_potability.csv (Kaggle: "Water Quality" / water potability)
 * y crea la colección "muestras": un documento por fila (M-0001 ... M-3276) con las
 * 10 columnas originales y sus tipos (número, o null si la celda está vacía).
 *
 * Uso:
 *   Emulador local:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run cargar -- demo-agua
 *   Firestore real:  GOOGLE_APPLICATION_CREDENTIALS=clave.json npm run cargar -- <id-del-proyecto>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parse } from 'csv-parse/sync';

const COLUMNAS = [
  'ph', 'Hardness', 'Solids', 'Chloramines', 'Sulfate',
  'Conductivity', 'Organic_carbon', 'Trihalomethanes', 'Turbidity', 'Potability',
] as const;
type Columna = (typeof COLUMNAS)[number];
type Muestra = Record<Columna, number | null> & { id_muestra: string; fila: number };

const proyecto = process.argv[2] ?? process.env.GCLOUD_PROJECT;
if (!proyecto) {
  console.error('Indica el ID del proyecto: npm run cargar -- <id-del-proyecto>');
  process.exit(1);
}

const aqui = dirname(fileURLToPath(import.meta.url));
const csv = readFileSync(join(aqui, '..', 'datos', 'water_potability.csv'), 'utf8');
const filas: Record<string, string>[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true });

// Verifica que el CSV tenga exactamente la estructura esperada
const encabezado = Object.keys(filas[0] ?? {});
if (encabezado.join() !== COLUMNAS.join()) {
  console.error('El CSV no tiene las columnas esperadas:', encabezado);
  process.exit(1);
}

const muestras: Muestra[] = filas.map((f, i) => {
  const m = { id_muestra: `M-${String(i + 1).padStart(4, '0')}`, fila: i + 1 } as Muestra;
  for (const c of COLUMNAS) {
    const v = f[c];
    m[c] = v === '' || v === undefined ? null : Number(v);
    if (m[c] !== null && Number.isNaN(m[c])) throw new Error(`Valor no numérico en fila ${i + 1}, columna ${c}: ${v}`);
  }
  return m;
});

// ---------- Escritura en Firestore ----------
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: proyecto } : { projectId: proyecto, credential: applicationDefault() });
const db = getFirestore();
const destino = process.env.FIRESTORE_EMULATOR_HOST ? `emulador ${process.env.FIRESTORE_EMULATOR_HOST}` : `proyecto ${proyecto}`;
console.log(`Cargando ${muestras.length} muestras en Firestore (${destino})...`);

const escritor = db.bulkWriter();
let escritas = 0;
for (const m of muestras) {
  escritor.set(db.collection('muestras').doc(m.id_muestra), m).then(() => {
    escritas++;
    if (escritas % 500 === 0) console.log(`  ${escritas} muestras escritas`);
  });
}
await escritor.close();

// Verificación: cuenta los documentos en Firestore
const coleccion = db.collection('muestras');
const total = (await coleccion.count().get()).data().count;
const potables = (await coleccion.where('Potability', '==', 1).count().get()).data().count;
console.log(`Listo: ${escritas} muestras escritas; la colección "muestras" tiene ${total} documentos.`);
console.log(`Potables: ${potables} | No potables: ${total - potables}`);
