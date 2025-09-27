const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
 // console.log('Authorization header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  //console.log('Token:', token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   // console.log('Decoded token:', decoded);
    req.user = decoded; 
    next();
  } catch (error) {
   // console.error('Token inválido:', error);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;
