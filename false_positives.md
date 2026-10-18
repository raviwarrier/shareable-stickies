# False Positives and Accepted Security Hotspots

## Issue #19: Content Length Limit in Multer
- **Rule**: `typescript:S5693` (VULNERABILITY / SECURITY HOTSPOT, MAJOR)
- **File**: `server.ts:99`
- **Code**: `limits: { fileSize: MAX_UPLOAD_BUFFER }`
- **Evaluation**: False Positive / Accepted Hotspot
- **Rationale**: 
  - `MAX_UPLOAD_BUFFER` is set to 100MB as a hard upper bound for the multer buffer to prevent unbounded memory usage and denial-of-service.
  - The application provides an administrator configuration panel (Tab #5: Attachments & File Upload Policy) permitting sticky file attachments up to 100MB (default 15MB).
  - Enforcing a smaller hardcoded buffer limit (e.g. 8MB) in multer would break valid file uploads within the administrator-configured limits.
  - Per-paste size limits (`maxFileSize`) and allowed categories (`fileTypeCategories`) are strictly validated dynamically in the route handler, and executable payloads are unconditionally rejected by MIME type and file extension checks.
