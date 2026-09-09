import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getTicketsByActivo(req: AuthenticatedRequest, res: Response) {
  try {
    const { activo_id } = req.params;
    const tickets = db.prepare(`
      SELECT * FROM tickets_relacionados WHERE activo_id = ? ORDER BY id DESC
    `).all(activo_id);
    return res.json(tickets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function createTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const { activo_id, ticket_codigo, titulo, estado = 'ABIERTO', prioridad = 'MEDIA' } = req.body;
    if (!activo_id || !ticket_codigo || !titulo) {
      return res.status(400).json({ error: 'activo_id, ticket_codigo y titulo son obligatorios' });
    }
    const result = db.prepare(`
      INSERT INTO tickets_relacionados (activo_id, ticket_codigo, titulo, estado, prioridad)
      VALUES (?, ?, ?, ?, ?)
    `).run(activo_id, ticket_codigo, titulo, estado, prioridad);
    return res.status(201).json({ id: result.lastInsertRowid, message: 'Ticket creado' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function updateTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { ticket_codigo, titulo, estado, prioridad } = req.body;
    db.prepare(`
      UPDATE tickets_relacionados SET
        ticket_codigo = COALESCE(?, ticket_codigo),
        titulo = COALESCE(?, titulo),
        estado = COALESCE(?, estado),
        prioridad = COALESCE(?, prioridad)
      WHERE id = ?
    `).run(ticket_codigo, titulo, estado, prioridad, id);
    return res.json({ message: 'Ticket actualizado' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tickets_relacionados WHERE id = ?').run(id);
    return res.json({ message: 'Ticket eliminado' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
