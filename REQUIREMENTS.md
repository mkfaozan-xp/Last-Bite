# LastBite — Complete Setup Requirements
# Firebase Project: last-bite-179b2
# ============================================================
# COPY AND RUN THESE COMMANDS IN ORDER — that's all you need!
# ============================================================


## ─── STEP 1: Install Node.js ──────────────────────────────
# Download from https://nodejs.org (choose LTS version)
# After install, verify:
node --version      # Must show v18 or higher
npm --version       # Must show v9 or higher


## ─── STEP 2: Install pnpm (faster package manager) ────────
npm install -g pnpm

# Verify:
pnpm --version


## ─── STEP 3: Extract and enter the project ─────────────────
# 1. Extract the lastbite-project.zip file
# 2. Open terminal/command prompt in that folder:
cd lastbite-project


## ─── STEP 4: Install ALL dependencies ─────────────────────
# This single command installs everything from package.json:
pnpm install

# Then add Firebase:
pnpm add firebase


## ─── STEP 5: Enable Firebase Services ─────────────────────
# Go to: https://console.firebase.google.com/project/last-bite-179b2
#
# A) Authentication:
#    Build → Authentication → Get started
#    Sign-in method → Email/Password → Enable → Save
#    Sign-in method → Google → Enable → Add support email → Save
#
# B) Firestore Database:
#    Build → Firestore Database → Create database
#    Select: Start in production mode → Next
#    Region: asia-south1 (Mumbai) → Enable
#
# C) Storage:
#    Build → Storage → Get started
#    Select: Start in production mode → Done


## ─── STEP 6: Deploy Firestore Security Rules ───────────────
# Install Firebase CLI:
npm install -g firebase-tools

# Login:
firebase login

# Set your project:
firebase use last-bite-179b2

# Deploy rules (copy firestore.rules from project root):
firebase deploy --only firestore:rules

# Deploy indexes:
firebase deploy --only firestore:indexes


## ─── STEP 7: Run the project ───────────────────────────────
pnpm dev

# Your app opens at: http://localhost:5173


## ─── DONE! ─────────────────────────────────────────────────


# ============================================================
# FIRESTORE SECURITY RULES  (already in firestore.rules file)
# ============================================================
# Copy this into Firebase Console → Firestore → Rules:
#
# rules_version = '2';
# service cloud.firestore {
#   match /databases/{database}/documents {
#     function isSignedIn() { return request.auth != null; }
#     function isOwner(uid) { return request.auth.uid == uid; }
#     match /users/{userId} {
#       allow read, create: if isSignedIn() && isOwner(userId);
#       allow update: if isSignedIn() && isOwner(userId);
#     }
#     match /restaurants/{id} { allow read: if true; allow write: if isSignedIn(); }
#     match /ngos/{id}         { allow read: if true; allow write: if isSignedIn(); }
#     match /foodItems/{id}    { allow read: if true; allow write: if isSignedIn(); }
#     match /orders/{id}       { allow read, write: if isSignedIn(); }
#     match /transactions/{id} { allow read, write: if isSignedIn(); }
#     match /stockAlerts/{id}  { allow read, write: if isSignedIn(); }
#     match /donations/{id}    { allow read, write: if isSignedIn(); }
#     match /notifications/{id}{ allow read, write: if isSignedIn(); }
#   }
# }


# ============================================================
# TROUBLESHOOTING
# ============================================================
#
# ERROR: "Cannot find module 'firebase'"
#   FIX:  pnpm add firebase
#
# ERROR: "Missing or insufficient permissions"
#   FIX:  Go to Firebase Console → Firestore → Rules
#         Paste the rules above and click Publish
#
# ERROR: "The query requires an index"
#   FIX:  Click the link shown in browser console (F12)
#         It opens Firebase and auto-creates the index
#         Wait 2 minutes, then refresh your page
#
# ERROR: "auth/unauthorized-domain"
#   FIX:  Firebase Console → Authentication → Settings
#         → Authorized domains → Add "localhost"
#
# ERROR: Port 5173 already in use
#   FIX:  pnpm dev --port 3000
#
# ERROR: Google sign-in popup blocked
#   FIX:  Allow popups for localhost in browser settings
#
# ERROR: Blank white screen
#   FIX:  Press F12 → Console tab → read the red error
#         Most likely: wrong import path or missing file


# ============================================================
# HOW TO TEST THE FULL APP
# ============================================================
#
# 1. Customer flow:
#    → Open http://localhost:5173
#    → Sign up as "Customer"
#    → Browse food items (empty until a restaurant adds items)
#
# 2. Restaurant flow:
#    → Open new Incognito window → Sign up as "Restaurant"
#    → Go to Restaurant Dashboard
#    → Click "Add New Item" → fill details → submit
#    → Switch back to Customer window — item appears live!
#
# 3. NGO flow:
#    → Open another Incognito window → Sign up as "NGO"
#    → Go to NGO Dashboard
#    → Pending donations appear when restaurants create them
#
# 4. Wallet:
#    → Go to Wallet page → Add Money → ₹500
#    → Place an order using wallet balance
#    → Watch cashback appear automatically


# ============================================================
# ALL COMMANDS IN ONE BLOCK (copy-paste entire block)
# ============================================================
#
# npm install -g pnpm
# cd lastbite-project
# pnpm install
# pnpm add firebase
# npm install -g firebase-tools
# firebase login
# firebase use last-bite-179b2
# firebase deploy --only firestore:rules,firestore:indexes
# pnpm dev
