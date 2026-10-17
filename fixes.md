# SAST Fixes

Replaced multer 250MB file size limit with 100MB MAX_UPLOAD_BUFFER cap - because of rule typescript:S5693 (VULNERABILITY, MAJOR)
Replaced String(value) with String.prototype.toString.call(value) in sanitizeInput - because of rule typescript:S6551 (CODE_SMELL)
Replaced .replace() with .replaceAll() for null byte removal - because of rule typescript:S7781 (CODE_SMELL, MINOR)
Removed unused safeTitle variable assignment - because of rule typescript:S1854 (CODE_SMELL, MAJOR)
Replaced parseInt with Number.parseInt in server.ts MAX_FILE_SIZE - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Replaced parseInt with Number.parseInt in server.ts maxFileSize fallback - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Replaced parseInt with Number.parseInt in server/db.ts getAppSettings maxFileSize - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Replaced parseInt with Number.parseInt in server/db.ts backfill maxFileSize - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Replaced parseInt with Number.parseInt in server/setupCli.ts maxFileSize - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Replaced parseInt with Number.parseInt in AdminSettingsModal maxFileSizeMB - because of rule typescript:S7773 (CODE_SMELL, MINOR)
Extracted backfillAppSettingsDefaults() method from getAppSettings() to reduce cognitive complexity - because of rule typescript:S3776 (CODE_SMELL, CRITICAL)