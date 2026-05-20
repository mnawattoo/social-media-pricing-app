const url = require('url');
const fs = require('fs');
const path = require('path');
const { initializeApp, credential } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const DEFAULTS_DIR = path.join(__dirname, '..', 'data_defaults');
const LOCAL_DATA_DIR = path.join('/tmp', 'data'); // Ephemeral read/write folder for Vercel fallback

// Ensure local /tmp/data directory exists for fallback mode
if (!fs.existsSync(LOCAL_DATA_DIR)) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
}

// Check if Firebase is active
const isFirebaseActive = !!process.env.FIREBASE_SERVICE_ACCOUNT;
let firestoreDb = null;

if (isFirebaseActive) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: credential.cert(serviceAccount)
    });
    firestoreDb = getFirestore();
    console.log("🔥 Firestore database successfully connected.");
  } catch (err) {
    // If already initialized (common in hot-reloads)
    try {
      firestoreDb = getFirestore();
    } catch (e) {
      console.error("❌ Failed to initialize Firebase Admin SDK:", err.message);
    }
  }
} else {
  console.log("⚠️ FIREBASE_SERVICE_ACCOUNT env var not found. Operating in local JSON mode (data will be ephemeral).");
}

// Helper to read defaults file
function readDefaultFile(filename) {
  const filepath = path.join(DEFAULTS_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error reading default file ${filename}:`, e);
    return null;
  }
}

// Helper to read collection
async function readCollection(collectionName) {
  if (isFirebaseActive && firestoreDb) {
    try {
      const snapshot = await firestoreDb.collection(collectionName).get();
      if (snapshot.empty) {
        // If empty, auto-populate from default files
        const defaults = readDefaultFile(`${collectionName}.json`);
        if (defaults && defaults.length > 0) {
          console.log(`🌱 Auto-populating Firestore collection '${collectionName}' from defaults...`);
          for (const doc of defaults) {
            const docId = doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await firestoreDb.collection(collectionName).doc(docId).set(doc);
          }
          return defaults;
        }
        return [];
      }
      const data = [];
      snapshot.forEach(doc => {
        data.push(doc.data());
      });
      return data;
    } catch (err) {
      console.error(`Error reading Firestore collection '${collectionName}':`, err);
      // Fallback to defaults
      return readDefaultFile(`${collectionName}.json`) || [];
    }
  } else {
    // Fallback JSON mode
    const filepath = path.join(LOCAL_DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(filepath)) {
      const defaults = readDefaultFile(`${collectionName}.json`);
      if (defaults) {
        fs.writeFileSync(filepath, JSON.stringify(defaults, null, 2));
        return defaults;
      }
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
}

// Helper to save a single document (add or update)
async function saveDocument(collectionName, docId, docData) {
  if (isFirebaseActive && firestoreDb) {
    try {
      await firestoreDb.collection(collectionName).doc(docId).set(docData);
      return true;
    } catch (err) {
      console.error(`Error saving Firestore document '${collectionName}/${docId}':`, err);
      return false;
    }
  } else {
    // Fallback JSON mode
    try {
      let collection = await readCollection(collectionName);
      const idx = collection.findIndex(item => item.id === docId);
      if (idx !== -1) {
        collection[idx] = docData;
      } else {
        collection.push(docData);
      }
      const filepath = path.join(LOCAL_DATA_DIR, `${collectionName}.json`);
      fs.writeFileSync(filepath, JSON.stringify(collection, null, 2));
      return true;
    } catch (e) {
      console.error(`Error saving JSON document '${collectionName}/${docId}':`, e);
      return false;
    }
  }
}

// Helper to delete a single document
async function deleteDocument(collectionName, docId) {
  if (isFirebaseActive && firestoreDb) {
    try {
      await firestoreDb.collection(collectionName).doc(docId).delete();
      return true;
    } catch (err) {
      console.error(`Error deleting Firestore document '${collectionName}/${docId}':`, err);
      return false;
    }
  } else {
    // Fallback JSON mode
    try {
      let collection = await readCollection(collectionName);
      const filtered = collection.filter(item => item.id !== docId);
      const filepath = path.join(LOCAL_DATA_DIR, `${collectionName}.json`);
      fs.writeFileSync(filepath, JSON.stringify(filtered, null, 2));
      return true;
    } catch (e) {
      console.error(`Error deleting JSON document '${collectionName}/${docId}':`, e);
      return false;
    }
  }
}


// Helper to read global settings document
async function readSettings() {
  if (isFirebaseActive && firestoreDb) {
    try {
      const doc = await firestoreDb.collection('settings').doc('global').get();
      if (doc.exists) {
        return doc.data();
      } else {
        // Seed default settings
        const defaults = readDefaultFile('settings.json') || {};
        await firestoreDb.collection('settings').doc('global').set(defaults);
        return defaults;
      }
    } catch (err) {
      console.error("Error reading Firestore settings:", err);
      return readDefaultFile('settings.json') || {};
    }
  } else {
    const filepath = path.join(LOCAL_DATA_DIR, 'settings.json');
    if (!fs.existsSync(filepath)) {
      const defaults = readDefaultFile('settings.json') || {};
      fs.writeFileSync(filepath, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    try {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
}

// Helper to write global settings document
async function writeSettings(settingsData) {
  if (isFirebaseActive && firestoreDb) {
    try {
      await firestoreDb.collection('settings').doc('global').set(settingsData);
      return true;
    } catch (err) {
      console.error("Error writing Firestore settings:", err);
      return false;
    }
  } else {
    const filepath = path.join(LOCAL_DATA_DIR, 'settings.json');
    try {
      fs.writeFileSync(filepath, JSON.stringify(settingsData, null, 2));
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Helper to check authorized state
function isAuthorized(req) {
  const token = req.headers['x-admin-token'] || (req.cookies && req.cookies['admin_token']);
  return token === 'admin-session-active';
}

// Helper to set CORS headers
function setCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Token, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// Main Vercel serverless request handler
module.exports = async (req, res) => {
  if (setCorsHeaders(req, res)) return;

  const parsedUrl = url.parse(req.url, true);
  const pathName = parsedUrl.pathname;
  const method = req.method;

  try {
    // 1. Plans Endpoint
    if (pathName === '/api/plans') {
      if (method === 'GET') {
        let plans = await readCollection('plans');
        if (!isAuthorized(req)) {
          plans = plans.filter(p => p.active);
        }
        return res.status(200).json(plans);
      }
      
      if (method === 'POST') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const body = req.body;
        if (!body || !body.name) return res.status(400).json({ error: 'Invalid payload', success: false });
        
        let plans = await readCollection('plans');
        let id = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!id.trim() || plans.some(p => p.id === id)) {
          id = `plan-${Date.now()}`;
        }
        
        const newPlan = {
          id,
          name: body.name,
          description: body.description || '',
          basePrice: parseInt(body.basePrice, 10) || 0,
          featured: !!body.featured,
          includedServices: body.includedServices || [],
          monthlyOutputs: body.monthlyOutputs || [],
          platformsIncluded: parseInt(body.platformsIncluded, 10) || 0,
          vaHours: parseInt(body.vaHours, 10) || 0,
          ctaText: body.ctaText || 'Get Started',
          active: body.active !== false
        };
        
        if (newPlan.featured) {
          for (const p of plans) {
            if (p.featured) {
              p.featured = false;
              await saveDocument('plans', p.id, p);
            }
          }
        }
        
        await saveDocument('plans', newPlan.id, newPlan);
        return res.status(201).json({ success: true, plan: newPlan });
      }
      
      if (method === 'PUT') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const body = req.body;
        if (!body || !body.id) return res.status(400).json({ error: 'Invalid payload', success: false });
        
        let plans = await readCollection('plans');
        const idx = plans.findIndex(p => p.id === body.id);
        if (idx === -1) return res.status(404).json({ error: 'Plan not found', success: false });
        
        if (body.featured) {
          for (const p of plans) {
            if (p.id !== body.id && p.featured) {
              p.featured = false;
              await saveDocument('plans', p.id, p);
            }
          }
        }
        
        const updatedPlan = {
          ...plans[idx],
          name: body.name || plans[idx].name,
          description: body.description || plans[idx].description,
          basePrice: body.basePrice !== undefined ? parseInt(body.basePrice, 10) : plans[idx].basePrice,
          featured: body.featured !== undefined ? !!body.featured : plans[idx].featured,
          includedServices: body.includedServices || plans[idx].includedServices,
          monthlyOutputs: body.monthlyOutputs || plans[idx].monthlyOutputs,
          platformsIncluded: body.platformsIncluded !== undefined ? parseInt(body.platformsIncluded, 10) : plans[idx].platformsIncluded,
          vaHours: body.vaHours !== undefined ? parseInt(body.vaHours, 10) : plans[idx].vaHours,
          ctaText: body.ctaText || plans[idx].ctaText,
          active: body.active !== undefined ? body.active !== false : plans[idx].active
        };
        
        await saveDocument('plans', updatedPlan.id, updatedPlan);
        return res.status(200).json({ success: true, plan: updatedPlan });
      }
      
      if (method === 'DELETE') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id parameter', success: false });
        
        let plans = await readCollection('plans');
        const idx = plans.findIndex(p => p.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Plan not found', success: false });
        
        await deleteDocument('plans', id);
        return res.status(200).json({ success: true, message: 'Plan deleted successfully' });
      }
    }

    // 2. Add-ons Endpoint
    if (pathName === '/api/addons') {
      if (method === 'GET') {
        let addons = await readCollection('addons');
        if (!isAuthorized(req)) {
          addons = addons.filter(a => a.active);
        }
        return res.status(200).json(addons);
      }
      
      if (method === 'POST') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const body = req.body;
        if (!body || !body.name) return res.status(400).json({ error: 'Invalid payload', success: false });
        
        let addons = await readCollection('addons');
        let id = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!id.trim() || addons.some(a => a.id === id)) {
          id = `addon-${Date.now()}`;
        }
        
        const newAddon = {
          id,
          name: body.name,
          description: body.description || '',
          price: parseInt(body.price, 10) || 0,
          pricingType: body.pricingType || 'per_item',
          active: body.active !== false
        };
        
        await saveDocument('addons', newAddon.id, newAddon);
        return res.status(201).json({ success: true, addon: newAddon });
      }
      
      if (method === 'PUT') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const body = req.body;
        if (!body || !body.id) return res.status(400).json({ error: 'Invalid payload', success: false });
        
        let addons = await readCollection('addons');
        const idx = addons.findIndex(a => a.id === body.id);
        if (idx === -1) return res.status(404).json({ error: 'Add-on not found', success: false });
        
        const updatedAddon = {
          ...addons[idx],
          name: body.name || addons[idx].name,
          description: body.description || addons[idx].description,
          price: body.price !== undefined ? parseInt(body.price, 10) : addons[idx].price,
          pricingType: body.pricingType || addons[idx].pricingType,
          active: body.active !== undefined ? body.active !== false : addons[idx].active
        };
        
        await saveDocument('addons', updatedAddon.id, updatedAddon);
        return res.status(200).json({ success: true, addon: updatedAddon });
      }
      
      if (method === 'DELETE') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: 'Missing id parameter', success: false });
        
        let addons = await readCollection('addons');
        const idx = addons.findIndex(a => a.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Add-on not found', success: false });
        
        await deleteDocument('addons', id);
        return res.status(200).json({ success: true, message: 'Add-on deleted successfully' });
      }
    }

    // 2.5 Force Reseed Endpoint
    if (pathName === '/api/admin/force-reseed') {
      if (method === 'POST') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        
        console.log("🔄 Force-reseeding Firestore database collections...");
        
        // 1. Delete and Re-seed Plans
        if (isFirebaseActive && firestoreDb) {
          // Delete existing plans in Firestore
          const plansSnap = await firestoreDb.collection('plans').get();
          const plansBatch = firestoreDb.batch();
          plansSnap.forEach(doc => plansBatch.delete(doc.ref));
          await plansBatch.commit();
          
          // Seed new plans
          const plansDefaults = readDefaultFile('plans.json') || [];
          for (const plan of plansDefaults) {
            await firestoreDb.collection('plans').doc(plan.id).set(plan);
          }
          
          // Delete existing addons in Firestore
          const addonsSnap = await firestoreDb.collection('addons').get();
          const addonsBatch = firestoreDb.batch();
          addonsSnap.forEach(doc => addonsBatch.delete(doc.ref));
          await addonsBatch.commit();
          
          // Seed new addons
          const addonsDefaults = readDefaultFile('addons.json') || [];
          for (const addon of addonsDefaults) {
            await firestoreDb.collection('addons').doc(addon.id).set(addon);
          }
          
          // Reset settings
          const settingsDefaults = readDefaultFile('settings.json') || {};
          await firestoreDb.collection('settings').doc('global').set(settingsDefaults);
          
          console.log("✅ Firestore database successfully force-reseeded.");
        } else {
          // Fallback local JSON mode reseed
          const plansDefaults = readDefaultFile('plans.json') || [];
          fs.writeFileSync(path.join(LOCAL_DATA_DIR, 'plans.json'), JSON.stringify(plansDefaults, null, 2));
          
          const addonsDefaults = readDefaultFile('addons.json') || [];
          fs.writeFileSync(path.join(LOCAL_DATA_DIR, 'addons.json'), JSON.stringify(addonsDefaults, null, 2));
          
          const settingsDefaults = readDefaultFile('settings.json') || {};
          fs.writeFileSync(path.join(LOCAL_DATA_DIR, 'settings.json'), JSON.stringify(settingsDefaults, null, 2));
          
          console.log("✅ Local fallback files successfully force-reseeded.");
        }
        
        return res.status(200).json({ success: true, message: 'Database successfully reseeded to new weekly plans and add-ons!' });
      }
    }

    // 3. Settings Endpoint
    if (pathName === '/api/settings') {
      if (method === 'GET') {
        let settings = await readSettings();
        if (!isAuthorized(req)) {
          settings = { ...settings };
          delete settings.adminPassword;
        }
        return res.status(200).json(settings);
      }
      
      if (method === 'POST') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        const body = req.body;
        if (!body) return res.status(400).json({ error: 'Invalid payload', success: false });
        
        let settings = await readSettings();
        ['agencyName', 'contactEmail', 'contactPhone', 'currency', 'activePlanFeaturedLabel'].forEach(field => {
          if (body[field] !== undefined) {
            settings[field] = body[field];
          }
        });
        
        if (body.newPassword && body.newPassword.toString().trim() !== '') {
          settings.adminPassword = body.newPassword.toString();
        }
        
        await writeSettings(settings);
        const responseData = { ...settings };
        delete responseData.adminPassword;
        return res.status(200).json({ success: true, settings: responseData });
      }
    }

    // 4. Leads Endpoint
    if (pathName === '/api/leads') {
      if (method === 'GET') {
        if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized', success: false });
        let leads = await readCollection('leads');
        leads.sort((a, b) => new Date(b.createdAt || '') - new Date(a.createdAt || ''));
        return res.status(200).json(leads);
      }
      
      if (method === 'POST') {
        const body = req.body;
        if (!body || !body.name || !body.email) {
          return res.status(400).json({ error: 'Name and Email are required', success: false });
        }
        
        const newLead = {
          id: `lead-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          name: body.name,
          email: body.email,
          phone: body.phone || '',
          businessName: body.businessName || '',
          selectedPlan: body.selectedPlan,
          selectedAddOns: body.selectedAddOns || [],
          finalPrice: parseInt(body.finalPrice, 10) || 0,
          message: body.message || '',
          createdAt: new Date().toISOString()
        };
        
        await saveDocument('leads', newLead.id, newLead);
        return res.status(201).json({ success: true, lead: newLead });
      }
    }

    // 5. Auth Logins & Logout
    if (pathName === '/api/auth/login') {
      if (method === 'POST') {
        const body = req.body;
        const settings = await readSettings();
        if (body && body.password === settings.adminPassword) {
          res.setHeader('Set-Cookie', 'admin_token=admin-session-active; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax');
          return res.status(200).json({ token: 'admin-session-active', success: true, message: 'Logged in successfully' });
        } else {
          return res.status(401).json({ error: 'Invalid password', success: false });
        }
      }
    }

    if (pathName === '/api/auth/logout') {
      if (method === 'POST') {
        res.setHeader('Set-Cookie', 'admin_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
      }
    }

    if (pathName === '/api/auth/session') {
      if (method === 'GET') {
        if (isAuthorized(req)) {
          return res.status(200).json({ authenticated: true });
        } else {
          return res.status(200).json({ authenticated: false });
        }
      }
    }

    // Default 404
    return res.status(404).json({ error: 'Endpoint Not Found', success: false });

  } catch (err) {
    console.error("API Server Error:", err);
    return res.status(500).json({ error: err.message, success: false });
  }
};
