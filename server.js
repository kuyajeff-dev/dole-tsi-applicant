require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const { Server } = require('socket.io');

const socketHandler = require('./socketHandler');

const app = express();
const server = http.createServer(app);

/* ---------------------------------------------------
   TRUST PROXY (required for HTTPS, Nginx, PM2)
--------------------------------------------------- */
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

/* ---------------------------------------------------
   SOCKET.IO
--------------------------------------------------- */
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});
socketHandler(io);

/* ---------------------------------------------------
   UPLOADS DIRECTORY (VPS SAFE)
--------------------------------------------------- */
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/* ---------------------------------------------------
   GLOBAL MIDDLEWARE
--------------------------------------------------- */
app.use(express.json({ limit: `${process.env.MAX_UPLOAD_MB}mb` }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
/* ---------------------------------------------------
   SESSION STORE (MYSQL)
--------------------------------------------------- */
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 mins
    expiration: 86400000 // 1 day
});

app.use(session({
    name: 'tsi_app_sid',
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));


// Prevent browser caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

/* ---------------------------------------------------
   RATE LIMITING (SECURITY)
--------------------------------------------------- */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max requests per IP
    standardHeaders: true,
    legacyHeaders: false
});

/* ---------------------------------------------------
   STATIC FILES
--------------------------------------------------- */
app.use('/uploads', express.static(uploadDir));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.use('/tsi-applicant', express.static(path.join(__dirname, 'tsi-applicant')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));

/* ---------------------------------------------------
   ROOT REDIRECT
--------------------------------------------------- */
app.get('/', (req, res) => res.redirect('/tsi-applicant/'));

/* ---------------------------------------------------
   AUTH MIDDLEWARE
--------------------------------------------------- */
function requireUserLogin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.redirect('/tsi-applicant/login');
    }
    next();
}

function requireAdminLogin(req, res, next) {
    if (!req.session.admin || req.session.admin.role !== 'admin') {
        return res.redirect('/admin/');
    }
    next();
}

/* ---------------------------------------------------
   API ROUTES
--------------------------------------------------- */
app.use('/api/register', authLimiter, require('./routes/registerRoutes'));
app.use('/api/login', authLimiter, require('./routes/loginRoutes'));
app.use('/api/me', require('./routes/loginRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/admin', require('./routes/adminAuthRoutes'));
app.use('/', require('./routes/checklistRoutes'));
app.use('/api/user', require('./routes/userSessionRoutes'));
app.use('/api/users', require('./routes/fetchRoutes'));
app.use('/api/dashboard', require('./routes/adminDashboardRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api', require('./routes/chartRoutes'));

/* ---------------------------------------------------
   USER PAGES
--------------------------------------------------- */
app.get('/tsi-applicant/', (req, res) =>
    res.sendFile(path.join(__dirname, 'tsi-applicant/index.html'))
);

app.get('/tsi-applicant/login', (req, res) =>
    res.sendFile(path.join(__dirname, 'tsi-applicant/login.html'))
);

app.get('/tsi-applicant/register', (req, res) =>
    res.sendFile(path.join(__dirname, 'tsi-applicant/register.html'))
);

app.get('/tsi-applicant/logout', (req, res) => {
    delete req.session.user;
    res.redirect('/tsi-applicant/');
});

const userValidPages = ['index', 'form', 'contact'];
app.get('/tsi-applicant/pages/:page', requireUserLogin, (req, res) => {
    const page = req.params.page;
    if (!userValidPages.includes(page)) {
        return res.status(404).sendFile(
            path.join(__dirname, 'tsi-applicant/offline.html')
        );
    }
    res.sendFile(path.join(__dirname, `tsi-applicant/pages/${page}.html`));
});

/* ---------------------------------------------------
   ADMIN PAGES
--------------------------------------------------- */
app.get('/admin/', (req, res) =>
    res.sendFile(path.join(__dirname, 'admin/index.html'))
);

app.get('/admin/register', (req, res) =>
    res.sendFile(path.join(__dirname, 'admin/register.html'))
);

app.get('/admin/logout', (req, res) => {
    delete req.session.admin;
    res.redirect('/admin/');
});

const adminValidPages = [
    'index',
    'userManagement',
    'listApplicant',
    'listApprove',
    'monthlyRecords',
    'viewPlan',
    'chat'
];

app.get('/admin/pages/:page', requireAdminLogin, (req, res) => {
    const page = req.params.page;
    if (!adminValidPages.includes(page)) {
        return res.status(404).send('Page not found');
    }
    res.sendFile(path.join(__dirname, `admin/pages/${page}.html`));
});

/* ---------------------------------------------------
   GLOBAL ERROR HANDLER
--------------------------------------------------- */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message:
            process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message
    });
});

/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`User app: http://localhost:${PORT}/tsi-applicant/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/`);
});
