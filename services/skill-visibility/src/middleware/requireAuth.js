export function requireAuth(req, res, next) {
  if (!req.session?.user)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role || !roles.includes(role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
