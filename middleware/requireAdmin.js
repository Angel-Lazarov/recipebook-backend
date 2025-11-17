//middleware/requireAdmin.js
/// Middleware за проверка на роля

export function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied!" });
    }
    next();
}