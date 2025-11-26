// ========================================
// ROBLOX BAN API PROXY - Pour Glitch
// Ce serveur fait le lien entre Roblox et l'API Open Cloud
// ========================================

const express = require('express');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.json());

// ========================================
// CONFIGURATION
// ========================================
const API_KEY = process.env.ROBLOX_API_KEY; // Stocké dans les secrets Glitch
const API_BASE = 'https://apis.roblox.com/cloud/v2';

// Clé secrète pour sécuriser les requêtes (partage avec Roblox uniquement)
const SECRET_KEY = process.env.SECRET_KEY || 'change-this-secret-key-123';

// ========================================
// MIDDLEWARE DE SÉCURITÉ
// ========================================
function verifySecretKey(req, res, next) {
  const providedKey = req.headers['x-secret-key'];
  
  if (!providedKey || providedKey !== SECRET_KEY) {
    console.log('❌ Unauthorized request - Invalid secret key');
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized' 
    });
  }
  
  next();
}

// ========================================
// ROUTES
// ========================================

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: '🎮 Roblox Ban API Proxy is running!',
    endpoints: [
      'POST /ban - Ban a player',
      'POST /unban - Unban a player',
      'POST /shutdown - Restart all servers'
    ]
  });
});

// ========================================
// BAN PLAYER
// ========================================
app.post('/ban', verifySecretKey, async (req, res) => {
  const { universeId, userId, reason, duration } = req.body;
  
  console.log('🔨 Ban request received:', { universeId, userId, reason });
  
  if (!universeId || !userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing universeId or userId' 
    });
  }
  
  try {
    const response = await axios.patch(
      `${API_BASE}/universes/${universeId}/user-restrictions`,
      {
        user: `users/${userId}`,
        gameJoinRestriction: {
          active: true,
          duration: duration || 0,
          privateReason: reason || 'Banned by admin',
          displayReason: reason || 'You have been banned from this experience'
        }
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Player banned successfully:', userId);
    res.json({ 
      success: true, 
      message: 'Player banned successfully',
      data: response.data 
    });
    
  } catch (error) {
    console.error('❌ Ban error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ========================================
// UNBAN PLAYER
// ========================================
app.post('/unban', verifySecretKey, async (req, res) => {
  const { universeId, userId } = req.body;
  
  console.log('🔓 Unban request received:', { universeId, userId });
  
  if (!universeId || !userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing universeId or userId' 
    });
  }
  
  try {
    // D'abord, récupérer la restriction
    const listResponse = await axios.get(
      `${API_BASE}/universes/${universeId}/user-restrictions?filter=user=='users/${userId}'`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );
    
    if (!listResponse.data.userRestrictions || listResponse.data.userRestrictions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Player not banned' 
      });
    }
    
    // Extraire l'ID de la restriction
    const restrictionPath = listResponse.data.userRestrictions[0].path;
    const restrictionId = restrictionPath.split('/').pop();
    
    // Désactiver le ban
    const unbanResponse = await axios.patch(
      `${API_BASE}/universes/${universeId}/user-restrictions/${restrictionId}`,
      {
        gameJoinRestriction: {
          active: false
        }
      },
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Player unbanned successfully:', userId);
    res.json({ 
      success: true, 
      message: 'Player unbanned successfully',
      data: unbanResponse.data 
    });
    
  } catch (error) {
    console.error('❌ Unban error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ========================================
// SHUTDOWN SERVERS
// ========================================
app.post('/shutdown', verifySecretKey, async (req, res) => {
  const { universeId } = req.body;
  
  console.log('🔄 Shutdown request received:', { universeId });
  
  if (!universeId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing universeId' 
    });
  }
  
  try {
    const response = await axios.post(
      `${API_BASE}/universes/${universeId}:restartServers`,
      {},
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Server restart initiated');
    res.json({ 
      success: true, 
      message: 'Server restart initiated',
      data: response.data 
    });
    
  } catch (error) {
    console.error('❌ Shutdown error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

// ========================================
// ERROR HANDLER
// ========================================
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Roblox Ban API Proxy is running on port', PORT);
  console.log('🔑 API Key configured:', API_KEY ? 'Yes ✅' : 'No ❌');
  console.log('🔐 Secret Key configured:', SECRET_KEY ? 'Yes ✅' : 'No ❌');
});
