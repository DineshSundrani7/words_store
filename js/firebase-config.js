// ============================================================
// Firebase Configuration
// ============================================================
// Replace the placeholder values below with your Firebase project config.
//
// HOW TO GET THESE VALUES:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use an existing one)
// 3. Click the gear icon > Project settings
// 4. Scroll to "Your apps" > click the web icon (</>)
// 5. Register the app and copy the firebaseConfig object here
// ============================================================

var firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
