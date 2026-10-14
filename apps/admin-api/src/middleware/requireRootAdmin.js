import pool from '../db/pool.js';
export default async function requireRootAdmin(req, res, next) {
  if (!req.session?.admin) return res.status(401).json({message:'Not authenticated'});
  try {
    const {rows} = await pool.query('SELECT role, is_active FROM admin_users WHERE id = $1',[req.session.admin.id]);
    if (!rows[0]?.is_active || rows[0].role !== 'root_admin') return res.status(403).json({message:'Root admin access required'});
    next();
  } catch {
    return res.status(503).json({message:'Unable to verify administrator access'});
  }
}
