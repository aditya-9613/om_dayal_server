# OM Dayal CRM Server - AI Agent Instructions

## Architecture Overview
This is an **Express.js + MongoDB CRM backend** for managing leads, employees, teachers, and payments. The system has two auth roles: **Admin** (full CRUD) and **Employee** (read-only on leads/requirements).

- **Entry point**: `src/index.js` → `src/app.js` (Express setup)
- **Database**: MongoDB via Mongoose (`src/db/index.js`), DB name from `src/constant.js`
- **API routes**: Mounted at `/api/v1/{admin,employee,lead,teacher,report,payment}`
- **Models**: Located in `src/models/` — use Mongoose schemas with bcrypt pre-hooks and JWT methods for Admin/Employee models

## Development Workflow
```bash
npm run dev  # Starts nodemon with dotenv (src/index.js)
```
No tests, linters, or build steps currently configured. Add new routes in `src/routes/`, controllers in `src/controllers/`, and models in `src/models/`.

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

### Authentication
- **Admin**: JWT auth via `verifyJWT` middleware (src/middlewares/auth.middlewares.js). Tokens use `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` env vars.
- **Employee**: JWT auth via `employeeVerifyJWT` middleware. Uses `EMPLOYEE_ACCESS_TOKEN_SECRET`.
- Cookies: `httpOnly: true, secure: true` for both `accessToken` and `refreshToken`.
- Models (`Admin`, `Employee`) have pre-save hooks for bcrypt hashing and instance methods for `isPasswordCorrect()`, `genrateAccessToken()`, `genrateRefreshToken()`.

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

### Custom ID Generation
Use functions from `src/utils/CreateIDs.js`:
- `genrateLeadID()` → `"OMD{rand}{AB}{rand}LD"` (ensure uniqueness with DB check)
- `generateTeacherID()` → `"OMD-TH/{YY}/{rand}"`
- `generateReportId(reportName)` → extracts type+date from report name

Derived IDs: Replace suffix of `leadID` (e.g., `LD` → `RQ` for requirements, `LD` → `SL` for students).

### Database Patterns
- **Array fields**: `leadStatus` and `leadDates` in Lead model are arrays; push new status/date with `.push()` and `.save()`
- **References**: Use string fields (`employeeCode`, `leadID`) as foreign keys, not ObjectId refs
- **Timestamps**: All models use `{ timestamps: true }`

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

## Common Pitfalls
- **Do NOT** use `.forEach` for async file uploads (promises won't be awaited). Use `for...of` instead.
- **Always** check `employeeStatus` before allotting leads (see `lead.controllers.js:allotLeads`)
- **Typo in Admin model**: `genrateAccessToken` (not "generate") — keep consistent with existing codebase
- **Refresh token endpoint** (`admin.controllers.js:refreshAccessToken`) references undefined `user` variable (should be `admin`)
