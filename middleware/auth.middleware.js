// Example: assume you have user session or JWT
module.exports = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
