# Error Message Debugging & Testing Guide

## 🔴 IF ERROR MESSAGE IS NOT SHOWING

Follow these steps to test and debug:

### Step 1: Open Browser Console
1. Open login page
2. Press **F12** or **Right-click → Inspect → Console tab**
3. Keep console open while testing

### Step 2: Try Wrong Email/Password
1. Enter email: `test@example.com` (non-existent)
2. Enter password: `password123` (valid format)
3. Click "Sign In"
4. **Watch the console** for these messages:
   ```
   ✅ Login error in AuthContext: {...}
   ✅ API Error Response: {success: false, message: "Invalid email or password..."}
   ✅ ApiError object created: {message: "Invalid email or password..."}
   ✅ Login error caught in LoginForm: {...}
   ✅ Setting error message: "Invalid email or password..."
   ```

### Step 3: Check if Error Alert Appears
- **Should see**: Red alert box above form with message
- **Message**: "Invalid email or password. Please check your credentials and try again."

---

## 📝 Expected Console Output

### Successful Case
```
✅ Login error in AuthContext: {...success: false, message: "Invalid email or password..."}
✅ API Error Response: {message: "Invalid email or password..."}
✅ ApiError object created: {message: "Invalid email or password..."}
✅ Login error caught in LoginForm: {...}
✅ Setting error message: "Invalid email or password. Please check your credentials and try again."
```

### What to Look For
- ✅ Error is logged in AuthContext
- ✅ Error message is extracted from API response
- ✅ Error is caught in LoginForm
- ✅ Error message is set in state (setError)
- ✅ Red alert should appear with the message

---

## 🧪 Test Cases

### Test 1: Wrong Email
```
Email: nonexistent@example.com
Password: password123 (correct format, wrong value)
Expected: Red alert with "Invalid email or password..."
```

### Test 2: Wrong Password
```
Email: owner@tms.comr (correct email)
Password: wrongpassword (wrong value)
Expected: Red alert with "Invalid email or password..."
```

### Test 3: Correct Credentials
```
Email: owner@tms.comr
Password: password123
Expected: No error, redirect to dashboard
```

### Test 4: Invalid Email Format
```
Email: invalid-email (no @)
Password: password123
Expected: Error below email field (client-side)
```

### Test 5: Empty Fields
```
Email: (empty)
Password: (empty)
Expected: Errors below fields (client-side)
```

---

## 🔍 Debugging Checklist

- [ ] Open DevTools Console (F12)
- [ ] Try wrong email/password
- [ ] Check console for error logs
- [ ] Verify error message appears in console
- [ ] Check if red alert appears on form
- [ ] Verify error message text is readable
- [ ] Try closing error alert with X button
- [ ] Try correcting credentials and logging in again

---

## 🛠️ If Error Still Not Showing

### Check 1: Backend Response
1. Open DevTools → Network tab
2. Try login with wrong credentials
3. Click on the `login` request
4. Check "Response" tab
5. You should see:
   ```json
   {
     "success": false,
     "message": "Invalid email or password...",
     "statusCode": 401
   }
   ```

### Check 2: Frontend Error State
1. Open DevTools → Console
2. After login fails, type: `console.log(JSON.stringify(error))`
3. Verify the error object has a `message` property

### Check 3: Clear Cache & Reload
1. Press **Ctrl + Shift + R** (hard refresh)
2. Clear sessionStorage: Press F12 → Application → Session Storage → Clear
3. Try login again

---

## 📋 Files Involved in Error Display

1. **Backend**
   - `backend/src/services/auth.service.ts` - Throws error with message
   - `backend/src/middleware/error.middleware.ts` - Returns error response
   
2. **Frontend**
   - `frontend/src/api/client.ts` - Extracts error message from response
   - `frontend/src/contexts/AuthContext.tsx` - Logs and re-throws error
   - `frontend/src/components/auth/LoginForm.tsx` - Catches error and displays
   
3. **Console Logs Added**
   - `API Error Response` - Shows what backend returned
   - `ApiError object created` - Shows formatted error
   - `Login error in AuthContext` - Shows error in context
   - `Login error caught in LoginForm` - Shows error in form
   - `Setting error message` - Shows what message will display

---

## ✅ Complete Error Flow

```
User enters wrong email/password
           ↓
Clicks "Sign In"
           ↓
LoginForm.onSubmit() called
           ↓
Calls login(data) from AuthContext
           ↓
authApi.login(credentials) called
           ↓
API returns 401 error with message
           ↓
apiClient error interceptor catches it
  → console.error('API Error Response:', error.response?.data)
  → Creates ApiError object
  → console.log('ApiError object created:', apiError)
  → Promise.reject(apiError)
           ↓
AuthContext catches error
  → console.error('Login error in AuthContext:', error)
  → Re-throws error
           ↓
LoginForm catches error
  → console.error('Login error caught in LoginForm:', err)
  → Extracts message from err.message
  → console.log('Setting error message:', errorMessage)
  → setError(errorMessage)
           ↓
❌ RED ALERT APPEARS WITH ERROR MESSAGE
```

---

## 📞 Support

If error is still not showing:
1. Check all console logs (should see 4 different logs)
2. Verify Network tab shows 401 response
3. Clear cache and try again
4. Check that sessionStorage is working

The error message **MUST** display - if not, check console for clues!
