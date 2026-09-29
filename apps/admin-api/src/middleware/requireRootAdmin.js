export default function requireRootAdmin(req, res, next) {
  if (!req.session || !req.session.admin) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  if (req.session.admin.role !== "root_admin") {
    return res.status(403).json({
      message: "Root admin access required",
    });
  }

  next();
}
