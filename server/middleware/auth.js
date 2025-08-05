const { supabase } = require('../config/supabase');

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      clientId: profile.client_id
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const requireClientAccess = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Managers and editors can access all clients
    if (req.user.role === 'manager' || req.user.role === 'editor') {
      return next();
    }

    // Clients can only access their own data
    if (req.user.role === 'client' && req.user.clientId === clientId) {
      return next();
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    console.error('Client access check error:', error);
    res.status(500).json({ error: 'Access check failed' });
  }
};

module.exports = {
  authenticateUser,
  requireRole,
  requireClientAccess
}; 