document.addEventListener("DOMContentLoaded", function () {
  // Read and apply saved theme state from localStorage
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }

  const elements = document.querySelectorAll("[data-include]");
  elements.forEach(async (el) => {
    const file = el.getAttribute("data-include");
    try {
      const response = await fetch(file);
      if (response.ok) {
        el.innerHTML = await response.text();
        if (file === "modules/header.html") {
          // Instantly sync logo based on theme to prevent visual delay
          const isLight = document.body.classList.contains("light-theme");
          const cdsLogo = el.querySelector(".cds-logo");
          if (cdsLogo) {
            cdsLogo.setAttribute(
              "src",
              isLight ? "skin/cds-logo-dark.svg" : "skin/cds-logo-dark.svg",
            );
          }
          initDynamicHeader();
          initStickyHeader();
        }
      } else {
        console.error(`Không tìm thấy file: ${file}`);
      }
    } catch (err) {
      console.error(err);
    }
  });
});

function initStickyHeader() {
  const header = document.getElementById("site-header");
  const headerTop = document.querySelector(".site-header__top");
  if (!header || !headerTop) return;

  const btnBurger = headerTop.querySelector(".btn-burger");
  if (btnBurger) {
    btnBurger.addEventListener("click", () => {
      const isOpen = btnBurger.classList.toggle("btn-burger--open");
      btnBurger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      header.classList.toggle("site-header--menu-open", isOpen);
      document.body.classList.toggle("no-scroll", isOpen);
    });
  }

  // Close menu when clicking outside (on the overlay)
  document.addEventListener("click", (event) => {
    if (header.classList.contains("site-header--menu-open")) {
      if (!header.contains(event.target)) {
        if (btnBurger) {
          btnBurger.classList.remove("btn-burger--open");
          btnBurger.setAttribute("aria-expanded", "false");
        }
        header.classList.remove("site-header--menu-open");
        document.body.classList.remove("no-scroll");
      }
    }
  });

  const handleScroll = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      headerTop.classList.add("site-header__top--sticky");
      header.classList.add("site-header--sticky");
      return;
    }

    const threshold = header.offsetTop + header.offsetHeight;
    if (window.scrollY > threshold) {
      headerTop.classList.add("site-header__top--sticky");
      header.classList.add("site-header--sticky");
    } else {
      headerTop.classList.remove("site-header__top--sticky");
      header.classList.remove("site-header--sticky");

      // Auto-close expand menu when top bar goes back to non-sticky mode
      if (btnBurger && btnBurger.classList.contains("btn-burger--open")) {
        btnBurger.classList.remove("btn-burger--open");
        btnBurger.setAttribute("aria-expanded", "false");
        header.classList.remove("site-header--menu-open");
        document.body.classList.remove("no-scroll");
      }
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);
  handleScroll();
}

function renderExpandMenu(categories) {
  const menuExpand = document.getElementById("menu-expand");
  if (!menuExpand) return;

  // Render the expand menu container structure (TTXVN info + Categories + Theme toggle)
  menuExpand.innerHTML = `
        <div class="menu-expand__inner">
          <!-- Left side: TTXVN info -->
          <div class="menu-expand__brand">
            <img class="brand-logo" src="skin/logo-TTXVN.png" alt="TTXVN" />
            <div class="brand-text">
              <p class="leading-[1.4] mb-0">Chuyên trang Khoa học, Công nghệ của</p>
              <p class="leading-[1.4]">Thông Tấn Xã Việt Nam</p>
            </div>
          </div>
          
          <div class="menu-expand__divider"></div>
          
          <!-- Center: Categories Grid -->
          <div class="menu-expand__categories">
            <h3 class="categories-title">Tất cả chuyên mục</h3>
            <div class="categories-grid" id="expand-categories-grid"></div>
          </div>
          
          <div class="menu-expand__divider"></div>
          
          <!-- Right: Settings / Theme Selector -->
          <div class="menu-expand__settings">
            <h3 class="settings-title">Chế độ hiển thị</h3>
            <div class="theme-toggle-btn" id="theme-toggle">
              <svg class="theme-icon moon-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="theme-label" id="theme-label">Dark Mode</span>
              <div class="toggle-switch">
                <div class="toggle-switch-handle"></div>
              </div>
            </div>
          </div>
        </div>
      `;

  const grid = document.getElementById("expand-categories-grid");
  if (!grid) return;

  // Custom display order of category IDs for the Expand Menu (1,2,3,4,7,8,5,6,9)
  const customOrder = [1, 2, 3, 4, 7, 8, 5, 6, 9];
  const orderedCategories = [];

  customOrder.forEach((id) => {
    const cat = categories.find((c) => c.id === id);
    if (cat) orderedCategories.push(cat);
  });

  // Fallback: append any newly added categories at the end to prevent missing data
  categories.forEach((cat) => {
    if (!customOrder.includes(cat.id)) {
      orderedCategories.push(cat);
    }
  });

  // Dynamically populate category columns in the configured custom order
  orderedCategories.forEach((cat) => {
    const col = document.createElement("div");
    col.className = "category-col";

    const catTitle = document.createElement("a");
    catTitle.className = "category-col-title";
    catTitle.href = "#";
    catTitle.textContent = cat.title;
    col.appendChild(catTitle);

    if (cat.children && cat.children.length > 0) {
      cat.children.forEach((child) => {
        const childLink = document.createElement("a");
        childLink.className = "category-col-item";
        childLink.href = "#";
        childLink.textContent = child.title;
        col.appendChild(childLink);
      });
    }

    grid.appendChild(col);
  });

  // Wire theme switcher
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    const checkInitialTheme = () => {
      const isLight = document.body.classList.contains("light-theme");
      updateThemeUI(isLight);
    };

    const updateThemeUI = (isLight) => {
      const themeLabel = document.getElementById("theme-label");
      const moonPath = document.querySelector(".moon-icon path");
      const cdsLogo = document.querySelector(".cds-logo");

      if (themeLabel) themeLabel.textContent = "Dark Mode";

      if (isLight) {
        themeToggle.classList.add("theme-toggle-btn--light");
        // if (moonPath) {
        //   moonPath.setAttribute("fill", "#282522");
        //   moonPath.setAttribute("stroke", "#282522");
        // }
        // if (cdsLogo) {
        //   cdsLogo.setAttribute("src", "skin/cds-logo-dark.svg");
        // }
      } else {
        themeToggle.classList.remove("theme-toggle-btn--light");
        // if (moonPath) {
        //   moonPath.setAttribute("fill", "white");
        //   moonPath.setAttribute("stroke", "white");
        // }
        // if (cdsLogo) {
        //   cdsLogo.setAttribute("src", "skin/cds-logo-dark.svg");
        // }
      }
    };

    themeToggle.addEventListener("click", () => {
      const isCurrentlyLight = document.body.classList.contains("light-theme");
      const nextLight = !isCurrentlyLight;

      if (nextLight) {
        document.body.classList.add("light-theme");
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("light-theme");
        localStorage.setItem("theme", "dark");
      }

      updateThemeUI(nextLight);
    });

    checkInitialTheme();
  }
}

async function initDynamicHeader() {
  const navInner = document.querySelector(".site-nav__inner");
  if (!navInner) return;

  try {
    const res = await fetch("modules/category.json");
    if (!res.ok) throw new Error("Could not load categories data");
    const categories = await res.json();

    // Dynamically create and prepend the Trang chủ (home) icon link to avoid DOM timing glitches
    const homeIcon = document.createElement("a");
    homeIcon.className = "site-nav__home-icon";
    homeIcon.href = "#";
    homeIcon.setAttribute("aria-label", "Trang chủ");

    const homeImg = document.createElement("img");
    homeImg.src = "skin/white-home-icon.svg";
    homeImg.alt = "Trang chủ";
    homeIcon.appendChild(homeImg);

    navInner.innerHTML = "";
    navInner.appendChild(homeIcon);

    // Dynamically build category items
    categories.forEach((cat) => {
      const wrapper = document.createElement("div");
      wrapper.className = "site-nav__item-wrapper";

      const itemLink = document.createElement("a");
      itemLink.className = "site-nav__item";
      itemLink.href = "#";

      const span = document.createElement("span");
      span.textContent = cat.title;
      itemLink.appendChild(span);

      // If category has children, append dropdown arrow and generate submenu
      if (cat.children && cat.children.length > 0) {
        const arrow = document.createElement("img");
        arrow.className = "dropdown-arrow";
        arrow.src = "skin/white-arrow-down.svg";
        arrow.alt = "";
        arrow.setAttribute("aria-hidden", "true");
        itemLink.appendChild(arrow);

        const submenu = document.createElement("div");
        submenu.className = "site-nav__submenu";

        cat.children.forEach((child) => {
          const subItem = document.createElement("a");
          subItem.className = "site-nav__submenu-item";
          subItem.href = "#";

          const subSpan = document.createElement("span");
          subSpan.textContent = child.title;
          subItem.appendChild(subSpan);

          const subArrow = document.createElement("img");
          subArrow.className = "submenu-arrow";
          subArrow.src = "skin/black-arrow-right.svg";
          subArrow.alt = "";
          subArrow.setAttribute("aria-hidden", "true");
          subItem.appendChild(subArrow);

          submenu.appendChild(subItem);
        });

        wrapper.appendChild(itemLink);
        wrapper.appendChild(submenu);
      } else {
        wrapper.appendChild(itemLink);
      }

      navInner.appendChild(wrapper);
    });

    // Initialize Mega Menu (Expand Menu)
    renderExpandMenu(categories);
  } catch (err) {
    console.error("Lỗi khi tải hoặc hiển thị menu:", err);
  }
}
