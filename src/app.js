import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// Validate and configure CORS
const configureCors = () => {
    const origin = process.env.ORIGIN;
    
    if (!origin) {
        console.warn('⚠️  Warning: ORIGIN environment variable is not set. Allowing all origins with credentials.');
        return true; // Allow all origins dynamically
    }
    
    if (origin.trim() === '') {
        console.warn('⚠️  Warning: ORIGIN environment variable is empty. Allowing all origins with credentials.');
        return true;
    }
    
    if (origin === '*') {
        // When credentials are needed, we can't use '*', so we use a function to allow all origins
        return true;
    }
    
    // Split comma-separated origins and trim whitespace
    return origin.split(',').map(o => o.trim()).filter(o => o.length > 0);
}

app.use(cors({
    origin: configureCors(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}))

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'OM Dayal CRM Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            api: '/api/v1'
        }
    })
})

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    })
})

import adminRouter from './routes/admin.routes.js'
import employeeRouter from './routes/employee.routes.js'
import leadRouter from './routes/lead.routes.js'
import teacherRouter from './routes/teacher.routes.js'
import reportRouter from './routes/report.routes.js'
import paymentRouter from './routes/payment.routes.js'


app.use('/api/v1/admin', adminRouter)
app.use('/api/v1/employee', employeeRouter)
app.use('/api/v1/lead', leadRouter)
app.use('/api/v1/teacher', teacherRouter)
app.use('/api/v1/report', reportRouter)
app.use('/api/v1/payment', paymentRouter)

export { app }