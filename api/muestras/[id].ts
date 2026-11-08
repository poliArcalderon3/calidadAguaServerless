/** GET /api/muestras/M-0004 → búsqueda por ID principal */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { muestras, fallo } from '../_firestore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? '').toUpperCase();
  try {
    const doc = await muestras.doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: `No existe la muestra ${id}` });
      return;
    }
    res.json(doc.data());
  } catch (e) {
    fallo(res, e);
  }
}
