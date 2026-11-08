/**
 * GET /api/muestras?solidos=22018.42          → búsqueda por la columna secundaria Solids (no se repite)
 * GET /api/muestras?limite=10&desde=M-0010    → listado paginado (opcional: &potable=1 o 0)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldPath } from 'firebase-admin/firestore';
import { muestras, fallo } from '../_firestore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Búsqueda por sólidos disueltos, redondeados a 2 decimales
    if (req.query.solidos !== undefined) {
      const valor = Number(String(req.query.solidos).replace(',', '.'));
      if (Number.isNaN(valor)) {
        res.status(400).json({ error: 'El valor de sólidos debe ser numérico' });
        return;
      }
      const snap = await muestras.where('Solids', '>=', valor - 0.005).where('Solids', '<', valor + 0.005).limit(5).get();
      res.json({ resultados: snap.docs.map((d) => d.data()) });
      return;
    }

    // Listado paginado ordenado por ID, con filtro opcional de potabilidad
    const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 100);
    let consulta = muestras.orderBy(FieldPath.documentId()).limit(limite + 1);
    if (req.query.potable === '0' || req.query.potable === '1') {
      consulta = muestras.where('Potability', '==', Number(req.query.potable)).orderBy(FieldPath.documentId()).limit(limite + 1);
    }
    if (typeof req.query.desde === 'string' && req.query.desde) {
      consulta = consulta.startAfter(req.query.desde);
    }
    const snap = await consulta.get();
    const docs = snap.docs.slice(0, limite).map((d) => d.data());
    res.json({
      resultados: docs,
      siguiente: snap.docs.length > limite ? docs[docs.length - 1].id_muestra : null,
    });
  } catch (e) {
    fallo(res, e);
  }
}
