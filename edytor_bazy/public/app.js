let state = {
  products: [],
  headProducts: [],
  selectedProduct: null,
  isNewProduct: false,
  config: {},
};

const elements = {
  productsList: document.getElementById("products-list-container"),
  searchVal: document.getElementById("search-input"),
  filterAll: document.getElementById("filter-all"),
  filterActive: document.getElementById("filter-active"),
  filterInactive: document.getElementById("filter-inactive"),

  btnAddProduct: document.getElementById("btn-add-product"),
  btnPull: document.getElementById("btn-pull"),
  btnPushPanel: document.getElementById("btn-push-panel"),
  btnSettings: document.getElementById("btn-settings"),
  btnShowGit: document.getElementById("btn-show-git"),

  btnToggleSidebar: document.getElementById("btn-toggle-sidebar"),
  sidebar: document.querySelector(".sidebar"),
  sidebarResizer: document.getElementById("sidebar-resizer"),
  appContainer: document.querySelector(".app-container"),

  productForm: document.getElementById("product-form"),
  actionBreadcrumb: document.getElementById("current-action-breadcrumb"),

  settingsModal: document.getElementById("settings-modal"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  btnSaveSettings: document.getElementById("btn-save-settings"),

  gitModal: document.getElementById("git-modal"),
  btnCloseGit: document.getElementById("btn-close-git"),
  btnExecutePush: document.getElementById("btn-execute-push"),
  btnExecutePull: document.getElementById("btn-execute-pull"),
  btnClearConsole: document.getElementById("btn-clear-console"),
  gitConsoleOutput: document.getElementById("git-console-output"),
  gitCommitMsgInput: document.getElementById("git-commit-msg"),
  gitInfoText: document.getElementById("git-info-text"),

  imageDragZone: document.getElementById("image-drag-zone"),
  imageFileInput: document.getElementById("image-file-input"),
  imagesSortContainer: document.getElementById("images-sort-container"),
  imagesCountBadge: document.getElementById("images-count-badge"),
  manualImgUrl: document.getElementById("manual-img-url"),
  btnAddManualUrl: document.getElementById("btn-add-manual-url"),

  tabTriggers: document.querySelectorAll(".tab-trigger"),
  tabPanels: document.querySelectorAll(".tab-panel"),

  colorsContainer: document.getElementById("colors-list-container"),
  btnAddColor: document.getElementById("btn-add-color"),
  variantsContainer: document.getElementById("variants-list-container"),
  btnAddVariant: document.getElementById("btn-add-variant"),

  specsContainer: document.getElementById("specs-list-container"),
  btnAddSpec: document.getElementById("btn-add-spec"),

  pId: document.getElementById("p-id"),
  pTitle: document.getElementById("p-title"),
  pActive: document.getElementById("p-active"),
  pAvailable: document.getElementById("p-available"),
  pPrice: document.getElementById("p-price"),
  pOldPrice: document.getElementById("p-old-price"),
  pBreadcrumbs: document.getElementById("p-breadcrumbs"),
  pConfigMode: document.getElementById("p-config-mode"),
  pAllegroLink: document.getElementById("p-allegro-link"),
  pCultsLink: document.getElementById("p-cults-link"),
  pShortDesc: document.getElementById("p-short-desc"),
  pLongDesc: document.getElementById("p-long-desc"),

  btnOpenBloggerLink: document.getElementById("btn-open-blogger-link"),
  btnDeleteProduct: document.getElementById("btn-delete-product"),
  btnDuplicateProduct: document.getElementById("btn-duplicate-product"),
  btnDiscard: document.getElementById("btn-discard"),
  btnSaveProduct: document.getElementById("btn-save-product"),

  setJsonPath: document.getElementById("set-json-path"),
  setImagesPath: document.getElementById("set-images-path"),
  setGithubUser: document.getElementById("set-github-user"),
  setGithubRepo: document.getElementById("set-github-repo"),
  setGithubBranch: document.getElementById("set-github-branch"),
  setImagePattern: document.getElementById("set-image-pattern"),
  setBloggerUrl: document.getElementById("set-blogger-url"),

  pLongDescPreview: document.getElementById("p-long-desc-preview"),
  templateSelect: document.getElementById("template-select"),
  btnSaveAsTemplate: document.getElementById("btn-save-as-template"),
};

let activeFilter = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
  await loadConfig();
  await loadProducts();
  await fetchTemplates();
  setupEventListeners();
});

async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    state.config = await res.json();
    updateGitBadge();
  } catch (err) {
    console.error("Error loading config:", err);
    logToConsole("Błąd połączenia z serwerem przy ładowaniu konfiguracji.");
  }
}

async function loadProducts() {
  try {
    const res = await fetch("/api/products");
    state.products = await res.json();

    try {
      const headRes = await fetch("/api/git-head-products");
      state.headProducts = await headRes.json();
    } catch (headErr) {
      console.warn("Failed to load HEAD products for side indicators:", headErr);
      state.headProducts = [];
    }

    renderProductsList();
  } catch (err) {
    console.error("Error loading products:", err);
    elements.productsList.innerHTML = `<div class="loading-state text-danger">Nie udało się wczytać produktów. Upewnij się, że plik JSON istnieje w podanej ścieżce.</div>`;
  }
}

function updateGitBadge() {
  if (state.config.githubUser && state.config.githubRepo) {
    elements.gitInfoText.innerText = `GitHub: ${state.config.githubUser}/${state.config.githubRepo} (${state.config.githubBranch})`;
  } else {
    elements.gitInfoText.innerText = `Git: nie skonfigurowano`;
  }
}

function setupEventListeners() {
  elements.btnToggleSidebar.addEventListener("click", toggleSidebar);
  setupSidebarResizer();

  elements.searchVal.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderProductsList();
  });

  elements.filterAll.addEventListener("click", () => setFilter("all"));
  elements.filterActive.addEventListener("click", () => setFilter("active"));
  elements.filterInactive.addEventListener("click", () =>
    setFilter("inactive"),
  );

  elements.btnAddProduct.addEventListener("click", () => createNewProduct());

  elements.pLongDesc.addEventListener("input", updateLongDescPreview);
  elements.templateSelect.addEventListener("change", loadSelectedTemplate);
  elements.btnSaveAsTemplate.addEventListener("click", saveAsTemplate);

  elements.btnSettings.addEventListener("click", openSettingsModal);
  elements.btnCloseSettings.addEventListener("click", () =>
    elements.settingsModal.classList.remove("active"),
  );
  elements.btnSaveSettings.addEventListener("click", saveSettings);

  elements.btnShowGit.addEventListener("click", () => openGitModal("pull"));
  elements.btnPull.addEventListener("click", () => openGitModal("pull"));
  elements.btnPushPanel.addEventListener("click", () => openGitModal("push"));
  elements.btnCloseGit.addEventListener("click", () =>
    elements.gitModal.classList.remove("active"),
  );
  elements.btnClearConsole.addEventListener(
    "click",
    () => (elements.gitConsoleOutput.innerHTML = ""),
  );

  elements.btnExecutePull.addEventListener("click", executePull);
  elements.btnExecutePush.addEventListener("click", executePush);

  elements.tabTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      elements.tabTriggers.forEach((t) => t.classList.remove("active"));
      elements.tabPanels.forEach((p) => p.classList.remove("active"));

      e.target.classList.add("active");
      const targetId = e.target.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });

  elements.imageDragZone.addEventListener("click", () =>
    elements.imageFileInput.click(),
  );
  elements.imageFileInput.addEventListener("change", handleImageFileSelect);

  elements.imageDragZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    elements.imageDragZone.classList.add("dragover");
  });
  elements.imageDragZone.addEventListener("dragleave", () => {
    elements.imageDragZone.classList.remove("dragover");
  });
  elements.imageDragZone.addEventListener("drop", handleImageDrop);

  elements.btnAddManualUrl.addEventListener("click", addManualImageUrl);

  elements.btnAddColor.addEventListener("click", () => addColorRow());
  elements.btnAddVariant.addEventListener("click", () => addVariantRow());
  elements.btnAddSpec.addEventListener("click", () => addSpecRow());

  elements.btnDiscard.addEventListener("click", discardChanges);
  elements.productForm.addEventListener("submit", saveProduct);
  elements.btnDeleteProduct.addEventListener("click", deleteProduct);
  elements.btnDuplicateProduct.addEventListener("click", duplicateProduct);

  elements.btnOpenBloggerLink.addEventListener("click", () => {
    if (state.selectedProduct && state.selectedProduct.id) {
      const url = `${state.config.bloggerProductBaseUrl}?id=${state.selectedProduct.id}`;
      window.open(url, "_blank");
    }
  });
}

function setFilter(filter) {
  activeFilter = filter;
  elements.filterAll.classList.remove("active");
  elements.filterActive.classList.remove("active");
  elements.filterInactive.classList.remove("active");

  if (filter === "all") elements.filterAll.classList.add("active");
  if (filter === "active") elements.filterActive.classList.add("active");
  if (filter === "inactive") elements.filterInactive.classList.add("active");

  renderProductsList();
}

function renderProductsList() {
  let filtered = state.products;

  if (searchQuery) {
    filtered = filtered.filter(
      (p) =>
        (p.id && p.id.toLowerCase().includes(searchQuery)) ||
        (p.meta &&
          p.meta.title &&
          p.meta.title.toLowerCase().includes(searchQuery)),
    );
  }

  if (activeFilter === "active") {
    filtered = filtered.filter((p) => p.active === true);
  } else if (activeFilter === "inactive") {
    filtered = filtered.filter((p) => p.active === false);
  }

  if (filtered.length === 0) {
    elements.productsList.innerHTML = `<div class="loading-state">Brak produktów spełniających kryteria.</div>`;
    return;
  }

  elements.productsList.innerHTML = filtered
    .map((p) => {
      const isSelected =
        state.selectedProduct && state.selectedProduct.id === p.id;
      const thumb = p.images && p.images.length > 0 ? p.images[0] : "";
      const title = p.meta && p.meta.title ? p.meta.title : "Brak nazwy";
      const price = p.meta && p.meta.price ? p.meta.price : "Brak ceny";
      const activeClass = isSelected ? "active" : "";

      const changeStatus = getProductChangeStatus(p);
      let changeClass = "";
      let changeTagHtml = "";
      let changeDotHtml = "";

      if (changeStatus === "new") {
        changeClass = "is-new";
        changeTagHtml = `<span class="change-tag change-tag-new">Nowy</span>`;
        changeDotHtml = `<span class="product-change-dot dot-new" title="Nowy produkt (niezsynchronizowany)"></span>`;
      } else if (changeStatus === "modified") {
        changeClass = "is-modified";
        changeTagHtml = `<span class="change-tag change-tag-modified">Zmieniony</span>`;
        changeDotHtml = `<span class="product-change-dot dot-modified" title="Zmieniony lokalnie (niezsynchronizowany)"></span>`;
      }

      return `
      <div class="product-item ${activeClass} ${changeClass}" onclick="selectProductById('${p.id}')">
        ${changeDotHtml}
        ${thumb ? `<img src="${thumb}" class="product-thumb" alt="">` : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;background:#282e3d;">📦</div>`}
        <div class="product-info">
          <div class="product-id-title">
            <span class="prod-id-badge">${p.id}</span>
            <span class="prod-title-text" title="${title}">${title}</span>
            ${changeTagHtml}
          </div>
          <div class="product-meta-row">
            <span class="prod-price-text">${price}</span>
            <span class="status-indicator ${p.active ? "status-active" : "status-inactive"}">
              ${p.active ? "Aktywny" : "Ukryty"}
            </span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function selectProductById(id) {
  const prod = state.products.find((p) => p.id === id);
  if (prod) {
    selectProduct(prod, false);
  }
}
window.selectProductById = selectProductById;

function selectProduct(product, isNew = false) {
  state.selectedProduct = JSON.parse(JSON.stringify(product));
  state.isNewProduct = isNew;

  elements.productForm.classList.remove("hidden");

  elements.actionBreadcrumb.innerText = isNew
    ? "Nowy produkt"
    : `Edycja produktu #${product.id}`;

  elements.tabTriggers[0].click();

  elements.pId.value = product.id || "";
  elements.pId.disabled = !isNew;
  elements.pTitle.value = (product.meta && product.meta.title) || "";
  elements.pActive.checked = product.active !== false;
  elements.pAvailable.checked =
    (product.meta && product.meta.isAvailable) !== false;
  elements.pPrice.value = (product.meta && product.meta.price) || "";
  elements.pOldPrice.value = (product.meta && product.meta.oldPrice) || "";

  const breadcrumbs = (product.meta && product.meta.breadcrumbs) || [];
  elements.pBreadcrumbs.value = breadcrumbs.join(", ");

  elements.pConfigMode.value =
    (product.config && product.config.mode) || "mode-both";
  elements.pAllegroLink.value =
    (product.config && product.config.allegroLink) || "";
  elements.pCultsLink.value =
    (product.config && product.config.cultsLink) || "";

  elements.pShortDesc.value =
    (product.content && product.content.shortDescription) || "";
  elements.pLongDesc.value =
    (product.content && product.content.longDescription) || "";
  updateLongDescPreview();

  renderFormImages();

  renderFormColors();

  renderFormVariants();

  renderFormSpecs();

  elements.btnDeleteProduct.style.display = isNew ? "none" : "inline-flex";
  elements.btnDuplicateProduct.style.display = isNew ? "none" : "inline-flex";
  elements.btnOpenBloggerLink.disabled = isNew || !product.id;

  renderProductsList();
}

function createNewProduct() {
  const nextId = getNextAvailableId();
  const emptyProduct = {
    id: nextId,
    active: true,
    meta: {
      breadcrumbs: ["Druk 3D"],
      title: "",
      price: "",
      oldPrice: null,
      isAvailable: true,
    },
    config: {
      mode: "mode-both",
      allegroLink: "",
      cultsLink: "",
    },
    images: [],
    content: {
      shortDescription: "",
      longDescription: "",
    },
    variants: [],
    colors: [],
    specs: {
      Technologia: "FDM 3D",
      Materiał: "PLA Bio-Polimer",
      Producent: "Rzeczy Od Ręki",
    },
  };

  selectProduct(emptyProduct, true);
}

function getNextAvailableId() {
  if (state.products.length === 0) return "001";

  const ids = state.products
    .map((p) => parseInt(p.id, 10))
    .filter((n) => !isNaN(n));

  if (ids.length === 0) return "001";

  const maxId = Math.max(...ids);
  return String(maxId + 1).padStart(3, "0");
}

function discardChanges() {
  if (confirm("Czy na pewno chcesz odrzucić niezapisane zmiany?")) {
    elements.productForm.classList.add("hidden");
    state.selectedProduct = null;
    elements.actionBreadcrumb.innerText = "Brak wybranego produktu";
    renderProductsList();
  }
}

function renderFormImages() {
  const images = state.selectedProduct.images || [];
  elements.imagesCountBadge.innerText = `${images.length} zdjęć`;

  if (images.length === 0) {
    elements.imagesSortContainer.innerHTML = `<div class="empty-state">Brak dodanych zdjęć. Przeciągnij pliki powyżej lub dodaj adres URL ręcznie.</div>`;
    return;
  }

  elements.imagesSortContainer.innerHTML = images
    .map((url, idx) => {
      return `
      <div class="image-sort-item" data-index="${idx}">
        <span class="image-index-badge">${idx + 1}</span>
        <img src="${url}" class="sort-item-preview" alt="" onerror="this.src='https://placehold.co/100x100?text=Błąd'">
        <span class="sort-item-url" title="${url}">${url}</span>
        <div class="sort-actions">
          <button type="button" class="btn btn-icon btn-small" onclick="moveImage(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Przesuń w górę">▲</button>
          <button type="button" class="btn btn-icon btn-small" onclick="moveImage(${idx}, 1)" ${idx === images.length - 1 ? "disabled" : ""} title="Przesuń w dół">▼</button>
          <button type="button" class="btn btn-icon btn-small btn-danger" onclick="deleteImage(${idx})" title="Usuń zdjęcie">&times;</button>
        </div>
      </div>
    `;
    })
    .join("");
}

async function uploadImageFile(file, targetIndex) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("productId", state.selectedProduct.id);
  formData.append("index", targetIndex + 1);

  try {
    const res = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      return data.url;
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast(`Wgrywanie zdjęcia nie powiodło się: ${err.message}`, "danger");
    return null;
  }
}

async function handleImageFileSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  await processImageFiles(files);
  elements.imageFileInput.value = "";
}

async function handleImageDrop(e) {
  e.preventDefault();
  elements.imageDragZone.classList.remove("dragover");

  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.type.startsWith("image/"),
  );
  if (files.length === 0) return;

  await processImageFiles(files);
}

async function processImageFiles(files) {
  if (!state.selectedProduct.id) {
    showToast("Ustal ID produktu przed dodaniem zdjęć!", "warning");
    return;
  }

  const initialIndex = state.selectedProduct.images.length;

  elements.imagesSortContainer.innerHTML += `<div class="loading-state" id="upload-loader">Wgrywanie zdjęć...</div>`;

  for (let i = 0; i < files.length; i++) {
    const url = await uploadImageFile(files[i], initialIndex + i);
    if (url) {
      state.selectedProduct.images.push(url);
    }
  }

  const loader = document.getElementById("upload-loader");
  if (loader) loader.remove();

  renderFormImages();
}

function addManualImageUrl() {
  const url = elements.manualImgUrl.value.trim();
  if (!url) return;

  if (!state.selectedProduct.images) state.selectedProduct.images = [];
  state.selectedProduct.images.push(url);
  elements.manualImgUrl.value = "";
  renderFormImages();
}

window.deleteImage = function (index) {
  state.selectedProduct.images.splice(index, 1);
  renderFormImages();
};

window.moveImage = function (index, direction) {
  const images = state.selectedProduct.images;
  const targetIndex = index + direction;

  if (targetIndex >= 0 && targetIndex < images.length) {
    const temp = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = temp;
    renderFormImages();
  }
};

function renderFormColors() {
  const colors = state.selectedProduct.colors || [];

  if (colors.length === 0) {
    elements.colorsContainer.innerHTML = `<div class="empty-state">Brak przypisanych kolorów.</div>`;
    return;
  }

  elements.colorsContainer.innerHTML = colors
    .map((c, idx) => {
      return `
      <div class="editor-row-item" data-index="${idx}">
        <input type="color" class="color-input-picker" value="${c.hex || "#ffffff"}" onchange="updateColorHex(${idx}, this.value)">
        <input type="text" placeholder="Nazwa koloru (np. Czarny)" value="${c.name || ""}" onchange="updateColorName(${idx}, this.value)" style="flex:2;">
        <input type="text" placeholder="Slajd (np. 1)" value="${c.slideIndex || 1}" onchange="updateColorSlide(${idx}, this.value)" style="flex:1; text-align:center;">
        <button type="button" class="btn btn-icon-only btn-danger" onclick="deleteColor(${idx})" style="width:36px; height:36px;">&times;</button>
      </div>
    `;
    })
    .join("");
}

function addColorRow() {
  if (!state.selectedProduct.colors) state.selectedProduct.colors = [];

  state.selectedProduct.colors.push({
    name: "Biały",
    hex: "#ffffff",
    slideIndex: 1,
  });
  renderFormColors();
}

window.deleteColor = function (index) {
  state.selectedProduct.colors.splice(index, 1);
  renderFormColors();
};

window.updateColorHex = function (index, val) {
  state.selectedProduct.colors[index].hex = val;
};

window.updateColorName = function (index, val) {
  state.selectedProduct.colors[index].name = val;
};

window.updateColorSlide = function (index, val) {
  state.selectedProduct.colors[index].slideIndex = parseInt(val, 10) || 1;
};

function renderFormVariants() {
  const variants = state.selectedProduct.variants || [];

  if (variants.length === 0) {
    elements.variantsContainer.innerHTML = `<div class="empty-state">Brak zdefiniowanych wariantów.</div>`;
    return;
  }

  elements.variantsContainer.innerHTML = variants
    .map((v, idx) => {
      return `
      <div class="editor-row-item" data-index="${idx}" style="flex-direction:column; align-items:stretch; gap:6px; padding:12px; background:var(--bg-app); border-radius:6px; border:1px solid var(--color-border);">
        <div style="display:flex; gap:8px;">
          <input type="text" placeholder="Nazwa (np. Mniejszy)" value="${v.name || ""}" onchange="updateVariantName(${idx}, this.value)" style="flex:2;">
          <div style="display:flex; align-items:center; gap:6px; flex:1; justify-content:flex-end;">
            <label class="switch-container" style="transform: scale(0.85);">
              <input type="checkbox" ${v.isCurrent ? "checked" : ""} onchange="updateVariantCurrent(${idx}, this.checked)">
              <span class="slider"></span>
            </label>
            <span style="font-size:11px; white-space:nowrap;">Obecny</span>
          </div>
          <button type="button" class="btn btn-icon-only btn-danger" onclick="deleteVariant(${idx})" style="width:36px; height:36px;">&times;</button>
        </div>
        <input type="text" placeholder="Link podstrony Bloggera (np. ?id=004 lub # dla obecnego)" value="${v.link || ""}" onchange="updateVariantLink(${idx}, this.value)">
        <input type="url" placeholder="Miniaturka (URL zdjęcia wariantu)" value="${v.image || ""}" onchange="updateVariantImage(${idx}, this.value)">
      </div>
    `;
    })
    .join("");
}

function addVariantRow() {
  if (!state.selectedProduct.variants) state.selectedProduct.variants = [];

  state.selectedProduct.variants.push({
    name: "Klasyczny",
    image:
      state.selectedProduct.images && state.selectedProduct.images.length > 0
        ? state.selectedProduct.images[0]
        : "",
    link: "#",
    isCurrent: state.selectedProduct.variants.length === 0,
  });
  renderFormVariants();
}

window.deleteVariant = function (index) {
  state.selectedProduct.variants.splice(index, 1);
  renderFormVariants();
};

window.updateVariantName = function (index, val) {
  state.selectedProduct.variants[index].name = val;
};

window.updateVariantLink = function (index, val) {
  state.selectedProduct.variants[index].link = val;
};

window.updateVariantImage = function (index, val) {
  state.selectedProduct.variants[index].image = val;
};

window.updateVariantCurrent = function (index, checked) {
  if (checked) {
    state.selectedProduct.variants.forEach((v, idx) => {
      v.isCurrent = idx === index;
    });
  } else {
    state.selectedProduct.variants[index].isCurrent = false;
  }
  renderFormVariants();
};

function renderFormSpecs() {
  const specs = state.selectedProduct.specs || {};
  elements.specsContainer.innerHTML = "";

  const keys = Object.keys(specs);
  if (keys.length === 0) {
    elements.specsContainer.innerHTML = `<tr><td colspan="3" class="empty-state">Brak wpisów w specyfikacji. Kliknij przycisk powyżej, aby dodać parametry.</td></tr>`;
    return;
  }

  keys.forEach((key) => {
    const value = specs[key];
    addSpecRowDOM(key, value);
  });
}

function addSpecRowDOM(key = "", value = "") {
  const emptyRow = elements.specsContainer.querySelector(".empty-state");
  if (emptyRow) {
    elements.specsContainer.innerHTML = "";
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="spec-key" placeholder="np. Materiał" value="${key}"></td>
    <td><input type="text" class="spec-value" placeholder="np. PLA Premium" value="${value}"></td>
    <td>
      <button type="button" class="btn btn-icon-only btn-danger" onclick="deleteSpecRow(this)" style="width:36px; height:36px; margin:auto; display:flex;">&times;</button>
    </td>
  `;
  elements.specsContainer.appendChild(tr);
}

function addSpecRow() {
  addSpecRowDOM("", "");
}

window.deleteSpecRow = function (btn) {
  const tr = btn.closest("tr");
  tr.remove();

  if (elements.specsContainer.children.length === 0) {
    elements.specsContainer.innerHTML = `<tr><td colspan="3" class="empty-state">Brak wpisów w specyfikacji. Kliknij przycisk powyżej, aby dodać parametry.</td></tr>`;
  }
};

window.insertHtmlTag = function (tag) {
  const textarea = elements.pLongDesc;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  let insertion = "";

  switch (tag) {
    case "p":
      insertion = `<p>${selectedText || "Akapit opisu..."}</p>`;
      break;
    case "strong":
      insertion = `<strong>${selectedText || "pogrubienie"}</strong>`;
      break;
    case "h4":
      insertion = `<h4 class="text-md font-bold mt-6 mb-2">${selectedText || "Tytuł sekcji"}</h4>`;
      break;
    case "checklist":
      insertion = `<ul class="check-list mb-6">\n  <li>${selectedText || "Pierwsza zaleta..."}</li>\n  <li>Kolejna zaleta...</li>\n</ul>`;
      break;
    case "imgbox":
      insertion = `<div class="my-8 rounded-xl overflow-hidden shadow-lg">\n  <img src="${selectedText || "https://raw.githubusercontent.com/.../nazwa_zdjecia.jpg"}" class="w-full h-auto">\n  <p class="text-xs text-center py-2 bg-gray-50 text-gray-500 border-t border-gray-100">Krótki podpis pod zdjęciem</p>\n</div>`;
      break;
  }

  textarea.value = text.substring(0, start) + insertion + text.substring(end);
  textarea.focus();

  textarea.setSelectionRange(start, start + insertion.length);
};

async function saveProduct(e) {
  if (e) e.preventDefault();

  const id = elements.pId.value.trim();
  const title = elements.pTitle.value.trim();

  if (!id || !title) {
    showToast("ID oraz Tytuł są wymaganymi polami.", "warning");
    return;
  }

  if (state.isNewProduct && state.products.some((p) => p.id === id)) {
    showToast("Produkt o podanym ID już istnieje w bazie! Wybierz inne ID.", "warning");
    return;
  }

  const specs = {};
  const specRows = elements.specsContainer.querySelectorAll("tr");
  specRows.forEach((row) => {
    const keyInput = row.querySelector(".spec-key");
    const valInput = row.querySelector(".spec-value");
    if (keyInput && valInput) {
      const k = keyInput.value.trim();
      const v = valInput.value.trim();
      if (k && v) {
        specs[k] = v;
      }
    }
  });

  const breadcrumbsStr = elements.pBreadcrumbs.value.trim();
  const breadcrumbs = breadcrumbsStr
    ? breadcrumbsStr
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean)
    : [];

  const productData = {
    id: id,
    active: elements.pActive.checked,
    meta: {
      breadcrumbs: breadcrumbs,
      title: title,
      price: elements.pPrice.value.trim(),
      oldPrice: elements.pOldPrice.value.trim() || null,
      isAvailable: elements.pAvailable.checked,
    },
    config: {
      mode: elements.pConfigMode.value,
      allegroLink: elements.pAllegroLink.value.trim(),
      cultsLink: elements.pCultsLink.value.trim(),
    },

    images: state.selectedProduct.images || [],
    content: {
      shortDescription: elements.pShortDesc.value.trim(),
      longDescription: elements.pLongDesc.value.trim(),
    },

    colors: state.selectedProduct.colors || [],
    variants: state.selectedProduct.variants || [],
    specs: specs,
  };

  let updatedProducts = [...state.products];
  if (state.isNewProduct) {
    updatedProducts.push(productData);
  } else {
    const idx = updatedProducts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      updatedProducts[idx] = productData;
    } else {
      updatedProducts.push(productData);
    }
  }

  updatedProducts.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProducts, null, 2),
    });

    const result = await res.json();
    if (result.success) {
      showToast("Produkt został pomyślnie zapisany w bazie JSON!", "success");
      state.products = updatedProducts;
      state.isNewProduct = false;
      state.selectedProduct = productData;

      selectProduct(productData, false);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    showToast(`Zapisywanie bazy nie powiodło się: ${err.message}`, "danger");
  }
}

async function deleteProduct() {
  const prod = state.selectedProduct;
  if (!prod || !prod.id) return;

  if (
    !confirm(
      `Czy na pewno chcesz bezpowrotnie usunąć produkt "${prod.meta.title}" (ID: ${prod.id})?`,
    )
  ) {
    return;
  }

  const updatedProducts = state.products.filter((p) => p.id !== prod.id);

  try {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProducts, null, 2),
    });

    const result = await res.json();
    if (result.success) {
      showToast("Produkt został usunięty z bazy produktów.", "success");
      state.products = updatedProducts;
      state.selectedProduct = null;
      elements.productForm.classList.add("hidden");
      elements.actionBreadcrumb.innerText = "Brak wybranego produktu";
      renderProductsList();
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    showToast(`Usuwanie produktu nie powiodło się: ${err.message}`, "danger");
  }
}

function duplicateProduct() {
  if (!state.selectedProduct) return;

  const clone = JSON.parse(JSON.stringify(state.selectedProduct));

  const nextId = getNextAvailableId();
  clone.id = nextId;
  clone.meta.title = clone.meta.title + " (Kopia)";

  selectProduct(clone, true);
  showToast(
    `Utworzono kopię. Popraw ID i tytuł produktu, a następnie kliknij 'Zapisz produkt'.`,
    "info",
  );
}

function openSettingsModal() {
  elements.setJsonPath.value = state.config.jsonFilePath || "";
  elements.setImagesPath.value = state.config.imagesDirPath || "";
  elements.setGithubUser.value = state.config.githubUser || "";
  elements.setGithubRepo.value = state.config.githubRepo || "";
  elements.setGithubBranch.value = state.config.githubBranch || "";
  elements.setImagePattern.value = state.config.imageNamingPattern || "";
  elements.setBloggerUrl.value = state.config.bloggerProductBaseUrl || "";

  elements.settingsModal.classList.add("active");
}

async function saveSettings() {
  const updatedConfig = {
    jsonFilePath: elements.setJsonPath.value.trim(),
    imagesDirPath: elements.setImagesPath.value.trim(),
    githubUser: elements.setGithubUser.value.trim(),
    githubRepo: elements.setGithubRepo.value.trim(),
    githubBranch: elements.setGithubBranch.value.trim(),
    imageNamingPattern: elements.setImagePattern.value.trim(),
    bloggerProductBaseUrl: elements.setBloggerUrl.value.trim(),
  };

  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedConfig),
    });
    const data = await res.json();
    if (data.success) {
      state.config = data.config;
      updateGitBadge();
      elements.settingsModal.classList.remove("active");
      showToast("Ustawienia zostały zapisane.", "success");

      loadProducts();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast(`Błąd zapisu ustawień: ${err.message}`, "danger");
  }
}

function openGitModal(action) {
  elements.gitModal.classList.add("active");

  const filesContainer = document.getElementById("git-status-files-container");

  if (action === "push") {
    elements.btnExecutePush.style.display = "inline-flex";
    elements.gitCommitMsgInput.style.display = "block";
    if (filesContainer) filesContainer.style.display = "block";

    let msg = `Aktualizacja bazy produktów`;
    elements.gitCommitMsgInput.value = msg;

    loadGitStatusFiles();
  } else {
    elements.btnExecutePush.style.display = "none";
    elements.gitCommitMsgInput.style.display = "none";
    if (filesContainer) filesContainer.style.display = "none";

    executePull();
  }
}

function logToConsole(text, isError = false) {
  const time = new Date().toLocaleTimeString();
  const color = isError ? "color: #ff5c5c;" : "";
  const span = `<span style="color: #777;">[${time}]</span> <span style="${color}">${escapeHtml(text)}</span><br>`;
  elements.gitConsoleOutput.innerHTML += span;
  elements.gitConsoleOutput.scrollTop = elements.gitConsoleOutput.scrollHeight;
}

function escapeHtml(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function executePull() {
  logToConsole(">>> ROZPOCZYNANIE POBIERANIA Z GITHUB (git pull)...");
  elements.btnExecutePull.disabled = true;

  try {
    const res = await fetch("/api/git-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pull" }),
    });

    const result = await res.json();
    if (result.success) {
      logToConsole("=== WYNIK POLECENIA GIT PULL ===");
      logToConsole(result.stdout || "Brak nowych zmian (Already up to date).");
      if (result.stderr) {
        logToConsole(`Debug: ${result.stderr}`);
      }
      logToConsole(">>> ZAKOŃCZONO PULL SUKCESEM.");

      await loadProducts();
    } else {
      logToConsole(`>>> BŁĄD PODCZAS GIT PULL: ${result.error}`, true);
      if (result.stderr) logToConsole(result.stderr, true);
    }
  } catch (err) {
    logToConsole(`Błąd wykonania żądania: ${err.message}`, true);
  } finally {
    elements.btnExecutePull.disabled = false;
  }
}

async function executePush() {
  const commitMsg = elements.gitCommitMsgInput.value.trim();
  if (!commitMsg) {
    showToast("Commit message nie może być pusty!", "warning");
    return;
  }

  logToConsole(`>>> ROZPOCZYNANIE WYSYŁANIA NA GITHUB (git push)...`);
  elements.btnExecutePush.disabled = true;

  try {
    const res = await fetch("/api/git-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "push",
        commitMessage: commitMsg,
      }),
    });

    const result = await res.json();
    if (result.success) {
      logToConsole("=== WYNIK POLECENIA GIT COMMIT & PUSH ===");
      logToConsole(result.stdout || "Pomyślnie zsynchronizowano zmiany.");
      if (result.stderr) {
        logToConsole(`Szczegóły: ${result.stderr}`);
      }
      logToConsole(">>> ZAKOŃCZONO PUSH SUKCESEM.");
      logToConsole(
        "⚠️ UWAGA: Ze względu na buforowanie GitHub Raw CDN, wprowadzone zmiany mogą być widoczne na stronie dopiero za około 1-3 minuty.",
      );
      showGithubSyncToast(120);
      await loadProducts();
    } else {
      logToConsole(`>>> BŁĄD PODCZAS SYNC/PUSH: ${result.error}`, true);
      if (result.details && result.details.stderr) {
        logToConsole(result.details.stderr, true);
      }
    }
  } catch (err) {
    logToConsole(`Błąd wykonania żądania: ${err.message}`, true);
  } finally {
    elements.btnExecutePush.disabled = false;
  }
}

async function fetchTemplates() {
  try {
    const res = await fetch("/api/templates");
    const templates = await res.json();

    elements.templateSelect.innerHTML =
      `<option value="">Wczytaj szablon...</option>` +
      templates
        .map(
          (t) =>
            `<option value="${escapeHtml(t.name)}">${escapeHtml(t.name)}</option>`,
        )
        .join("");

    state.templates = templates;
  } catch (err) {
    console.error("Error fetching templates:", err);
  }
}

function updateLongDescPreview() {
  const html = elements.pLongDesc.value;
  elements.pLongDescPreview.innerHTML =
    html ||
    '<p style="color:#aaa;font-style:italic;text-align:center;padding:40px;">Podgląd opisu szczegółowego pojawi się tutaj po wpisaniu treści HTML...</p>';
}

function loadSelectedTemplate(e) {
  const name = e.target.value;
  if (!name) return;

  const template = state.templates.find((t) => t.name === name);
  if (template) {
    if (
      elements.pLongDesc.value.trim() &&
      !confirm("Czy na pewno chcesz zastąpić obecny opis wybranym szablonem?")
    ) {
      elements.templateSelect.value = "";
      return;
    }

    let html = template.html;
    if (elements.pTitle.value) {
      html = html.replace(/\[Nazwa Produktu\]/g, elements.pTitle.value);
    }

    elements.pLongDesc.value = html;
    updateLongDescPreview();
  }

  elements.templateSelect.value = "";
}

async function saveAsTemplate() {
  const html = elements.pLongDesc.value.trim();
  if (!html) {
    showToast("Opis jest pusty! Napisz coś zanim go zapiszesz jako szablon.", "warning");
    return;
  }

  const name = prompt("Wpisz nazwę dla nowego szablonu:");
  if (!name) return;

  try {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, html }),
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Szablon "${name}" został zapisany pomyślnie!`, "success");
      await fetchTemplates();
    } else {
      throw new Error(data.error);
    }
  } catch (err) {
    showToast(`Błąd podczas zapisywania szablonu: ${err.message}`, "danger");
  }
}

function toggleSidebar() {
  const isCollapsed =
    elements.appContainer.classList.toggle("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed ? "true" : "false");
}

function setupSidebarResizer() {
  const resizer = elements.sidebarResizer;
  const sidebar = elements.sidebar;
  let isDragging = false;

  const savedWidth = localStorage.getItem("sidebarWidth");
  if (savedWidth) {
    sidebar.style.width = savedWidth + "px";
  }

  const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  if (isCollapsed) {
    elements.appContainer.classList.add("sidebar-collapsed");
  } else {
    elements.appContainer.classList.remove("sidebar-collapsed");
  }

  resizer.addEventListener("mousedown", (e) => {
    isDragging = true;
    resizer.classList.add("dragging");
    sidebar.classList.add("no-transition");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    let width = e.clientX;
    if (width < 220) {
      width = 220;
    }
    if (width > 600) {
      width = 600;
    }

    sidebar.style.width = width + "px";
    localStorage.setItem("sidebarWidth", width);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove("dragging");
      sidebar.classList.remove("no-transition");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });
}

function showGithubSyncToast(durationSeconds = 120) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-title">
        <svg class="icon animate-spin" style="color: var(--color-accent); width: 16px; height: 16px; animation: spin 2s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
        <span>Synchronizacja z GitHub</span>
      </div>
      <button class="toast-close-btn">&times;</button>
    </div>
    <div class="toast-body">
      Zmiany zostały pomyślnie wysłane! Ze względu na buforowanie GitHub Raw CDN, zaktualizowane dane będą widoczne na stronie za około 1-3 minuty.
    </div>
    <div class="toast-countdown-container">
      <span class="toast-timer-label">Czas synchronizacji CDN:</span>
      <span class="toast-timer-clock">02:00</span>
    </div>
    <div class="toast-progress-bar-bg">
      <div class="toast-progress-bar-fill"></div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  const closeBtn = toast.querySelector(".toast-close-btn");
  const clock = toast.querySelector(".toast-timer-clock");
  const fill = toast.querySelector(".toast-progress-bar-fill");

  let timeLeft = durationSeconds;

  function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    clock.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const percentage = (timeLeft / durationSeconds) * 100;
    fill.style.width = `${percentage}%`;
  }

  updateTimer();

  const interval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(interval);
      clock.textContent = "Ukończono!";
      fill.style.width = "0%";
      const icon = toast.querySelector("svg");
      if (icon) icon.style.animation = "none";
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
      }, 5000);
    } else {
      updateTimer();
    }
  }, 1000);

  const closeToast = () => {
    clearInterval(interval);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  };

  closeBtn.addEventListener("click", closeToast);
}

function getProductChangeStatus(p) {
  if (!state.headProducts || state.headProducts.length === 0) return "none";
  const pHead = state.headProducts.find((item) => item.id === p.id);
  if (!pHead) {
    return "new";
  }
  // Porównanie JSON w celu wykrycia zmian lokalnych
  if (JSON.stringify(p) !== JSON.stringify(pHead)) {
    return "modified";
  }
  return "none";
}

async function loadGitStatusFiles() {
  const listEl = document.getElementById("git-status-files-list");
  if (!listEl) return;

  listEl.innerHTML = `<div style="color: var(--text-muted);">Analizowanie zmienionych plików w git...</div>`;

  try {
    const res = await fetch("/api/git-status");
    const data = await res.json();

    if (data.success && data.files && data.files.length > 0) {
      listEl.innerHTML = data.files
        .map((f) => {
          let statusClass = "untracked";
          let statusText = "Dodany";
          const code = f.code.trim();

          if (code === "M") {
            statusClass = "modified";
            statusText = "Zmieniony";
          } else if (code === "D") {
            statusClass = "deleted";
            statusText = "Usunięty";
          } else if (code === "A") {
            statusClass = "added";
            statusText = "Dodany";
          } else if (code === "??") {
            statusClass = "untracked";
            statusText = "Nowy plik";
          }

          return `
          <div class="git-status-file-item ${statusClass}">
            <span class="git-file-status-badge">${statusText}</span>
            <span>${escapeHtml(f.file)}</span>
          </div>
        `;
        })
        .join("");
    } else {
      listEl.innerHTML = `<div style="color: var(--color-success); font-weight: 500;">Brak zmienionych plików (Wszystko zsynchronizowane).</div>`;
    }
  } catch (err) {
    listEl.innerHTML = `<div class="text-danger">Nie udało się wczytać statusu: ${escapeHtml(err.message)}</div>`;
  }
}

function showToast(message, type = "info", durationMs = 5000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let borderCol = "var(--color-accent)";
  let iconSvg = `
    <svg class="icon" style="color: var(--color-accent); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  `;

  if (type === "success") {
    borderCol = "var(--color-success)";
    iconSvg = `
      <svg class="icon" style="color: var(--color-success); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    `;
  } else if (type === "danger" || type === "error") {
    borderCol = "var(--color-danger)";
    iconSvg = `
      <svg class="icon" style="color: var(--color-danger); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    `;
  } else if (type === "warning") {
    borderCol = "#ffcc00";
    iconSvg = `
      <svg class="icon" style="color: #ffcc00; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    `;
  }

  toast.style.borderLeft = `4px solid ${borderCol}`;

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-title">
        ${iconSvg}
        <span>${type === "success" ? "Sukces" : type === "danger" || type === "error" ? "Błąd" : type === "warning" ? "Ostrzeżenie" : "Informacja"}</span>
      </div>
      <button class="toast-close-btn">&times;</button>
    </div>
    <div class="toast-body">
      ${escapeHtml(message)}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  const closeBtn = toast.querySelector(".toast-close-btn");

  const timeoutId = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, durationMs);

  closeBtn.addEventListener("click", () => {
    clearTimeout(timeoutId);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  });
}
