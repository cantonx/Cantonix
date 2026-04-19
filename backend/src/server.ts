import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/app.config';
import validatorRoutes from './routes/validators';
import networkRoutes   from './routes/network';
import swapRoutes      from './routes/swap';
import ledgerRoutes    from './routes/ledger';
import authRoutes      from './routes/auth';
import meRoutes        from './routes/me';

const app = express();

// Allow requests from Vercel frontend and localhost dev
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((pattern) =>
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);       // signup / login / token
app.use('/api/me',         meRoutes);         // GET /api/me  [auth]
app.use('/api/validators', validatorRoutes);  // status / onboard  [auth]
app.use('/api/network',    networkRoutes);    // status  [auth]
app.use('/api/swap',       swapRoutes);       // execute  [auth]
app.use('/api/ledger',     ledgerRoutes);     // Canton JSON Ledger API proxy

// ─── Root ─────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name:     'Cantonix Validator Hub API',
    version:  '3.0.0',
    provider: config.providerMode,
    authMode: config.authMode,
    network:  config.networkName,
    endpoints: {
      public: [
        'POST /api/auth/signup',
        'POST /api/auth/login',
      ],
      protected: [
        'GET  /api/me',
        'GET  /api/validators/status',
        'POST /api/validators/onboard',
        'GET  /api/network/status',
        'POST /api/swap/execute',
        'GET|POST /api/ledger/:participant/v2/parties',
        'GET      /api/ledger/:participant/v2/users[/:userId]',
        'POST     /api/ledger/:participant/v2/packages',
        'POST     /api/ledger/:participant/v2/commands/submit-and-wait',
      ],
      canton: [
        'POST /api/auth/token  (oauth2 mode only)',
      ],
    },
  });
});

// Backwards-compat alias
app.get('/api/status', (_req, res) => res.redirect('/api/validators/status'));

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\nCantonix backend  v3.0.0`);
  console.log(`  Port:     ${config.port}`);
  console.log(`  Provider: ${config.providerMode}`);
  console.log(`  Auth:     ${config.authMode}`);
  console.log(`  Network:  ${config.networkName}`);
  console.log(`  Mode:     ${config.nodeEnv}\n`);
});
