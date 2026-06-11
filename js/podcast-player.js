/**
 * podcast-player.js
 * CDS Podcast Player – standalone, embeddable, reusable
 *
 * Usage:
 *   1. Include this script on any page that contains:
 *        - A Podcast Player overlay with id="cds-podcast-player"
 *        - Podcast trigger elements with [data-podcast-url], [data-podcast-title],
 *          [data-podcast-cover] attributes
 *   2. Triggers are any element that has a `.mm-podcast__item-link` button
 *      inside a parent `[data-podcast-url]`.
 *
 * Public API (accessible via window.CDSPodcastPlayer):
 *   .open(url, title, cover)  – load and play a new episode
 *   .play()                   – resume playback
 *   .pause()                  – pause playback
 *   .close()                  – close and stop the player
 *   .setVolume(v)             – set volume 0–1
 *   .seek(seconds)            – seek to position
 *   .setSpeed(rate)           – set playback rate
 */

(function () {
  "use strict";

  // ── Speed cycle values ──────────────────────────────────────────────────
  var SPEEDS = [1, 1.25, 1.5, 1.75, 2];

  // ── State ───────────────────────────────────────────────────────────────
  var currentSpeedIndex = 0;
  var isMuted = false;
  var prevVolume = 1;

  // ── Element refs (resolved once DOM is ready) ────────────────────────────
  var player, audio, coverEl, titleEl;
  var btnPlayPause, btnRewind, btnForward, btnMute, btnSpeed, btnClose;
  var seekbar, progressEl, volumeBar, volFillEl, speedValEl;
  var currentTimeEl, durationEl;
  var iconPlay, iconPause, iconVolOn, iconVolOff;

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Format seconds → "m:ss"
   * @param {number} s
   * @returns {string}
   */
  function formatTime(s) {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  /**
   * Sync the custom progress bar width to match a range input value.
   * @param {HTMLInputElement} rangeEl
   * @param {HTMLElement}      fillEl
   */
  function syncFill(rangeEl, fillEl) {
    var pct = ((rangeEl.value - rangeEl.min) / (rangeEl.max - rangeEl.min)) * 100;
    fillEl.style.width = pct + "%";
  }

  /**
   * Sync the play/pause icons of all podcast triggers on the page.
   */
  function syncPagePodcastTriggers() {
    var activeUrl = audio.src;
    var isPlaying = !audio.paused && !audio.ended && audio.src;

    document.querySelectorAll(".mm-podcast__item[data-podcast-url]").forEach(function (item) {
      var url = item.getAttribute("data-podcast-url");
      var img = item.querySelector(".mm-podcast__play img");
      if (!img) return;

      var absoluteUrl = new URL(url, window.location.href).href;

      if (activeUrl === absoluteUrl) {
        if (isPlaying) {
          img.src = "skin/podcast-pause-icon.svg";
          item.classList.add("mm-podcast__item--playing");
          item.classList.remove("mm-podcast__item--paused");
        } else {
          img.src = "skin/podcast-play-icon.svg";
          item.classList.remove("mm-podcast__item--playing");
          item.classList.add("mm-podcast__item--paused");
        }
      } else {
        img.src = "skin/podcast-play-icon.svg";
        item.classList.remove("mm-podcast__item--playing");
        item.classList.remove("mm-podcast__item--paused");
      }
    });
  }

  /** Update play/pause button icons and aria-label */
  function syncPlayPauseUI() {
    var playing = !audio.paused;
    iconPlay.style.display  = playing ? "none"  : "block";
    iconPause.style.display = playing ? "block" : "none";
    btnPlayPause.setAttribute("aria-label", playing ? "Tạm dừng" : "Phát");
    syncPagePodcastTriggers();
  }

  /** Update mute button icons and aria-label */
  function syncMuteUI() {
    iconVolOn.style.display  = isMuted ? "none"  : "block";
    iconVolOff.style.display = isMuted ? "block" : "none";
    btnMute.setAttribute("aria-label", isMuted ? "Bật âm thanh" : "Tắt âm thanh");
  }

  // ── Core API functions ───────────────────────────────────────────────────

  /**
   * Open (and optionally autoplay) a new episode.
   * @param {string} url   – MP3 / audio URL
   * @param {string} title – Episode title
   * @param {string} cover – Cover art image path
   */
  function open(url, title, cover) {
    // Set metadata UI
    coverEl.src = cover || "";
    coverEl.alt = title || "";
    titleEl.textContent = title || "";

    // Load audio
    audio.src = url;
    audio.load();
    audio.play().catch(function () {
      // autoplay blocked – user will need to tap play
    });

    // Show player
    player.classList.add("cds-podcast-player--visible");
    player.setAttribute("aria-hidden", "false");
    syncPlayPauseUI();
  }

  /** Resume playback */
  function play() {
    audio.play();
  }

  /** Pause playback */
  function pause() {
    audio.pause();
  }

  /** Close player – stop audio and hide overlay */
  function close() {
    audio.pause();
    audio.src = "";
    player.classList.remove("cds-podcast-player--visible");
    player.setAttribute("aria-hidden", "true");
    syncPagePodcastTriggers();
  }

  /**
   * Set volume (0–1)
   * @param {number} v
   */
  function setVolume(v) {
    audio.volume = Math.max(0, Math.min(1, v));
    volumeBar.value = audio.volume;
    syncFill(volumeBar, volFillEl);
    if (audio.volume === 0) {
      isMuted = true;
    } else {
      isMuted = false;
      prevVolume = audio.volume;
    }
    syncMuteUI();
  }

  /**
   * Seek to a time in seconds.
   * @param {number} seconds
   */
  function seek(seconds) {
    if (isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(audio.duration, seconds));
    }
  }

  /**
   * Set playback speed.
   * @param {number} rate
   */
  function setSpeed(rate) {
    audio.playbackRate = rate;
    speedValEl.textContent = "x" + rate;
  }

  // ── Event wiring ─────────────────────────────────────────────────────────

  function attachEvents() {
    // Play / Pause
    btnPlayPause.addEventListener("click", function () {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    });

    // Rewind 10 s
    btnRewind.addEventListener("click", function () {
      seek(audio.currentTime - 10);
    });

    // Forward 10 s
    btnForward.addEventListener("click", function () {
      seek(audio.currentTime + 10);
    });

    // Seekbar – drag
    seekbar.addEventListener("input", function () {
      var t = (seekbar.value / 100) * (audio.duration || 0);
      seek(t);
      syncFill(seekbar, progressEl);
    });

    // Volume – drag
    volumeBar.addEventListener("input", function () {
      setVolume(parseFloat(volumeBar.value));
    });

    // Mute toggle
    btnMute.addEventListener("click", function () {
      if (isMuted) {
        isMuted = false;
        audio.volume = prevVolume || 0.8;
        volumeBar.value = audio.volume;
      } else {
        prevVolume = audio.volume;
        isMuted = true;
        audio.volume = 0;
        volumeBar.value = 0;
      }
      syncFill(volumeBar, volFillEl);
      syncMuteUI();
    });

    // Speed cycle
    btnSpeed.addEventListener("click", function () {
      currentSpeedIndex = (currentSpeedIndex + 1) % SPEEDS.length;
      setSpeed(SPEEDS[currentSpeedIndex]);
    });

    // Close
    btnClose.addEventListener("click", function () {
      close();
    });

    // Keyboard: Escape closes the player
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && player.classList.contains("cds-podcast-player--visible")) {
        close();
      }
    });

    // ── Audio element events ──────────────────────────────────────────────

    audio.addEventListener("play",  syncPlayPauseUI);
    audio.addEventListener("pause", syncPlayPauseUI);
    audio.addEventListener("ended", function () {
      syncPlayPauseUI();
    });

    audio.addEventListener("loadedmetadata", function () {
      durationEl.textContent = formatTime(audio.duration);
      seekbar.value = 0;
      syncFill(seekbar, progressEl);
    });

    audio.addEventListener("timeupdate", function () {
      if (!audio.duration) return;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      var pct = (audio.currentTime / audio.duration) * 100;
      seekbar.value = pct;
      syncFill(seekbar, progressEl);
    });
  }

  // ── Bind podcast card triggers ────────────────────────────────────────────

  function bindTriggers() {
    document.querySelectorAll(".mm-podcast__item[data-podcast-url]").forEach(function (item) {
      var btn = item.querySelector(".mm-podcast__item-link");
      if (!btn) return;

      btn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        var url   = item.getAttribute("data-podcast-url")   || "";
        var title = item.getAttribute("data-podcast-title") || "";
        var cover = item.getAttribute("data-podcast-cover") || "";

        var absoluteUrl = new URL(url, window.location.href).href;
        if (audio.src === absoluteUrl) {
          if (audio.paused) {
            audio.play();
          } else {
            audio.pause();
          }
        } else {
          open(url, title, cover);
        }
      });
    });
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  function init() {
    player = document.getElementById("cds-podcast-player");
    if (!player) return; // player not present on this page

    audio      = document.getElementById("pp-audio");
    coverEl    = document.getElementById("pp-cover");
    titleEl    = document.getElementById("pp-title");

    btnPlayPause = document.getElementById("pp-play-pause");
    btnRewind    = document.getElementById("pp-rewind");
    btnForward   = document.getElementById("pp-forward");
    btnMute      = document.getElementById("pp-mute");
    btnSpeed     = document.getElementById("pp-speed");
    btnClose     = document.getElementById("pp-close");

    seekbar     = document.getElementById("pp-seekbar");
    progressEl  = document.getElementById("pp-progress");
    volumeBar   = document.getElementById("pp-volume");
    volFillEl   = document.getElementById("pp-vol-fill");
    speedValEl  = document.getElementById("pp-speed-val");
    currentTimeEl = document.getElementById("pp-current");
    durationEl  = document.getElementById("pp-duration");

    iconPlay   = player.querySelector(".pp-icon-play");
    iconPause  = player.querySelector(".pp-icon-pause");
    iconVolOn  = player.querySelector(".pp-icon-vol-on");
    iconVolOff = player.querySelector(".pp-icon-vol-off");

    // Initial UI state
    iconPause.style.display  = "none";
    iconVolOff.style.display = "none";
    syncFill(volumeBar, volFillEl);

    attachEvents();
    bindTriggers();
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ── Expose public API ────────────────────────────────────────────────────
  window.CDSPodcastPlayer = {
    open:     open,
    play:     play,
    pause:    pause,
    close:    close,
    setVolume: setVolume,
    seek:     seek,
    setSpeed: setSpeed
  };

})();
