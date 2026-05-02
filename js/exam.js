(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var loadingEl = document.getElementById("exam-loading");
  var errorEl = document.getElementById("exam-error");
  var contentEl = document.getElementById("exam-content");
  var codeEl = document.getElementById("exam-code");
  var titleEl = document.getElementById("exam-title");
  var statsEl = document.getElementById("exam-stats");
  var rootEl = document.getElementById("questions-root");

  function showError(message) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    if (contentEl) contentEl.hidden = true;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function optionLetter(i) {
    return String.fromCharCode(65 + i);
  }

  function resolveCorrectDisplay(question) {
    if (Array.isArray(question.correctIndices) && question.correctIndices.length) {
      var seen = {};
      var uniq = [];
      question.correctIndices
        .filter(function (n) {
          return typeof n === "number" && !isNaN(n) && n >= 0;
        })
        .sort(function (a, b) {
          return a - b;
        })
        .forEach(function (idx) {
          var k = String(idx);
          if (!seen[k]) {
            seen[k] = true;
            uniq.push(idx);
          }
        });
      if (uniq.length) {
        return uniq.map(optionLetter).join(", ");
      }
    }
    if (typeof question.correctIndex === "number") {
      return optionLetter(question.correctIndex);
    }
    if (question.correctText) {
      return String(question.correctText);
    }
    return "(see explanation)";
  }

  function imagesHtml(question) {
    var imgs = Array.isArray(question.images) ? question.images : [];
    if (!imgs.length) return "";

    return (
      '<div class="q-media">' +
      imgs
        .map(function (img, idx) {
          if (!img) return "";
          if (typeof img === "string") {
            return (
              '<figure class="q-figure">' +
              '<img class="q-img" loading="lazy" src="' +
              escapeHtml(img) +
              '" alt="' +
              escapeHtml("Question image " + String(idx + 1)) +
              '">' +
              "</figure>"
            );
          }

          var src = img.src || img.url || "";
          if (!src) return "";
          var alt = img.alt || "Question image " + String(idx + 1);
          var caption = img.caption || "";
          return (
            '<figure class="q-figure">' +
            '<img class="q-img" loading="lazy" src="' +
            escapeHtml(src) +
            '" alt="' +
            escapeHtml(alt) +
            '">' +
            (caption
              ? '<figcaption class="q-caption">' + escapeHtml(caption) + "</figcaption>"
              : "") +
            "</figure>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function cardHtml(question, qIndex, total) {
    var uid = "q-" + qIndex;
    var opts = Array.isArray(question.options) ? question.options : [];
    var optionsHtml =
      opts.length > 0
        ? '<ol class="q-options">' +
          opts
            .map(function (text, idx) {
              return (
                '<li class="q-option"><span class="opt-letter">' +
                escapeHtml(optionLetter(idx)) +
                '</span><span class="opt-text">' +
                escapeHtml(text) +
                "</span></li>"
              );
            })
            .join("") +
          "</ol>"
        : "";

    var correctDisplay = escapeHtml(resolveCorrectDisplay(question));
    var explanation = question.explanation
      ? '<p class="answer-explain">' +
        escapeHtml(question.explanation) +
        "</p>"
      : "";

    return (
      '<article class="q-card">' +
      '<div class="q-card-head">' +
      '<span class="q-num">Question ' +
      String(qIndex + 1) +
      " / " +
      String(total) +
      "</span>" +
      "</div>" +
      '<p class="q-prompt">' +
      escapeHtml(question.prompt) +
      "</p>" +
      imagesHtml(question) +
      optionsHtml +
      '<div class="answer-wrap" id="' +
      uid +
      '-answer" hidden>' +
      '<div class="answer-inner">' +
      '<p class="answer-line"><strong>Answer:</strong> ' +
      correctDisplay +
      "</p>" +
      explanation +
      "</div>" +
      "</div>" +
      '<button type="button" class="btn btn-secondary reveal-toggle" data-target="' +
      uid +
      '-answer">' +
      "Show answer" +
      "</button>" +
      "</article>"
    );
  }

  function renderPayload(payload, examSlug) {
    if (loadingEl) loadingEl.hidden = true;
    if (!payload || !rootEl || !titleEl) return;

    var questions = Array.isArray(payload.questions) ? payload.questions : [];
    if (!questions.length) {
      titleEl.textContent = payload.examName || payload.title || examSlug;
      if (codeEl) codeEl.textContent = payload.title || payload.id || examSlug;
      if (statsEl) statsEl.textContent = "Coming soon";

      rootEl.innerHTML =
        '<div class="coming-soon-banner">' +
        "<h2>Coming soon</h2>" +
        "<p>This exam page is set up, but questions haven’t been added yet.</p>" +
        "</div>";

      if (errorEl) errorEl.hidden = true;
      if (contentEl) contentEl.hidden = false;
      document.title = (payload.title || examSlug) + " · CertCircuit";
      return;
    }

    titleEl.textContent =
      payload.examName || payload.title || examSlug;
    if (codeEl) codeEl.textContent = payload.title || payload.id || examSlug;
    if (statsEl)
      statsEl.textContent =
        questions.length +
        " question" +
        (questions.length !== 1 ? "s" : "");

    rootEl.innerHTML = questions.map(function (q, i) {
      return cardHtml(q, i, questions.length);
    }).join("");

    if (errorEl) errorEl.hidden = true;
    if (contentEl) contentEl.hidden = false;

    rootEl.querySelectorAll(".reveal-toggle").forEach(function (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-target");
        var panel = document.getElementById(id);
        var hiddenNow = btn.getAttribute("data-shown") === "1";
        if (!panel) return;
        if (hiddenNow) {
          panel.hidden = true;
          btn.textContent = "Show answer";
          btn.classList.remove("is-open");
          btn.setAttribute("data-shown", "0");
          btn.setAttribute("aria-expanded", "false");
        } else {
          panel.hidden = false;
          btn.textContent = "Hide answer";
          btn.classList.add("is-open");
          btn.setAttribute("data-shown", "1");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
    document.title = (payload.title || examSlug) + " · CertCircuit";
  }

  /** Static pages: embed full exam JSON inside the HTML (works with file://, no fetch). */
  var embedded = document.getElementById("embedded-exam-payload");
  if (embedded) {
    try {
      renderPayload(JSON.parse(embedded.textContent), embedded.getAttribute("data-exam-slug") || "");
    } catch (err) {
      showError("Could not parse embedded exam data.");
    }
    return;
  }

  /** Optional fallback: dynamic load via ?exam=id (needs http server). */
  var params = new URLSearchParams(window.location.search);
  var examId = params.get("exam");
  if (!examId) {
    showError(
      "Use a link from the homepage (e.g. exam-dp-700.html)."
    );
    return;
  }

  fetch("data/exams/" + encodeURIComponent(examId) + ".json")
    .then(function (r) {
      if (!r.ok) throw new Error("Could not load questions for “" + examId + "”.");
      return r.json();
    })
    .then(function (payload) {
      renderPayload(payload, examId);
    })
    .catch(function (e) {
      showError(
        e.message ||
          "Could not load questions. Open exam-dp-700.html-style pages from disk, or use a local/web server."
      );
    });
})();
