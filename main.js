/* ============================================================
   Правовой Партнёр — интерактивность лендинга
   ============================================================ */

(function () {
  "use strict";

  var doc = document;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Утилиты ---------- */
  function $(sel, ctx) {
    return (ctx || doc).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  }

  var toastEl = $("#toast");
  var toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 3600);
  }

  function saveLead(lead) {
    try {
      var key = "pp_leads";
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      lead.date = new Date().toISOString();
      list.push(lead);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      /* хранилище недоступно — молча пропускаем */
    }
  }

  /* ---------- Шапка: тень и подсветка активного пункта ---------- */
  var header = $("#header");
  var navLinks = $$(".nav__link");
  var mobileLinks = $$(".mobile-menu__link");
  var allNavLinks = navLinks.concat(mobileLinks);
  var spyTicking = false;

  function updateOnScroll() {
    spyTicking = false;

    if (header) {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    var probe = window.scrollY + 150;
    var currentId = "top";
    var checked = {};

    allNavLinks.forEach(function (link) {
      var id = (link.getAttribute("href") || "").slice(1);
      if (!id || checked[id]) return;
      checked[id] = true;
      var el = doc.getElementById(id);
      if (!el) return;
      var top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= probe) currentId = id;
    });

    allNavLinks.forEach(function (link) {
      link.classList.toggle("is-active", (link.getAttribute("href") || "") === "#" + currentId);
    });
  }

  function onScroll() {
    if (!spyTicking) {
      spyTicking = true;
      window.requestAnimationFrame(updateOnScroll);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateOnScroll();

  /* ---------- Мобильное меню ---------- */
  var burger = $("#burger");
  var mobileMenu = $("#mobile-menu");

  function setMobileMenu(open) {
    if (!burger || !mobileMenu) return;
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileMenu.hidden = !open;
  }

  function closeMobileMenu() {
    setMobileMenu(false);
  }

  if (burger) {
    burger.addEventListener("click", function () {
      setMobileMenu(mobileMenu.hidden);
    });
  }

  doc.addEventListener("click", function (e) {
    if (mobileMenu && !mobileMenu.hidden && !e.target.closest(".header")) {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1080) closeMobileMenu();
  });

  /* ---------- Плавная прокрутка по якорям ---------- */
  var HEADER_OFFSET = 88;

  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = (link.getAttribute("href") || "").slice(1);
      if (!id) return;
      var target = doc.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu();

      var top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({
        top: Math.max(top, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });

      if (history.replaceState) {
        history.replaceState(null, "", "#" + id);
      }

      target.classList.remove("is-flash");
      void target.offsetWidth;
      target.classList.add("is-flash");
      setTimeout(function () {
        target.classList.remove("is-flash");
      }, 1200);

      updateActiveNow(id);
    });
  });

  function updateActiveNow(id) {
    allNavLinks.forEach(function (link) {
      link.classList.toggle("is-active", (link.getAttribute("href") || "") === "#" + id);
    });
  }

  /* ---------- Модальные окна ---------- */
  var openModalEl = null;
  var lastFocused = null;

  function openModal(name, options) {
    var modal = doc.getElementById("modal-" + name);
    if (!modal) return;
    closeMobileMenu();

    var previous = doc.querySelector(".modal.is-open");
    if (previous && previous !== modal) {
      closeModal(previous, true);
    }

    lastFocused = doc.activeElement;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    doc.body.classList.add("modal-open");
    openModalEl = modal;

    var dialog = $(".modal__dialog", modal);
    if (dialog) {
      dialog.setAttribute("tabindex", "-1");
    }

    var target = null;
    if (options && options.focusSelector) {
      target = $(options.focusSelector, modal);
    }
    if (!target) {
      target = $('input, textarea, button:not(.modal__close)', modal);
    }
    if (target) {
      setTimeout(function () {
        target.focus();
      }, 80);
    } else if (dialog) {
      dialog.focus();
    }
  }

  function closeModal(modal, immediately) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (openModalEl === modal) openModalEl = null;

    if (!doc.querySelector(".modal.is-open")) {
      doc.body.classList.remove("modal-open");
    }

    if (!immediately && modal.id === "modal-request") {
      resetRequestModal();
    }

    if (lastFocused && typeof lastFocused.focus === "function" && !immediately) {
      lastFocused.focus();
    }
  }

  function closeAllModals() {
    $$(".modal.is-open").forEach(function (m) {
      closeModal(m);
    });
  }

  doc.addEventListener("click", function (e) {
    var closeBtn = e.target.closest("[data-modal-close]");
    if (closeBtn) {
      closeModal(closeBtn.closest(".modal"));
      return;
    }
  });

  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var opened = doc.querySelector(".modal.is-open");
      if (opened) {
        closeModal(opened);
      } else {
        closeMobileMenu();
      }
      return;
    }

    if (e.key === "Tab") {
      trapFocus(e);
    }
  });

  function trapFocus(e) {
    var modal = doc.querySelector(".modal.is-open");
    if (!modal) return;
    var dialog = $(".modal__dialog", modal);
    if (!dialog) return;

    var focusables = $$(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      dialog
    ).filter(function (el) {
      return el.offsetParent !== null;
    });

    if (!focusables.length) return;

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- Наполнение модала кейса ---------- */
  function fillCaseModal(card) {
    if (!card) return;
    var img = $("#case-modal-img");
    var tag = $("#case-modal-tag");
    var title = $("#modal-case-title");
    var text = $("#case-modal-text");
    var result = $("#case-modal-result");
    var term = $("#case-modal-term");

    if (img) {
      img.src = card.dataset.caseImg || img.src;
      img.alt = card.dataset.caseTitle || "";
    }
    if (tag) tag.textContent = card.dataset.caseTag || "";
    if (title) title.textContent = card.dataset.caseTitle || "";
    if (text) text.textContent = card.dataset.caseText || "";
    if (result) result.textContent = card.dataset.caseResult || "";
    if (term) term.textContent = card.dataset.caseTerm || "";

    var cta = $("#modal-case .btn--primary");
    if (cta) {
      cta.dataset.comment = "Хочу обсудить похожую ситуацию: " + (card.dataset.caseTitle || "");
    }
  }

  /* ---------- Предзаполнение комментария ---------- */
  var requestComment = $('#request-form textarea[name="comment"]');
  var requestCommentTouched = false;

  if (requestComment) {
    requestComment.addEventListener("input", function () {
      requestCommentTouched = true;
    });
  }

  function prefillComment(text) {
    if (!requestComment || !text) return;
    if (requestCommentTouched && requestComment.value.trim() !== "") return;
    requestComment.value = text;
    requestCommentTouched = false;
  }

  /* ---------- Делегированные клики: открытие модалов ---------- */
  doc.addEventListener("click", function (e) {
    var caseOpen = e.target.closest("[data-case-open]");
    if (caseOpen) {
      fillCaseModal(caseOpen.closest("[data-case]"));
      closeAllModals();
      openModal("case", { focusSelector: ".btn--primary" });
      return;
    }

    var direction = e.target.closest("[data-direction]");
    if (direction) {
      closeAllModals();
      prefillComment("Интересует направление: " + (direction.dataset.direction || ""));
      openModal("request", { focusSelector: 'input[name="name"]' });
      showToast("Оставьте заявку — подберём юриста по направлению");
      return;
    }

    var trigger = e.target.closest("[data-open-modal]");
    if (trigger) {
      var name = trigger.dataset.openModal;
      prefillComment(trigger.dataset.comment || "");
      openModal(name, { focusSelector: name === "request" ? 'input[name="name"]' : null });
    }
  });

  /* Клавиатурная доступность карточек направлений */
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest('.practice-card[data-open-modal]');
    if (card) {
      e.preventDefault();
      card.click();
    }
  });

  /* ---------- Формы ---------- */
  var phoneInput = $('#request-form input[name="phone"]');

  function formatPhone(value) {
    var digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.charAt(0) === "8") digits = "7" + digits.slice(1);
    if (digits.charAt(0) !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);

    var out = "+7";
    if (digits.length > 1) out += " (" + digits.slice(1, 4);
    if (digits.length >= 5) out += ") " + digits.slice(4, 7);
    if (digits.length >= 8) out += "-" + digits.slice(7, 9);
    if (digits.length >= 10) out += "-" + digits.slice(9, 11);
    return out;
  }

  if (phoneInput) {
    phoneInput.addEventListener("input", function () {
      var formatted = formatPhone(phoneInput.value);
      phoneInput.value = formatted;
      clearError(phoneInput.closest(".field"));
    });
  }

  function setError(field, message) {
    if (!field) return;
    var errorEl = $(".field__error", field);
    field.classList.add("is-invalid");
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add("is-visible");
    }
  }

  function clearError(field) {
    if (!field) return;
    var errorEl = $(".field__error", field);
    field.classList.remove("is-invalid");
    if (errorEl) errorEl.classList.remove("is-visible");
  }

  function validateRequestForm(form) {
    var valid = true;

    var name = $('input[name="name"]', form);
    var nameField = name.closest(".field");
    if (!name.value.trim() || name.value.trim().length < 2) {
      setError(nameField, "Укажите ваше имя (минимум 2 символа)");
      valid = false;
    } else {
      clearError(nameField);
    }

    var phoneDigits = phoneInput.value.replace(/\D/g, "");
    if (phoneDigits.length < 11) {
      setError(phoneInput.closest(".field"), "Укажите номер телефона полностью");
      valid = false;
    } else {
      clearError(phoneInput.closest(".field"));
    }

    var consent = $('input[name="consent"]', form);
    var consentBox = consent.closest(".checkbox");
    var consentError = $('[data-error-for="consent"]', form);
    if (!consent.checked) {
      consentBox.classList.add("is-invalid");
      if (consentError) {
        consentError.textContent = "Для отправки нужно согласие на обработку данных";
        consentError.classList.add("is-visible");
      }
      valid = false;
    } else {
      consentBox.classList.remove("is-invalid");
      if (consentError) consentError.classList.remove("is-visible");
    }

    return valid;
  }

  function withLoading(button, action) {
    var original = button.innerHTML;
    button.classList.add("is-loading");
    button.innerHTML = "Отправляем...";
    setTimeout(function () {
      button.classList.remove("is-loading");
      button.innerHTML = original;
      action();
    }, 900);
  }

  /* Заявка из модального окна */
  var requestForm = $("#request-form");

  function resetRequestModal() {
    if (!requestForm) return;
    var modal = $("#modal-request");
    var success = $(".form-success", modal);
    if (success && !success.hidden) {
      success.hidden = true;
      requestForm.hidden = false;
      requestForm.reset();
      requestCommentTouched = false;
      clearError($('input[name="name"]', requestForm).closest(".field"));
      clearError(phoneInput.closest(".field"));
      var consentBox = $(".checkbox", requestForm);
      if (consentBox) consentBox.classList.remove("is-invalid");
    }
  }

  if (requestForm) {
    requestForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateRequestForm(requestForm)) return;

      var submitBtn = $('button[type="submit"]', requestForm);
      withLoading(submitBtn, function () {
        saveLead({
          type: "request",
          name: $('input[name="name"]', requestForm).value.trim(),
          phone: phoneInput.value.trim(),
          message: requestComment ? requestComment.value.trim() : ""
        });

        requestForm.hidden = true;
        var success = $(".form-success", $("#modal-request"));
        if (success) success.hidden = false;
        showToast("Заявка отправлена — скоро свяжемся с вами");
      });
    });

    requestForm.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field) clearError(field);
      var checkbox = e.target.closest(".checkbox");
      if (checkbox) {
        checkbox.classList.remove("is-invalid");
        var err = $('[data-error-for="consent"]', requestForm);
        if (err) err.classList.remove("is-visible");
      }
    });
  }

  /* Форма «Опишите вашу ситуацию» */
  var situationForm = $("#situation-form");

  if (situationForm) {
    situationForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var textarea = $("#situation-text");
      var errorEl = $('[data-error-for="situation"]');

      if (!textarea.value.trim() || textarea.value.trim().length < 10) {
        textarea.classList.add("is-invalid");
        if (errorEl) {
          errorEl.textContent = "Опишите ситуацию чуть подробнее — минимум 10 символов";
          errorEl.classList.add("is-visible");
        }
        textarea.focus();
        return;
      }

      var submitBtn = $('button[type="submit"]', situationForm);
      withLoading(submitBtn, function () {
        saveLead({
          type: "situation",
          message: textarea.value.trim()
        });

        situationForm.hidden = true;
        var success = situationForm.parentElement.querySelector(".form-success");
        if (success) success.hidden = false;
        showToast("Спасибо! Юрист изучит вашу ситуацию");
      });
    });

    situationForm.addEventListener("input", function (e) {
      if (e.target === $("#situation-text")) {
        e.target.classList.remove("is-invalid");
        var errorEl = $('[data-error-for="situation"]');
        if (errorEl) errorEl.classList.remove("is-visible");
      }
    });
  }

  /* Возврат к форме после успеха */
  doc.addEventListener("click", function (e) {
    var resetBtn = e.target.closest("[data-form-reset]");
    if (!resetBtn) return;
    var success = resetBtn.closest(".form-success");
    var form = success ? success.parentElement.querySelector("form") : null;
    if (!success || !form) return;
    success.hidden = true;
    form.hidden = false;
    form.reset();
    showToast("Форма готова — опишите новую ситуацию");
  });

  /* ---------- FAQ ---------- */
  $$(".faq__item").forEach(function (item) {
    var question = $(".faq__question", item);
    if (!question) return;
    question.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      $$(".faq__item.is-open").forEach(function (openItem) {
        openItem.classList.remove("is-open");
        var q = $(".faq__question", openItem);
        if (q) q.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("is-open");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Анимации появления ---------- */
  var revealItems = $$("[data-reveal]");

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var target = entry.target;
            target.classList.add("is-visible");
            revealObserver.unobserve(target);
            setTimeout(function () {
              target.removeAttribute("data-reveal");
              target.style.transitionDelay = "";
            }, 750);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );

    revealItems.forEach(function (el, index) {
      el.style.transitionDelay = Math.min(index % 3, 2) * 0.07 + "s";
      revealObserver.observe(el);
    });
  } else {
    revealItems.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Год в подвале ---------- */
  var yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
