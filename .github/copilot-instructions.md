# OM Dayal CRM Server - AI Agent Instructions

## Architecture Overview
This is an **Express.js + MongoDB CRM backend** for managing leads, employees, teachers, and payments. The system has two auth roles: **Admin** (full CRUD) and **Employee** (limited access).

- **Entry point**: `src/index.js` (dotenv + DB connection) → `src/app.js` (Express setup with middleware)
- **Database**: MongoDB via Mongoose (`src/db/index.js`), DB name: `"OMDT"` from `src/constant.js`
- **API routes**: Mounted at `/api/v1/{admin,employee,lead,teacher,report,payment}`
- **Models**: Located in `src/models/` — use Mongoose schemas with bcrypt pre-hooks and JWT methods for Admin/Employee models
- **Health check**: `GET /health` returns `{ status, timestamp, uptime }` (used by DigitalOcean)

## Development Workflow
```bash
npm run dev   # Development: nodemon with dotenv auto-reload
npm start     # Production: node src/index.js (used in deployment)
```

**No tests, linters, or build steps** currently configured. Add new routes in `src/routes/`, controllers in `src/controllers/`, and models in `src/models/`.

### Deployment
- **Platform**: DigitalOcean App Platform (Infrastructure as Code via YAML)
- **Scripts**: `scripts/deploy.sh [staging|production]` — creates/updates app using `.do/app.{env}.yaml`
- **Secrets**: Configure via `scripts/setup-secrets.sh [env]` or DigitalOcean dashboard
- **Regions**: `blr1` (Bangalore) for production, see `.do/app.*.yaml` for configuration
- **Docs**: See `DEPLOYMENT.md` for full deployment guide and `.do/README.md` for App Spec details

## Core Conventions

### Error Handling & Responses
**Always** use these utility classes (see `src/utils/`):
- `ApiResponse(statusCode, data, message)` for success responses
- `ApiError(statusCode, message, errors, stack)` for errors (extends Error)
- `asyncHandler(fn)` to wrap all async controller functions (catches errors and passes to Express middleware)

**Example pattern**:
```javascript
const myController = asyncHandler(async (req, res) => {
    if (!req.body.field) throw new ApiError(400, 'Required field')
    const result = await Model.create(req.body)
    return res.status(200).json(new ApiResponse(200, result, 'Success'))
})
```

### Authentication & Dual Route Pattern
- **Admin**: JWT auth via `verifyJWT` middleware (`src/middlewares/auth.middlewares.js`)
  - Uses `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`
  - Routes at `/api/v1/{resource}/{action}` (e.g., `/api/v1/lead/createLead`)
- **Employee**: JWT auth via `employeeVerifyJWT` middleware
  - Uses `EMPLOYEE_ACCESS_TOKEN_SECRET`
  - Duplicate routes with `Empl` prefix: `/api/v1/lead/createEmplLead` (same controller, different auth)
- **Cookies**: `httpOnly: true, secure: true` for both `accessToken` and `refreshToken`
- **Models**: `Admin` and `Employee` models have:
  - `pre("save")` hook for bcrypt password hashing (10 rounds)
  - Instance methods: `isPasswordCorrect()`, `genrateAccessToken()`, `genrateRefreshToken()` ⚠️ Note typo: "genrate" not "generate"

### File Uploads (Multer → Cloudinary)
1. **Multer** saves files to `public/temp/` (see `src/middlewares/multer.middlewares.js`)
2. **Cloudinary** uploads via `uploadOnCloudinary(localFilePath)` in `src/utils/cloudinary.js`
   - Returns `{ secure_url }` on success
   - Always calls `fs.unlinkSync(localFilePath)` after upload (or on error)
3. **Removal**: Use `removeFromCloudinary(imageURL)` to delete old images before updating
4. **Pattern** (see `admin.controllers.js:addEmployee`):
   - Collect files from `req.files[fieldname]`
   - Upload in sequence with `for...of` loop (not `.forEach`)
   - Store URLs in DB after all uploads succeed

### Custom ID Generation & String-Based Foreign Keys
Use functions from `src/utils/CreateIDs.js`:
- `genrateLeadID()` → `"OMD{rand}{AB}{rand}LD"` (always check uniqueness in DB after generation)
- `generateTeacherID()` → `"OMD-TH/{YY}/{rand}"` (e.g., `"OMD-TH/25/007"`)
- `generateReportId(reportName)` → extracts type+date from report name

**Derived IDs**: Replace suffix of `leadID` to create related IDs:
- `leadID.replace('LD', 'RQ')` → Requirement ID (see `lead.controllers.js:allotLeads`)
- `leadID.replace('LD', 'SL')` → Student ID

**Foreign Keys**: Models use **string fields** (`employeeCode`, `leadID`) as foreign keys, **NOT** ObjectId refs. Query with string matches: `Lead.findOne({ leadID: "OMD12AB34LD" })`

### Database Patterns
- **Array fields**: `leadStatus` and `leadDates` in Lead model are arrays. To add entries:
  ```javascript
  findLead.leadStatus.push(newStatus)
  findLead.leadDates.push(new Date())
  await findLead.save()
  ```
- **No ObjectId refs**: All relationships use string fields (`employeeCode`, `leadID`), never Mongoose `ref` or `populate()`
- **Timestamps**: All models use `{ timestamps: true }` (auto `createdAt`, `updatedAt`)

## Key Modules & External Dependencies
- **bcrypt** (v6.0.0): Password hashing (10 rounds in Admin/Employee models)
- **jsonwebtoken**: JWT creation (`jwt.sign`) and verification (`jwt.verify`)
- **cloudinary**: Image/file storage (config in `cloudinary.js`)
- **multer**: File upload middleware (disk storage to `public/temp`)
- **mongoose-aggregate-paginate-v2**: (installed but not yet used in controllers)
- **cors**: Origin from `process.env.ORIGIN`

## Environment Variables Required
- `PORT`, `ORIGIN`, `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `EMPLOYEE_ACCESS_TOKEN_SECRET`
- `EMPLOYEE_ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Common Pitfalls & Known Issues
- **Do NOT** use `.forEach` for async file uploads (promises won't be awaited). Use `for...of` instead (see `admin.controllers.js:addEmployee`).
- **Always** check `employeeStatus` before allotting leads/creating requirements
- **Consistent typo**: Method is `genrateAccessToken()` (not "generate") — keep this spelling throughout codebase
- **Bug in `admin.controllers.js:refreshAccessToken`**: References undefined `user` variable (should be `admin`) on lines 75 and 84
