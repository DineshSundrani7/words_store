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
    apiKey: "AIzaSyBFGvEczqs_7o53pdmYnVyC7ijufXnnQ6E",
    authDomain: "words-store-878b2.firebaseapp.com",
    projectId: "words-store-878b2",
    storageBucket: "words-store-878b2.firebasestorage.app",
    messagingSenderId: "1009550901316",
    appId: "1:1009550901316:web:e5cda3619bcd5ab36a7c11",
    measurementId: "G-7H9RNJPNCZ"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var auth = firebase.auth();
