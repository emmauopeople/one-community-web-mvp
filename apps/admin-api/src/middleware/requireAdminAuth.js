export default function requireAdminAuth(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  next();
}
