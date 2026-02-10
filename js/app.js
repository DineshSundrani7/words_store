(function () {
    "use strict";

    // ===== Auth =====
    var authScreen = document.getElementById("auth-screen");
    var appContainer = document.getElementById("app-container");
    var authForm = document.getElementById("auth-form");
    var authEmailInput = document.getElementById("auth-email");
    var authPasswordInput = document.getElementById("auth-password");
    var authError = document.getElementById("auth-error");
    var authSubmitBtn = document.getElementById("auth-submit-btn");
    var authToggleBtn = document.getElementById("auth-toggle-btn");
    var authToggleMsg = document.getElementById("auth-toggle-msg");
    var signOutBtn = document.getElementById("sign-out-btn");
    var userEmailEl = document.getElementById("user-email");

    var googleSignInBtn = document.getElementById("google-sign-in-btn");

    var isSignUp = false;
    var currentUser = null;

    function showAuthError(msg) {
        authError.textContent = msg;
        authError.style.display = "block";
    }

    function hideAuthError() {
        authError.style.display = "none";
    }

    authToggleBtn.addEventListener("click", function () {
        isSignUp = !isSignUp;
        if (isSignUp) {
            authSubmitBtn.textContent = "Sign Up";
            authToggleMsg.textContent = "Already have an account?";
            authToggleBtn.textContent = "Sign In";
        } else {
            authSubmitBtn.textContent = "Sign In";
            authToggleMsg.textContent = "Don't have an account?";
            authToggleBtn.textContent = "Sign Up";
        }
        hideAuthError();
    });

    authForm.addEventListener("submit", function (e) {
        e.preventDefault();
        hideAuthError();
        var email = authEmailInput.value.trim();
        var password = authPasswordInput.value;

        if (!email || !password) return;

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = isSignUp ? "Signing up..." : "Signing in...";

        var promise = isSignUp
            ? auth.createUserWithEmailAndPassword(email, password)
            : auth.signInWithEmailAndPassword(email, password);

        promise.catch(function (error) {
            var msg = error.message || "Authentication failed.";
            if (error.code === "auth/user-not-found") msg = "No account found with this email.";
            if (error.code === "auth/wrong-password") msg = "Incorrect password.";
            if (error.code === "auth/invalid-credential") msg = "Invalid email or password.";
            if (error.code === "auth/email-already-in-use") msg = "An account with this email already exists.";
            if (error.code === "auth/weak-password") msg = "Password should be at least 6 characters.";
            showAuthError(msg);
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isSignUp ? "Sign Up" : "Sign In";
        });
    });

    signOutBtn.addEventListener("click", function () {
        auth.signOut();
    });

    // Google Sign-In
    googleSignInBtn.addEventListener("click", function () {
        hideAuthError();
        var provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(function (error) {
            if (error.code !== "auth/popup-closed-by-user") {
                showAuthError(error.message || "Google sign-in failed.");
            }
        });
    });

    // ===== Auth State Listener =====
    auth.onAuthStateChanged(function (user) {
        if (user) {
            currentUser = user;
            authScreen.style.display = "none";
            appContainer.style.display = "";
            userEmailEl.textContent = user.email;
            initApp();
        } else {
            currentUser = null;
            authScreen.style.display = "";
            appContainer.style.display = "none";
            userEmailEl.textContent = "";
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isSignUp ? "Sign Up" : "Sign In";
            stopFirestoreSync();
            words = [];
        }
    });

    // ===== Storage =====
    var COLLECTION = "words";

    function userLocalKey() {
        return currentUser ? "english_words_" + currentUser.uid : "english_words";
    }

    function loadLocalWords() {
        try {
            return JSON.parse(localStorage.getItem(userLocalKey())) || [];
        } catch {
            return [];
        }
    }

    function saveLocalWords(wordsList) {
        localStorage.setItem(userLocalKey(), JSON.stringify(wordsList));
    }

    // Firestore helpers — store under users/{uid}/words
    function isFirebaseReady() {
        return typeof db !== "undefined" &&
            typeof firebaseConfig !== "undefined" &&
            firebaseConfig.apiKey !== "YOUR_API_KEY" &&
            currentUser;
    }

    function userWordsCollection() {
        return db.collection("users").doc(currentUser.uid).collection(COLLECTION);
    }

    function firestoreAdd(word) {
        if (!isFirebaseReady()) return Promise.resolve();
        return userWordsCollection().doc(word.id).set(word);
    }

    function firestoreUpdate(id, data) {
        if (!isFirebaseReady()) return Promise.resolve();
        return userWordsCollection().doc(id).update(data);
    }

    function firestoreDelete(id) {
        if (!isFirebaseReady()) return Promise.resolve();
        return userWordsCollection().doc(id).delete();
    }

    // ===== State =====
    var words = [];
    var unsubscribeSync = null;

    // ===== DOM References =====
    var form = document.getElementById("word-form");
    var formTitle = document.getElementById("form-title");
    var editIdInput = document.getElementById("edit-id");
    var wordInput = document.getElementById("word-input");
    var meaningInput = document.getElementById("meaning-input");
    var exampleInput = document.getElementById("example-input");
    var categorySelect = document.getElementById("category-select");
    var submitBtn = document.getElementById("submit-btn");
    var cancelBtn = document.getElementById("cancel-btn");
    var searchInput = document.getElementById("search-input");
    var filterCategory = document.getElementById("filter-category");
    var sortSelect = document.getElementById("sort-select");
    var tbody = document.getElementById("words-tbody");
    var emptyState = document.getElementById("empty-state");
    var wordCountEl = document.getElementById("word-count");
    var themeToggle = document.getElementById("theme-toggle");
    var exportJsonBtn = document.getElementById("export-json-btn");
    var exportCsvBtn = document.getElementById("export-csv-btn");
    var importFile = document.getElementById("import-file");

    // ===== Unique ID Generator =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    // ===== Render =====
    function render() {
        var filtered = getFilteredWords();
        wordCountEl.textContent = words.length + (words.length === 1 ? " word" : " words");

        if (filtered.length === 0) {
            tbody.innerHTML = "";
            emptyState.style.display = "block";
            document.getElementById("words-table").style.display = "none";
            return;
        }

        emptyState.style.display = "none";
        document.getElementById("words-table").style.display = "";

        tbody.innerHTML = filtered
            .map(function (w, i) {
                return (
                    '<tr data-id="' + w.id + '">' +
                    "<td>" + (i + 1) + "</td>" +
                    '<td><span class="word-text">' + escapeHtml(w.word) + "</span></td>" +
                    "<td>" + (w.category ? '<span class="category-badge">' + escapeHtml(w.category) + "</span>" : "&mdash;") + "</td>" +
                    "<td>" + escapeHtml(w.meaning) + "</td>" +
                    '<td><span class="example-text">' + (w.example ? escapeHtml(w.example) : "&mdash;") + "</span></td>" +
                    '<td><span class="date-text">' + formatDate(w.createdAt) + "</span></td>" +
                    '<td class="actions-cell">' +
                    '<button class="btn-edit" data-id="' + w.id + '" title="Edit">Edit</button>' +
                    '<button class="btn-delete" data-id="' + w.id + '" title="Delete">Del</button>' +
                    "</td>" +
                    "</tr>"
                );
            })
            .join("");
    }

    function getFilteredWords() {
        var list = words.slice();
        var search = searchInput.value.trim().toLowerCase();
        var cat = filterCategory.value;
        var sort = sortSelect.value;

        if (search) {
            list = list.filter(function (w) {
                return (
                    w.word.toLowerCase().includes(search) ||
                    w.meaning.toLowerCase().includes(search) ||
                    (w.example && w.example.toLowerCase().includes(search))
                );
            });
        }

        if (cat) {
            list = list.filter(function (w) {
                return w.category === cat;
            });
        }

        switch (sort) {
            case "oldest":
                list.sort(function (a, b) { return a.createdAt - b.createdAt; });
                break;
            case "alpha-asc":
                list.sort(function (a, b) { return a.word.localeCompare(b.word); });
                break;
            case "alpha-desc":
                list.sort(function (a, b) { return b.word.localeCompare(a.word); });
                break;
            default:
                list.sort(function (a, b) { return b.createdAt - a.createdAt; });
        }

        return list;
    }

    // ===== Helpers =====
    function escapeHtml(str) {
        var div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(ts) {
        var d = new Date(ts);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    // ===== Add / Edit =====
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var word = wordInput.value.trim();
        var meaning = meaningInput.value.trim();
        var example = exampleInput.value.trim();
        var category = categorySelect.value;
        var editId = editIdInput.value;

        if (!word || !meaning) return;

        if (editId) {
            var updateData = {
                word: word,
                meaning: meaning,
                example: example,
                category: category,
            };
            words = words.map(function (w) {
                if (w.id === editId) {
                    return Object.assign({}, w, updateData);
                }
                return w;
            });
            saveLocalWords(words);
            firestoreUpdate(editId, updateData);
        } else {
            var newWord = {
                id: generateId(),
                word: word,
                meaning: meaning,
                example: example,
                category: category,
                createdAt: Date.now(),
            };
            words.push(newWord);
            saveLocalWords(words);
            firestoreAdd(newWord);
        }

        resetForm();
        render();
    });

    function resetForm() {
        form.reset();
        editIdInput.value = "";
        formTitle.textContent = "Add New Word";
        submitBtn.textContent = "Add Word";
        cancelBtn.style.display = "none";
    }

    cancelBtn.addEventListener("click", resetForm);

    // ===== Table Actions (Edit / Delete) =====
    tbody.addEventListener("click", function (e) {
        var id = e.target.getAttribute("data-id");
        if (!id) return;

        if (e.target.classList.contains("btn-edit")) {
            var w = words.find(function (item) { return item.id === id; });
            if (!w) return;
            editIdInput.value = w.id;
            wordInput.value = w.word;
            meaningInput.value = w.meaning;
            exampleInput.value = w.example || "";
            categorySelect.value = w.category || "";
            formTitle.textContent = "Edit Word";
            submitBtn.textContent = "Update Word";
            cancelBtn.style.display = "";
            wordInput.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        if (e.target.classList.contains("btn-delete")) {
            if (!confirm('Delete "' + words.find(function (item) { return item.id === id; }).word + '"?')) return;
            words = words.filter(function (item) { return item.id !== id; });
            saveLocalWords(words);
            firestoreDelete(id);
            if (editIdInput.value === id) resetForm();
            render();
        }
    });

    // ===== Search / Filter / Sort =====
    searchInput.addEventListener("input", render);
    filterCategory.addEventListener("change", render);
    sortSelect.addEventListener("change", render);

    // ===== Theme Toggle =====
    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        themeToggle.innerHTML = theme === "dark" ? "&#9788;" : "&#9789;";
        localStorage.setItem("theme", theme);
    }

    themeToggle.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });

    (function () {
        var saved = localStorage.getItem("theme") || "light";
        applyTheme(saved);
    })();

    // ===== Export JSON =====
    exportJsonBtn.addEventListener("click", function () {
        if (words.length === 0) {
            alert("No words to export.");
            return;
        }
        var blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
        downloadBlob(blob, "english_words.json");
    });

    // ===== Export CSV =====
    exportCsvBtn.addEventListener("click", function () {
        if (words.length === 0) {
            alert("No words to export.");
            return;
        }
        var rows = [["Word", "Category", "Meaning", "Example", "Date"]];
        words.forEach(function (w) {
            rows.push([
                csvEscape(w.word),
                csvEscape(w.category || ""),
                csvEscape(w.meaning),
                csvEscape(w.example || ""),
                formatDate(w.createdAt),
            ]);
        });
        var csv = rows.map(function (r) { return r.join(","); }).join("\n");
        var blob = new Blob([csv], { type: "text/csv" });
        downloadBlob(blob, "english_words.csv");
    });

    function csvEscape(str) {
        if (/[",\n]/.test(str)) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== Import JSON =====
    importFile.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var imported = JSON.parse(ev.target.result);
                if (!Array.isArray(imported)) {
                    alert("Invalid file: expected a JSON array.");
                    return;
                }
                var count = 0;
                imported.forEach(function (item) {
                    if (item.word && item.meaning) {
                        var newWord = {
                            id: item.id || generateId(),
                            word: item.word,
                            meaning: item.meaning,
                            example: item.example || "",
                            category: item.category || "",
                            createdAt: item.createdAt || Date.now(),
                        };
                        words.push(newWord);
                        firestoreAdd(newWord);
                        count++;
                    }
                });
                saveLocalWords(words);
                render();
                alert("Imported " + count + " word(s) successfully.");
            } catch {
                alert("Failed to parse file. Make sure it is valid JSON.");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    });

    // ===== Firestore Real-time Sync =====
    function startFirestoreSync() {
        if (!isFirebaseReady()) return;

        unsubscribeSync = userWordsCollection()
            .orderBy("createdAt", "desc")
            .onSnapshot(function (snapshot) {
                words = [];
                snapshot.forEach(function (doc) {
                    words.push(doc.data());
                });
                saveLocalWords(words);
                render();
            }, function (error) {
                console.warn("Firestore sync error, using local data:", error);
            });
    }

    function stopFirestoreSync() {
        if (unsubscribeSync) {
            unsubscribeSync();
            unsubscribeSync = null;
        }
    }

    // ===== Init App (called on auth) =====
    function initApp() {
        words = loadLocalWords();
        render();
        startFirestoreSync();
    }
})();
