import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ADMIN_UID = '4JAqYb2fnEhpqaBv7xWwsFDUXun2';
const PERFORMANCE_CONFIG = {
    "GENTLENESS": ["Mild", "Extra Mild", "Ultra Mild", "Purest"],
    "HYDRATION": ["Light", "Moderate", "High", "Intense"],
    "PORE CLEANSING": ["Gentle", "Balanced", "Deep", "Purifying"],
    "OIL CONTROL": ["Mild", "Balanced", "High", "Maximum"],
    "EXFOLIATION": ["Surface", "Mild", "Effective", "Deep"],
    "SHINE / GLOSS": ["Subtle", "Healthy", "Luminous", "Mirror Shine"],
    "DAMAGE REPAIR": ["Basic", "Deep", "Intense", "Total"],
    "LATHER / FOAM": ["Light", "Creamy", "Dense", "Cloud-like"],
    "VOLUME": ["Natural", "Bouncy", "Full", "Mega"],
    "DEFAULT": ["Low", "Moderate", "High", "Intense"]
};

function getLevelColor(level) {
    const colorScale = [
        "#B8995E", // Level 1: Brand Gold (Start)
        "#8EA35E", // Level 2: Olive/Transition
        "#5DA35E", // Level 3: Soft Green
        "#2E7D32"  // Level 4: Vibrant Green (End)
    ];
    return colorScale[level - 1];
}

const DEFAULT_PERF_BARS = {
    "hair-care": [
        { label: "Gentleness", value: "Mild", level: 1 },
        { label: "Hydration", value: "Light", level: 1 },
        { label: "Damage Repair", value: "Basic", level: 1 },
        { label: "Shine / Gloss", value: "Subtle", level: 1 }
    ],
    "skin-care": [
        { label: "Gentleness", value: "Mild", level: 1 },
        { label: "Hydration", value: "Light", level: 1 },
        { label: "Pore Cleansing", value: "Gentle", level: 1 },
        { label: "Exfoliation", value: "Surface", level: 1 }
    ]
};

function getProductCategory(slug) {
    if (window.productCatalog && window.productCatalog[slug]) {
        return window.productCatalog[slug].category || "skin-care";
    }
    return "skin-care";
}

function initAdminEdit() {
    if (!window.productCatalog || Object.keys(window.productCatalog).length === 0) {
        setTimeout(initAdminEdit, 50);
        return;
    }
    const auth = getAuth();
    const db = getFirestore();
    let slug = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    if (slug === 'product') {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id && window.productCatalog[id]) {
            const prod = window.productCatalog[id];
            if (prod.storyUrl) {
                slug = prod.storyUrl.split('/').pop().replace('.html', '');
            } else {
                slug = id;
            }
        } else {
            slug = id || 'index';
        }
    }

    // 1. Initialize Colors for hardcoded content
    initializeGlobalPerformanceColors();

    // 2. Load Overrides
    loadOverrides(db, slug);

    // 3. Auth Check for Admin
    onAuthStateChanged(auth, (user) => {
        if (user && user.uid === ADMIN_UID) {
            enableAdminEditing(db, slug);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminEdit);
} else {
    initAdminEdit();
}

function initializeGlobalPerformanceColors() {
    const perfItems = document.querySelectorAll('.perf-item');
    perfItems.forEach(item => {
        const steps = item.querySelectorAll('.level-step');
        const activeSteps = item.querySelectorAll('.level-step.active').length;
        const labelEl = item.querySelector('.perf-label');
        const valueEl = item.querySelector('.perf-value');
        
        if (activeSteps > 0) {
            const color = getLevelColor(activeSteps);
            
            // Apply Colors
            steps.forEach((step, i) => {
                if (i < activeSteps) {
                    step.style.background = color;
                }
            });
            if (valueEl) valueEl.style.color = color;

            // Synchronize Text based on Mapping (for everyone)
            if (labelEl && valueEl) {
                const labelText = labelEl.textContent.trim().toUpperCase();
                const config = PERFORMANCE_CONFIG[labelText] || PERFORMANCE_CONFIG["DEFAULT"];
                const mappedText = config[activeSteps - 1];
                if (mappedText) valueEl.textContent = mappedText;
            }
        }
    });
}

function createPerfItemElement(item) {
    const perfItemEl = document.createElement('div');
    perfItemEl.className = 'perf-item';
    
    const level = item.level || 1;
    const color = getLevelColor(level);
    
    const labelUpper = item.label.toUpperCase();
    const config = PERFORMANCE_CONFIG[labelUpper] || PERFORMANCE_CONFIG["DEFAULT"];
    const valueText = config[level - 1] || item.value || "Mild";

    perfItemEl.innerHTML = `
        <div class="perf-header">
            <span class="perf-label">${item.label}</span>
            <span class="perf-value" style="color: ${color};">${valueText}</span>
        </div>
        <div class="perf-levels">
            <div class="level-step ${level >= 1 ? 'active' : ''}" style="background: ${level >= 1 ? color : '#EAEAEA'};"></div>
            <div class="level-step ${level >= 2 ? 'active' : ''}" style="background: ${level >= 2 ? color : '#EAEAEA'};"></div>
            <div class="level-step ${level >= 3 ? 'active' : ''}" style="background: ${level >= 3 ? color : '#EAEAEA'};"></div>
            <div class="level-step ${level >= 4 ? 'active' : ''}" style="background: ${level >= 4 ? color : '#EAEAEA'};"></div>
        </div>
    `;
    return perfItemEl;
}

async function loadOverrides(db, slug) {
    try {
        const docRef = doc(db, "product_overrides", slug);
        const docSnap = await getDoc(docRef);

        const data = docSnap.exists() ? docSnap.data() : {};
        applyOverrides(data, slug);
    } catch (e) {
        console.error("Error loading overrides:", e);
    }
}

function applyOverrides(data, slug) {
    // 1. Populate INCI Ingredients
    const inciContainer = document.querySelector('.accordion-item:nth-child(1) .accordion-inner');
    if (inciContainer) {
        if (data.inci) {
            inciContainer.textContent = data.inci;
        } else if (inciContainer.textContent.trim() === 'Loading...') {
            inciContainer.textContent = "Ingredients list coming soon.";
        }
    }

    // 2. Populate Performance Bars
    const performanceBarsContainer = document.querySelector('.performance-bars');
    if (performanceBarsContainer) {
        const hasHardcodedItems = performanceBarsContainer.querySelectorAll('.perf-item').length > 0;

        if (data.performance && data.performance.length > 0) {
            // Firestore overrides exist: populate dynamically
            performanceBarsContainer.innerHTML = '';
            data.performance.forEach(item => {
                performanceBarsContainer.appendChild(createPerfItemElement(item));
            });
        } else if (!hasHardcodedItems) {
            // Container is empty and no override exists (e.g. generic product.html), use category defaults
            const cat = getProductCategory(slug);
            const defaults = DEFAULT_PERF_BARS[cat] || DEFAULT_PERF_BARS["skin-care"];
            performanceBarsContainer.innerHTML = '';
            defaults.forEach(item => {
                performanceBarsContainer.appendChild(createPerfItemElement(item));
            });
        }
    }

    // Initialize colors for all items (either newly created or hardcoded)
    initializeGlobalPerformanceColors();
}

function enableAdminEditing(db, slug) {
    // Add Edit buttons to accordion items
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    // INCI Edit
    if (accordionItems[0]) {
        const header = accordionItems[0].querySelector('.accordion-header');
        const editBtn = document.createElement('button');
        editBtn.className = 'admin-edit-btn';
        editBtn.innerHTML = '✎ Edit INCI';
        editBtn.style.cssText = 'margin-left: auto; font-size: 0.7rem; padding: 4px 8px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer; z-index: 10;';
        header.appendChild(editBtn);

        editBtn.onclick = (e) => {
            e.stopPropagation();
            const currentInci = accordionItems[0].querySelector('.accordion-inner').textContent.trim();
            const newInci = prompt("Edit INCI Ingredients:", currentInci);
            if (newInci !== null) {
                accordionItems[0].querySelector('.accordion-inner').textContent = newInci;
                saveOverride(db, slug, { inci: newInci });
            }
        };
    }

    // Performance Edit
    if (accordionItems[1]) {
        const header = accordionItems[1].querySelector('.accordion-header');
        const editBtn = document.createElement('button');
        editBtn.className = 'admin-edit-btn';
        editBtn.innerHTML = '✎ Edit Performance';
        editBtn.style.cssText = 'margin-left: auto; font-size: 0.7rem; padding: 4px 8px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer; z-index: 10;';
        header.appendChild(editBtn);

        editBtn.onclick = (e) => {
            e.stopPropagation();
            if (!accordionItems[1].classList.contains('active')) {
                accordionItems[1].classList.add('active');
            }
            setupPerformanceControls(db, slug);
        };
    }
}

function setupPerformanceControls(db, slug) {
    const perfItems = document.querySelectorAll('.perf-item');
    perfItems.forEach((item, index) => {
        if (item.querySelector('.perf-controls')) return;

        const controls = document.createElement('div');
        controls.className = 'perf-controls';
        controls.style.cssText = 'display: flex; gap: 10px; margin-top: 10px; align-items: center; background: #f9f9f9; padding: 8px; border-radius: 6px;';

        const label = document.createElement('span');
        label.textContent = "Adjust Level:";
        label.style.fontSize = "0.7rem";
        label.style.color = "#666";

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        [minusBtn, plusBtn].forEach(btn => btn.style.cssText = 'width: 30px; height: 30px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-weight: bold; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; border-radius: 4px;');

        controls.appendChild(label);
        controls.appendChild(minusBtn);
        controls.appendChild(plusBtn);
        item.appendChild(controls);

        minusBtn.onclick = () => updatePerfLevel(item, -1, db, slug);
        plusBtn.onclick = () => updatePerfLevel(item, 1, db, slug);
    });
}

function updatePerfLevel(item, delta, db, slug) {
    const steps = item.querySelectorAll('.level-step');
    const valueEl = item.querySelector('.perf-value');
    const labelEl = item.querySelector('.perf-label');
    
    let currentLevel = item.querySelectorAll('.level-step.active').length;
    let newLevel = Math.max(1, Math.min(4, currentLevel + delta));
    
    // Update visual steps and color
    const color = getLevelColor(newLevel);
    steps.forEach((step, i) => {
        const isActive = i < newLevel;
        step.classList.toggle('active', isActive);
        step.style.background = isActive ? color : '#EAEAEA';
    });

    // Update Text Value based on Mapping
    const labelText = labelEl.textContent.trim().toUpperCase();
    const config = PERFORMANCE_CONFIG[labelText] || PERFORMANCE_CONFIG["DEFAULT"];
    const newText = config[newLevel - 1];
    
    if (valueEl) {
        valueEl.textContent = newText;
        valueEl.style.color = color;
    }

    saveAllPerformance(db, slug);
}

async function saveAllPerformance(db, slug) {
    const perfItems = document.querySelectorAll('.perf-item');
    const performance = Array.from(perfItems).map(item => ({
        label: item.querySelector('.perf-label').textContent.trim(),
        value: item.querySelector('.perf-value').textContent.trim(),
        level: item.querySelectorAll('.level-step.active').length
    }));
    await saveOverride(db, slug, { performance });
}

async function saveOverride(db, slug, data) {
    console.log("Saving override for:", slug, data);
    try {
        const docRef = doc(db, "product_overrides", slug);
        await setDoc(docRef, data, { merge: true });
        console.log("Save successful!");
        if (window.showToast) window.showToast("Product data updated successfully!", "success");
    } catch (e) {
        console.error("Firestore Save Error:", e);
        if (window.showToast) window.showToast(`Save failed: ${e.message}`, "error");
    }
}
