(function () {
    "use strict";

    // ===== Storage =====
    const STORAGE_KEY = "english_words";

    function loadWords() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveWords(words) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    }

    // ===== State =====
    let words = loadWords();

    // ===== DOM References =====
    const form = document.getElementById("word-form");
    const formTitle = document.getElementById("form-title");
    const editIdInput = document.getElementById("edit-id");
    const wordInput = document.getElementById("word-input");
    const meaningInput = document.getElementById("meaning-input");
    const exampleInput = document.getElementById("example-input");
    const categorySelect = document.getElementById("category-select");
    const submitBtn = document.getElementById("submit-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const searchInput = document.getElementById("search-input");
    const filterCategory = document.getElementById("filter-category");
    const sortSelect = document.getElementById("sort-select");
    const tbody = document.getElementById("words-tbody");
    const emptyState = document.getElementById("empty-state");
    const wordCountEl = document.getElementById("word-count");
    const themeToggle = document.getElementById("theme-toggle");
    const exportJsonBtn = document.getElementById("export-json-btn");
    const exportCsvBtn = document.getElementById("export-csv-btn");
    const importFile = document.getElementById("import-file");

    // ===== Unique ID Generator =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    // ===== Render =====
    function render() {
        const filtered = getFilteredWords();
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
            default: // newest
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
            // Update existing
            words = words.map(function (w) {
                if (w.id === editId) {
                    return Object.assign({}, w, {
                        word: word,
                        meaning: meaning,
                        example: example,
                        category: category,
                    });
                }
                return w;
            });
        } else {
            // Add new
            words.push({
                id: generateId(),
                word: word,
                meaning: meaning,
                example: example,
                category: category,
                createdAt: Date.now(),
            });
        }

        saveWords(words);
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
            saveWords(words);
            // If we were editing this word, reset the form
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

    // Load saved theme
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
                        words.push({
                            id: item.id || generateId(),
                            word: item.word,
                            meaning: item.meaning,
                            example: item.example || "",
                            category: item.category || "",
                            createdAt: item.createdAt || Date.now(),
                        });
                        count++;
                    }
                });
                saveWords(words);
                render();
                alert("Imported " + count + " word(s) successfully.");
            } catch {
                alert("Failed to parse file. Make sure it is valid JSON.");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    });

    // ===== Initial Render =====
    render();
})();
