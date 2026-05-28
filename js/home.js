/**
 * home.js – Vanilla JS interactions for the CDS home page
 *
 * Swiper instances:
 *  1. #hero-swiper      – Hero featured news (loop, autoplay, fade)
 *  2. #policy-swiper    – Policy story cards (free-mode horizontal scroll)
 *
 * All instances are initialised after DOMContentLoaded.
 * Destroyed and re-created on window resize breakpoint crossings to ensure
 * correct behaviour between desktop and mobile layouts.
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Guard: abort if Swiper is not loaded
  // ---------------------------------------------------------------------------
  if (typeof Swiper === "undefined") {
    console.warn("[home.js] Swiper is not loaded. Slider functionality disabled.");
    return;
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var MOBILE_BP = 900; // px – matches the responsive breakpoint in home.scss

  // ---------------------------------------------------------------------------
  // Utility: set the active dot in a custom pagination container.
  //
  // `whiteVariant` – when true the active class is `dot--active-white`
  //                  (used in the dark video overlay pagination).
  // ---------------------------------------------------------------------------
  function setActiveDot(dotsEl, activeIndex, whiteVariant) {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll(".dot");
    var activeClass = whiteVariant ? "dot--active-white" : "dot--active";
    var inactiveClass = whiteVariant ? "dot--active" : "dot--active-white";

    dots.forEach(function (dot, i) {
      dot.classList.remove("dot--active", "dot--active-white");
      dot.setAttribute("aria-selected", "false");
      if (i === activeIndex) {
        dot.classList.add(activeClass);
        dot.setAttribute("aria-selected", "true");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Module: Hero Swiper  (#hero-swiper)
  //
  // Layout: fixed-width container (750px desktop → 100% mobile).
  // The slide height is driven by aspect-ratio on the .top-featured__slide.
  // Swiper needs autoHeight OR a concrete height on the container itself –
  // we use autoHeight so any amount of text wrapping is handled gracefully.
  // ---------------------------------------------------------------------------
  var heroSwiperInstance = null;

  function initHeroSwiper() {
    var el = document.getElementById("hero-swiper");
    if (!el) return;

    // Destroy previous instance cleanly before re-creating
    if (heroSwiperInstance && !heroSwiperInstance.destroyed) {
      heroSwiperInstance.destroy(true, true);
      heroSwiperInstance = null;
    }

    var paginationEl = document.getElementById("hero-pagination");

    heroSwiperInstance = new Swiper(el, {
      // Layout
      slidesPerView: 1,
      spaceBetween: 0,
      // Note: height is driven by aspect-ratio on .top-featured__slide-wrapper
      // in CSS – do NOT use autoHeight as it creates a circular reference
      // (slides are height:100% of the container they also try to size).

      // Loop – safe with 3 slides (Swiper dupes them internally)
      loop: true,

      // Autoplay
      autoplay: {
        delay: 5000,
        disableOnInteraction: false, // resume after manual swipe
        pauseOnMouseEnter: true // pause when user hovers
      },

      // Touch / drag
      grabCursor: true,
      touchRatio: 1,
      touchAngle: 45,
      simulateTouch: true,

      // Prevent navigating away when dragging on <a> slides
      preventClicks: true,
      preventClicksPropagation: true,

      // Accessibility
      a11y: {
        enabled: true,
        prevSlideMessage: "Slide trước",
        nextSlideMessage: "Slide tiếp theo"
      },

      // Performance
      observer: true, // re-init if DOM changes inside
      observeParents: true, // re-init if parent changes
      resizeObserver: true, // use ResizeObserver instead of window.resize

      on: {
        // `this` = the Swiper instance; safe even during construction
        slideChange: function () {
          setActiveDot(paginationEl, this.realIndex, false);
        },
        afterInit: function () {
          setActiveDot(paginationEl, this.realIndex, false);
        }
      }
    });

    // Wire custom pagination dots → swiper
    if (paginationEl) {
      paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
        dot.addEventListener("click", function () {
          // slideToLoop maps real index to the looped slide
          heroSwiperInstance.slideToLoop(i);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Policy Swiper  (#policy-swiper)
  //
  // Layout: horizontal row of fixed-width cards (365 × 544 px).
  // slidesPerView:'auto' reads the slide CSS width; Swiper must NOT apply its
  // own flex/gap, so spaceBetween handles the gap instead of CSS gap.
  //
  // On mobile (≤900px) the cards shrink via CSS, so we destroy and re-create
  // with updated spaceBetween on resize.
  // ---------------------------------------------------------------------------
  var policySwiperInstance = null;

  function getPolicyConfig() {
    return {
      // Let CSS define each slide's width (365px desktop / 300px mobile)
      slidesPerView: "auto",
      spaceBetween: 20,

      loop: false,
      centeredSlides: false,
      freeMode: false,

      grabCursor: true,
      touchRatio: 1,

      // Prevent link-click on drag
      preventClicks: true,
      preventClicksPropagation: true,

      // Accessibility
      a11y: {
        enabled: true,
        prevSlideMessage: "Card trước",
        nextSlideMessage: "Card tiếp theo"
      },

      observer: true,
      observeParents: true,
      resizeObserver: true,

      on: {
        // `this` inside updatePolicyDots is the Swiper instance
        slideChange: updatePolicyDots,
        afterInit: updatePolicyDots,
        transitionEnd: updatePolicyDots
      }
    };
  }

  function updatePolicyDots() {
    // `this` is the Swiper instance when called as a Swiper event handler
    var paginationEl = document.getElementById("policy-pagination");
    if (!paginationEl || !this || typeof this.activeIndex === "undefined") return;
    setActiveDot(paginationEl, this.activeIndex, false);
  }

  function initPolicySwiper() {
    var el = document.getElementById("policy-swiper");
    if (!el) return;

    if (policySwiperInstance && !policySwiperInstance.destroyed) {
      policySwiperInstance.destroy(true, true);
      policySwiperInstance = null;
    }

    policySwiperInstance = new Swiper(el, getPolicyConfig());

    // Wire custom prev/next buttons
    var prevBtn = document.getElementById("policy-prev");
    var nextBtn = document.getElementById("policy-next");

    if (prevBtn) {
      // Remove any previous listener by replacing the node
      var prevClone = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(prevClone, prevBtn);
      prevClone.addEventListener("click", function () {
        policySwiperInstance.slidePrev();
      });
    }

    if (nextBtn) {
      var nextClone = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nextClone, nextBtn);
      nextClone.addEventListener("click", function () {
        policySwiperInstance.slideNext();
      });
    }

    // Wire custom pagination dots
    var paginationEl = document.getElementById("policy-pagination");
    if (paginationEl) {
      paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
        dot.addEventListener("click", function () {
          policySwiperInstance.slideTo(i);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Video section – cosmetic pagination only
  // (The video hero is a single static item; dots are decorative)
  // ---------------------------------------------------------------------------
  function initVideoPagination() {
    var paginationEl = document.getElementById("video-pagination");
    if (!paginationEl) return;

    paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        setActiveDot(paginationEl, i, true); // white variant
      });
    });

    // Ensure initial state
    setActiveDot(paginationEl, 0, true);
  }

  // ---------------------------------------------------------------------------
  // Module: Social Hub – cosmetic pagination only
  // ---------------------------------------------------------------------------
  function initSocialPagination() {
    var paginationEl = document.getElementById("social-pagination");
    if (!paginationEl) return;

    paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        setActiveDot(paginationEl, i, false);
      });
    });

    setActiveDot(paginationEl, 0, false);
  }

  // ---------------------------------------------------------------------------
  // Module: Gallery nav – cosmetic prev/next (no swiper needed here)
  // ---------------------------------------------------------------------------
  function initGalleryNav() {
    var prevBtn = document.getElementById("gallery-prev");
    var nextBtn = document.getElementById("gallery-next");
    // Gallery is a static 3-up row; buttons are decorative for now.
    // Wire to a Swiper instance here if the gallery is later converted.
  }

  // ---------------------------------------------------------------------------
  // Responsive re-init
  //
  // When the viewport crosses MOBILE_BP we re-create swiper instances so that
  // layout-dependent options (autoHeight, slide dimensions) recalculate.
  // Debounced to avoid thrashing during drag-resize.
  // ---------------------------------------------------------------------------
  var resizeTimer = null;
  var lastWasMobile = window.innerWidth < MOBILE_BP;

  function onWindowResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var isMobile = window.innerWidth < MOBILE_BP;
      if (isMobile !== lastWasMobile) {
        lastWasMobile = isMobile;
        // Re-create on breakpoint crossing
        initHeroSwiper();
        initPolicySwiper();
      } else {
        // Same breakpoint – just update existing instances
        if (heroSwiperInstance && !heroSwiperInstance.destroyed) {
          heroSwiperInstance.update();
        }
        if (policySwiperInstance && !policySwiperInstance.destroyed) {
          policySwiperInstance.update();
        }
      }
    }, 150);
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {
    initHeroSwiper();
    initPolicySwiper();
    initVideoPagination();
    initSocialPagination();
    initGalleryNav();

    window.addEventListener("resize", onWindowResize);
  });
})();
