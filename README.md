# Calidad del agua · aplicación serverless

Actividad sumativa – Unidad 4, *Contenerización de Aplicaciones de Software* (Politécnico Grancolombiano).

Aplicación web para consultar **3.276 muestras de agua** del dataset de Kaggle
[Water Quality](https://www.kaggle.com/datasets/adityakadiwal/water-potability) (`water_potability.csv`),
almacenadas en **Google Cloud Firestore** y servidas por **funciones serverless**, sin administrar ningún servidor.
Todo funciona con planes **gratuitos y sin tarjeta**: Firebase **Spark** y Vercel **Hobby**.

## Arquitectura (patrón de microservicios serverless)

```
Navegador ──► Vercel (CDN) ── aplicación Angular
                 │  /api/...
                 ▼
          Vercel Functions (Node.js 22, se ejecutan bajo demanda en AWS Lambda)
            api/muestras/index.ts · api/muestras/[id].ts
                 │  SDK firebase-admin (cuenta de servicio)
                 ▼
          Google Cloud Firestore ── colección "muestras" (3.276 documentos)

Script de carga (carga/cargar-datos.ts) ──► Google Cloud Firestore   (se ejecuta una vez)
```

| Componente | Servicio | Por qué |
|---|---|---|
| Base de datos | **Google Cloud Firestore** (plan Spark) | NoSQL totalmente serverless: no hay instancias que encender ni dimensionar, escala sola y su capa gratuita (50.000 lecturas y 20.000 escrituras al día) alcanza para este dataset. |
| Lógica de acceso a datos | **Vercel Functions** (plan Hobby) | Cada endpoint es una función independiente que solo se ejecuta cuando llega una petición y escala automáticamente. Por dentro corre en contenedores efímeros de AWS Lambda. |
| Interfaz | **Angular 22** publicada en **Vercel** | Archivos estáticos servidos desde la CDN de Vercel, en el mismo dominio que las funciones. |
| Seguridad | `firestore.rules` | El navegador no puede leer la base directamente: solo las funciones, con la cuenta de servicio. |

## Estructura

```
datos/water_potability.csv     dataset original de Kaggle
carga/cargar-datos.ts          script de la base de datos (CSV → Firestore)
api/_firestore.ts              conexión compartida a Firestore
api/muestras/index.ts          función GET /api/muestras (búsqueda por sólidos y listado)
api/muestras/[id].ts           función GET /api/muestras/:id (búsqueda por ID)
web/                           aplicación Angular (TypeScript)
vercel.json                    compilación y publicación en Vercel
firestore.rules                reglas: acceso directo denegado
firestore.indexes.json         índice para filtrar por potabilidad y paginar
```

## Endpoints

| Petición | Resultado |
|---|---|
| `GET /api/muestras/M-0004` | Búsqueda por **ID principal** |
| `GET /api/muestras?solidos=22018.42` | Búsqueda por la columna secundaria **Solids** (sus 3.276 valores son únicos) |
| `GET /api/muestras?limite=10&desde=M-0010` | Listado paginado (opcional `&potable=1` o `0`) |

## Despliegue (gratis, sin tarjeta)

1. **Firebase** (https://console.firebase.google.com): crear el proyecto (plan Spark) y la base de datos **Cloud Firestore** en modo producción.
2. *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada* y guardarla como `carga/clave.key.json` (está en `.gitignore`).
3. Cargar el dataset:
   ```powershell
   npm --prefix carga install
   $env:GOOGLE_APPLICATION_CREDENTIALS = "carga\clave.key.json"
   npm --prefix carga run cargar -- ID_DEL_PROYECTO
   ```
4. Publicar las reglas de Firestore: `firebase login` y `firebase deploy --only firestore --project ID_DEL_PROYECTO`.
5. **Vercel** (https://vercel.com, entrar con GitHub): *Add New → Project* → importar este repositorio.
   En *Environment Variables* crear `FIREBASE_SERVICE_ACCOUNT` con **todo el contenido** de `clave.key.json` y pulsar *Deploy*.

## Ejecutar en local

Requisitos: Node.js 22+, Java 21+ y `npm install -g firebase-tools`.

```powershell
firebase emulators:start --only firestore --project demo-agua
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
npm --prefix carga run cargar -- demo-agua
```

Las funciones de `/api` se pueden ejecutar con la CLI de Vercel (`vercel dev`) usando las mismas variables de entorno.

## Dataset

*Water Quality* (Aditya Kadiwal, Kaggle). Nueve parámetros fisicoquímicos (pH, dureza, sólidos disueltos,
cloraminas, sulfatos, conductividad, carbono orgánico, trihalometanos y turbidez) y la etiqueta `Potability`
(1 = potable). El script conserva las columnas y los tipos originales; las celdas vacías se guardan como `null`
(491 en pH, 781 en sulfatos y 162 en trihalometanos). A cada fila se le asigna un ID `M-0001` … `M-3276`.
