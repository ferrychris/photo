// Webhook Proxy Service for Stripe -> Supabase
// Deploy this to Vercel, Netlify, or any Node.js hosting service

const express = require('express');
const axios = require('axios');
const app = express();

// Middleware
app.use(express.raw({ type: 'application/json' }));
app.use(express.json());

// Configuration
const SUPABASE_WEBHOOK_URL = 'https://xqgtuvzlrvbwwesuvitp.supabase.co/functions/v1/stripe-webhook-final';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZ3R1dnpscnZid3dlc3V2aXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NjAxMjksImV4cCI6MjA2NjQzNjEyOX0.VFyhaVnD93HJ-xG-hxIITM4koUT8sLkgmei5Os3l1sc';

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Stripe Webhook Proxy for PhotoSphere',
    timestamp: new Date().toISOString()
  });
});

// Webhook proxy endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Received webhook from Stripe');
    
    // Get the raw body and headers
    const body = req.body;
    const stripeSignature = req.headers['stripe-signature'];
    
    if (!stripeSignature) {
      console.log('❌ No Stripe signature found');
      return res.status(400).send('No Stripe signature');
    }
    
    console.log('🔄 Forwarding to Supabase Edge Function...');
    
    // Forward the request to Supabase with proper auth
    const response = await axios.post(SUPABASE_WEBHOOK_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': stripeSignature,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Successfully forwarded to Supabase:', response.status);
    
    // Return the response from Supabase
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('❌ Error forwarding webhook:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Webhook proxy error', 
        message: error.message 
      });
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Webhook proxy server running on port ${PORT}`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔗 Configure this URL in Stripe Dashboard`);
});

module.exports = app;
