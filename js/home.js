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
  var pubSwiperInstance = null;

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
        // `this` inside each handler is the Swiper instance
        slideChange: function () {
          updatePolicyScrollbar.call(this);
          updatePolicyNav.call(this);
        },
        afterInit: function () {
          updatePolicyScrollbar.call(this);
          updatePolicyNav.call(this);
        },
        transitionEnd: function () {
          updatePolicyScrollbar.call(this);
          updatePolicyNav.call(this);
        },
        reachBeginning: updatePolicyNav,
        reachEnd: updatePolicyNav,
        fromEdge: updatePolicyNav
      }
    };
  }

  function updatePolicyScrollbar() {
    // `this` is the Swiper instance when called as a Swiper event handler
    var thumb = document.getElementById("policy-scrollbar-thumb");
    var track = document.getElementById("policy-pagination");
    if (!thumb || !track || !this || typeof this.progress === "undefined") return;

    var total = this.slides ? this.slides.length : 0;
    if (total <= 0) return;

    var trackWidth = track.offsetWidth;

    // Thumb width represents the visible "viewport" fraction of all slides.
    // With slidesPerView:"auto" we use the Swiper-calculated visibleSlides count,
    // falling back to a reasonable estimate if not available.
    var visibleCount =
      this.visibleSlides && this.visibleSlides.length > 0
        ? this.visibleSlides.length
        : 1;
    var thumbWidth = Math.max(
      Math.round((visibleCount / total) * trackWidth),
      20 // minimum thumb size so it's always visible
    );

    // this.progress goes from 0.0 (beginning) to 1.0 (end) — correct regardless
    // of slidesPerView or how many slides are currently visible.
    var maxOffset = trackWidth - thumbWidth;
    var offset = Math.round(this.progress * maxOffset);

    thumb.style.width = thumbWidth + "px";
    thumb.style.transform = "translateX(" + offset + "px)";

    // Update ARIA
    var pct = Math.round(this.progress * 100);
    track.setAttribute("aria-valuenow", pct);
  }

  // Toggle .hidden on .policy-section__nav wrappers based on swiper edge state.
  // `this` is the Swiper instance when called as a Swiper event handler.
  function updatePolicyNav() {
    if (!this || typeof this.isBeginning === "undefined") return;

    var prevNav = document.querySelector(".policy-section__nav--prev");
    var nextNav = document.querySelector(".policy-section__nav--next");

    if (prevNav) {
      var prevBtn = prevNav.querySelector(".nav-btn");
      if (this.isBeginning) {
        prevNav.classList.add("hidden");
        if (prevBtn) prevBtn.disabled = true;
      } else {
        prevNav.classList.remove("hidden");
        if (prevBtn) prevBtn.disabled = false;
      }
    }

    if (nextNav) {
      var nextBtn = nextNav.querySelector(".nav-btn");
      if (this.isEnd) {
        nextNav.classList.add("hidden");
        if (nextBtn) nextBtn.disabled = true;
      } else {
        nextNav.classList.remove("hidden");
        if (nextBtn) nextBtn.disabled = false;
      }
    }
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
  // Module: Social Swiper (#social-swiper) – dots pagination
  // ---------------------------------------------------------------------------
  var socialSwiperInstance = null;

  function initSocialSwiper() {
    var el = document.getElementById("social-swiper");
    if (!el) return;

    if (socialSwiperInstance && !socialSwiperInstance.destroyed) {
      socialSwiperInstance.destroy(true, true);
      socialSwiperInstance = null;
    }

    var isMobile = window.innerWidth < MOBILE_BP;

    socialSwiperInstance = new Swiper(el, {
      slidesPerView: isMobile ? 1.15 : 4,
      spaceBetween: 16,
      loop: false,
      grabCursor: true,
      observer: true,
      observeParents: true,
      resizeObserver: true,
      a11y: {
        enabled: true,
        prevSlideMessage: "Video tr\u01b0\u1edbc",
        nextSlideMessage: "Video ti\u1ebfp theo"
      },
      on: {
        afterInit: function () {
          var paginationEl = document.getElementById("social-pagination");
          if (paginationEl) setActiveDot(paginationEl, this.activeIndex, false);
        },
        slideChange: function () {
          var paginationEl = document.getElementById("social-pagination");
          if (paginationEl) setActiveDot(paginationEl, this.activeIndex, false);
        }
      }
    });

    // Wire dots to slideTo
    var paginationEl = document.getElementById("social-pagination");
    if (paginationEl) {
      paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
        dot.addEventListener("click", function () {
          socialSwiperInstance.slideTo(i);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Publication Swiper (#pub-swiper) – fraction pagination
  // ---------------------------------------------------------------------------
  function updatePubFraction() {
    // `this` is the Swiper instance
    var currentEl = document.getElementById("pub-current");
    var totalEl = document.getElementById("pub-total");
    var counterEl = document.getElementById("pub-counter");
    if (!currentEl || !totalEl || !this) return;

    var current = (this.realIndex !== undefined ? this.realIndex : this.activeIndex) + 1;
    var total = this.slides ? this.slides.length : 0;

    currentEl.textContent = current;
    totalEl.textContent = " / " + total;

    if (counterEl) {
      counterEl.setAttribute("aria-label", "Trang " + current + " trên " + total);
    }
  }

  function initPubSwiper() {
    var el = document.getElementById("pub-swiper");
    if (!el) return;

    if (pubSwiperInstance && !pubSwiperInstance.destroyed) {
      pubSwiperInstance.destroy(true, true);
      pubSwiperInstance = null;
    }

    pubSwiperInstance = new Swiper(el, {
      slidesPerView: 1,
      loop: false,
      effect: "cube",
      speed: 400,
      grabCursor: true,
      a11y: {
        enabled: true,
        prevSlideMessage: "Ấn phẩm trước",
        nextSlideMessage: "Ấn phẩm tiếp theo"
      },
      on: {
        afterInit: function () {
          updatePubFraction.call(this);
        },
        slideChange: function () {
          updatePubFraction.call(this);
        }
      }
    });

    // Wire custom prev/next buttons
    var prevBtn = document.getElementById("pub-prev");
    var nextBtn = document.getElementById("pub-next");

    if (prevBtn) {
      var prevClone = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(prevClone, prevBtn);
      prevClone.addEventListener("click", function () {
        pubSwiperInstance.slidePrev();
      });
    }

    if (nextBtn) {
      var nextClone = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nextClone, nextBtn);
      nextClone.addEventListener("click", function () {
        pubSwiperInstance.slideNext();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Video Swiper (#video-swiper) – dots pagination (white variant)
  // ---------------------------------------------------------------------------
  var videoSwiperInstance = null;

  function initVideoSwiper() {
    var el = document.getElementById("video-swiper");
    if (!el) return;

    if (videoSwiperInstance && !videoSwiperInstance.destroyed) {
      videoSwiperInstance.destroy(true, true);
      videoSwiperInstance = null;
    }

    videoSwiperInstance = new Swiper(el, {
      slidesPerView: 1,
      loop: false,
      speed: 600,
      grabCursor: true,
      autoplay: { delay: 5000, disableOnInteraction: true },
      a11y: {
        enabled: true,
        prevSlideMessage: "Video tr\u01b0\u1edbc",
        nextSlideMessage: "Video ti\u1ebfp theo"
      },
      on: {
        afterInit: function () {
          var paginationEl = document.getElementById("video-pagination");
          if (paginationEl) setActiveDot(paginationEl, this.activeIndex, true);
        },
        slideChange: function () {
          var paginationEl = document.getElementById("video-pagination");
          if (paginationEl) setActiveDot(paginationEl, this.activeIndex, true);
        }
      }
    });

    // Wire dots to slideTo
    var paginationEl = document.getElementById("video-pagination");
    if (paginationEl) {
      paginationEl.querySelectorAll(".dot").forEach(function (dot, i) {
        dot.addEventListener("click", function () {
          videoSwiperInstance.slideTo(i);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Module: Gallery Swiper (#gallery-swiper)
  // ---------------------------------------------------------------------------
  var gallerySwiperInstance = null;

  function initGallerySwiper() {
    var el = document.getElementById("gallery-swiper");
    if (!el) return;

    if (gallerySwiperInstance && !gallerySwiperInstance.destroyed) {
      gallerySwiperInstance.destroy(true, true);
      gallerySwiperInstance = null;
    }

    var isMobile = window.innerWidth < MOBILE_BP;

    gallerySwiperInstance = new Swiper(el, {
      slidesPerView: isMobile ? 1.2 : 3,
      spaceBetween: 20,
      loop: false,
      grabCursor: true,
      observer: true,
      observeParents: true,
      resizeObserver: true,
      a11y: {
        enabled: true,
        prevSlideMessage: "Ch\u00f9m \u1ea3nh tr\u01b0\u1edbc",
        nextSlideMessage: "Ch\u00f9m \u1ea3nh ti\u1ebfp theo"
      }
    });

    // Wire custom prev/next buttons
    var prevBtn = document.getElementById("gallery-prev");
    var nextBtn = document.getElementById("gallery-next");

    if (prevBtn) {
      var prevClone = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(prevClone, prevBtn);
      prevClone.addEventListener("click", function () {
        gallerySwiperInstance.slidePrev();
      });
    }

    if (nextBtn) {
      var nextClone = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(nextClone, nextBtn);
      nextClone.addEventListener("click", function () {
        gallerySwiperInstance.slideNext();
      });
    }
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
        initGallerySwiper();
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
    initPubSwiper();
    initVideoSwiper();
    initSocialSwiper();
    initGallerySwiper();

    window.addEventListener("resize", onWindowResize);
  });
})();
