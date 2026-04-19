import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config/app.config';
import validatorRoutes    from './routes/validators';
import networkRoutes      from './routes/network';
import swapRoutes         from './routes/swap';
import ledgerRoutes       from './routes/ledger';
import authRoutes         from './routes/auth';
import meRoutes           from './routes/me';
import onboardingRoutes   from './routes/onboarding';
import participantRoutes  from './routes/participant';
import invitationRoutes   from './routes/invitations';

const app = express();

// Allow requests from Vercel frontend and localhost dev
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
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
app.use('/api/auth',        authRoutes);        // signup / login / token
app.use('/api/me',          meRoutes);          // GET /api/me  [auth]
app.use('/api/onboarding',  onboardingRoutes);  // ADMIN/OPERATOR: approve/reject/pending | USER: status
app.use('/api/invitations', invitationRoutes);  // ADMIN/OPERATOR: create/list/revoke codes
app.use('/api/participant',  participantRoutes); // Participant Node status [auth]
app.use('/api/validators',  validatorRoutes);   // status / onboard  [auth]
app.use('/api/network',     networkRoutes);     // status  [auth]
app.use('/api/swap',        swapRoutes);        // execute  [auth]
app.use('/api/ledger',      ledgerRoutes);      // Canton JSON Ledger API proxy

// ─── Root ─────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name:     'Cantonix Validator Hub API',
    version:  '5.0.0',
    provider: config.providerMode,
    authMode: config.authMode,
    network:  config.networkName,
    endpoints: {
      public: [
        'POST /api/auth/signup  (invitationCode required — issued by ADMIN/OPERATOR)',
        'POST /api/auth/login',
      ],
      invitations: [
        'POST /api/invitations/create  [ADMIN/OPERATOR] create invitation code',
        'GET  /api/invitations         [ADMIN] list all codes',
        'POST /api/invitations/revoke  [ADMIN/OPERATOR] revoke a code',
      ],
      onboarding: [
        'POST /api/onboarding/approve  [ADMIN/OPERATOR] approve → Canton Party created',
        'POST /api/onboarding/reject   [ADMIN/OPERATOR] reject request',
        'GET  /api/onboarding/pending  [ADMIN/OPERATOR] list pending requests',
        'GET  /api/onboarding/status   [auth] user checks own status',
      ],
      participant: [
        'GET  /api/participant/status  [auth] Participant Node + Ledger API health',
      ],
      protected: [
        'GET  /api/me',
        'GET  /api/validators/status',
        'GET  /api/network/status',
        'POST /api/swap/execute',
      ],
    },
  });
});

app.get('/api/status', (_req, res) => res.redirect('/api/validators/status'));

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`\nCantonix backend  v5.0.0`);
  console.log(`  Port:     ${config.port}`);
  console.log(`  Provider: ${config.providerMode}`);
  console.log(`  Auth:     ${config.authMode}`);
  console.log(`  Network:  ${config.networkName}\n`);
});
