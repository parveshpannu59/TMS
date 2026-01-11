# Login Form Validation & Error Messages - Testing Guide

## Overview
This guide demonstrates all validation scenarios and error messages in the login form.

---

## ✅ Test Scenarios

### **1. Field Validation Errors** (Client-Side)
These errors appear immediately when you interact with the form fields.

#### Email Field Validation
| Test Case | Action | Expected Error | Shown At |
|-----------|--------|---|---|
| Empty Email | Leave empty, click elsewhere | "Email address is required" | Below email field |
| Invalid Format | Enter "test" | "Please enter a valid email address" | Below email field |
| With Spaces | Enter " test@email.com " | "Email cannot have leading or trailing spaces" | Below email field |
| Valid Email | Enter "user@example.com" | No error | - |

#### Password Field Validation
| Test Case | Action | Expected Error | Shown At |
|-----------|--------|---|---|
| Empty Password | Leave empty, click elsewhere | "Password is required" | Below password field |
| Too Short | Enter "12345" | "Password must be at least 6 characters long" | Below password field |
| With Spaces | Enter " password " | "Password cannot have leading or trailing spaces" | Below password field |
| Valid Password | Enter "password123" | No error | - |

---

### **2. Authentication Errors** (Server-Side)
These errors appear in a red alert box at the top of the form when you submit with valid form data but wrong credentials.

#### Error Scenarios
| Test Case | Email | Password | Expected Error | Alert Color |
|-----------|-------|----------|---|---|
| Wrong Email | "nonexistent@email.com" | "password123" | "Invalid email or password. Please check your credentials and try again." | Red |
| Wrong Password | "owner@tms.comr" | "wrongpassword" | "Invalid email or password. Please check your credentials and try again." | Red |
| Inactive Account | "inactive@email.com" | "correctpassword" | "Your account has been deactivated. Please contact support for assistance." | Red |
| Correct Credentials | "owner@tms.comr" | "password123" | No error, redirects to dashboard | - |

---

## 🧪 How to Test

### Test 1: Email Validation
```
1. Open the login page
2. Click on Email field, then click elsewhere (without typing)
   ➜ Should see: "Email address is required"
3. Type "invalidemailformat"
   ➜ Should see: "Please enter a valid email address"
4. Clear and type " user@example.com " (with spaces)
   ➜ Should see: "Email cannot have leading or trailing spaces"
5. Clear and type "user@example.com"
   ➜ Should see: No error
```

### Test 2: Password Validation
```
1. Click on Password field, then click elsewhere
   ➜ Should see: "Password is required"
2. Type "12345"
   ➜ Should see: "Password must be at least 6 characters long"
3. Clear and type " password " (with spaces)
   ➜ Should see: "Password cannot have leading or trailing spaces"
4. Clear and type "password123"
   ➜ Should see: No error
```

### Test 3: Wrong Credentials (Authentication Error)
```
1. Enter valid email format: "test@example.com"
2. Enter valid password: "password123"
3. Click "Sign In"
4. Wait for response
   ➜ Should see RED ALERT: "Invalid email or password. Please check your credentials and try again."
5. The email and password fields remain filled for correction
```

### Test 4: Correct Credentials (Success)
```
1. Enter correct email: "owner@tms.comr"
2. Enter correct password: "password123"
3. Click "Sign In"
4. Wait for response
   ➜ Should redirect to Dashboard
   ➜ No error message
```

---

## 📋 Error Message Types

### **Field-Level Errors**
- **Location**: Directly below the input field
- **Color**: Red text below field
- **When**: After leaving the field (onBlur)
- **Examples**:
  - "Email address is required"
  - "Please enter a valid email address"
  - "Password is required"
  - "Password must be at least 6 characters long"

### **Authentication Errors**
- **Location**: Red alert box above form fields
- **Color**: Red background (#ffebee) with red border
- **When**: After clicking "Sign In" with valid form data
- **Examples**:
  - "Invalid email or password. Please check your credentials and try again."
  - "Your account has been deactivated. Please contact support for assistance."
- **Action**: Alert has X button to close

---

## 🔍 UI Elements

### Login Form Structure
```
┌─────────────────────────────────────┐
│      TMS Logo (Blue Circle)         │
│  ─────────────────────────────────  │
│      Welcome Back                   │
│  Sign in to continue to TMS         │
│                                     │
│  [RED ALERT - If Error] ✕          │
│                                     │
│  Email Address ★                    │
│  ┌─────────────────────────────────┐│
│  │ owner@tms.comr                  ││
│  └─────────────────────────────────┘│
│  Error message here (if invalid)    │
│                                     │
│  Password ★                         │
│  ┌─────────────────────────────────┐│
│  │ ●●●●●●●●●●       👁️            ││
│  └─────────────────────────────────┘│
│  Error message here (if invalid)    │
│                                     │
│  [SIGN IN BUTTON]                   │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 Real-Time Validation Flow

```
User enters email → Validates on blur
                ↓
            Valid? ✓
                ↓
    No errors shown, field is good
                ↓
User enters password → Validates on blur
                ↓
            Valid? ✓
                ↓
    No errors shown, Submit button enabled
                ↓
User clicks "Sign In" → Sends to backend
                ↓
        Backend Response
       /              \
    Success           Error
       ↓                ↓
   Redirect         Show Alert
   Dashboard      with error message
```

---

## 🎯 Key Features

✅ **Real-time Validation**: Errors show immediately as you leave each field
✅ **Clear Error Messages**: Each error tells you exactly what's wrong
✅ **Field-Level & Alert Errors**: Both validation and authentication errors are shown
✅ **Professional Styling**: Red alert with border for authentication errors
✅ **User-Friendly**: Form keeps your data so you can easily correct it
✅ **Security**: Generic error message for wrong email/password (prevents email enumeration)
✅ **Loading State**: Button shows "Signing in..." during submission

---

## 🚀 Expected Test Results

All scenarios should display errors clearly and accurately:
- ✅ Field validation errors appear below respective fields
- ✅ Authentication errors appear in red alert box
- ✅ Error messages are professional and meaningful
- ✅ Form remains interactive for user to correct input
- ✅ Successful login redirects to dashboard

---

## 📝 Notes

- All validation happens on the **client-side** first (form validation)
- Authentication happens on the **server-side** (backend)
- Errors are never generic - they provide specific guidance
- Password field has show/hide toggle for visibility
- Form data persists until user logs in successfully
