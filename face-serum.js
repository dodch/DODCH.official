/* face-serum.js */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('serum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const totalFrames = 120;
    const images = [];
    let imagesLoaded = 0;

    const scrollytellingContainer = document.querySelector('.scrollytelling-container');

    // --- Two-layer scroll state ---
    // rawProgress   : actual scroll position (0-1), sampled every RAF frame
    // smoothProgress: lerp'd version that drives the canvas — immune to snap jitter
    let rawProgress = 0;
    let smoothProgress = 0;
    let currentFrame = 0;
    let lastRendered = -1;

    // Lerp factor: 0.15 = snappy but smooth catch-up
    const LERP = 0.15;

    // --- Load all images ---
    for (let i = 0; i < totalFrames; i++) {
        const img = new Image();
        img.src = `images/serum-frames/frame_${i.toString().padStart(3, '0')}.webp`;

        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalFrames) {
                setTimeout(() => {
                    const wrapper = document.querySelector('.canvas-wrapper');
                    if (wrapper) setTimeout(() => wrapper.classList.add('visible'), 300);
                    resizeCanvas();
                    initAnimation();
                }, 200);
            }
        };

        img.onerror = () => {
            imagesLoaded++;
            console.error(`Failed to load frame ${i}`);
            if (imagesLoaded === totalFrames) {
                const wrapper = document.querySelector('.canvas-wrapper');
                if (wrapper) wrapper.classList.add('visible');
                resizeCanvas();
                initAnimation();
            }
        };

        images.push(img);
    }

    // --- Canvas resize ---
    let lastHeight = window.innerHeight;
    function resizeCanvas() {
        const h = window.innerHeight;
        const w = window.innerWidth;
        if (Math.abs(h - lastHeight) < 120 && w === canvas.width) return;
        lastHeight = h;
        canvas.width = w;
        canvas.height = h;
        renderFrame(currentFrame);
    }
    window.addEventListener('resize', resizeCanvas);

    // --- IntersectionObserver for beat text animations ---
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.5 });

    document.querySelectorAll('.snap-section').forEach(s => sectionObserver.observe(s));

    // --- Render a single frame to canvas ---
    function renderFrame(index) {
        const rounded = Math.round(index);
        if (rounded === lastRendered) return;   // skip if no change
        const img = images[rounded];
        if (!img || !img.complete) return;

        lastRendered = rounded;

        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX, offsetY;
        if (canvasRatio > imgRatio) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imgRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawWidth = canvas.height * imgRatio;
            drawHeight = canvas.height;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        }
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    function initAnimation() {
        renderFrame(0);
        requestAnimationFrame(update);
    }

    // --- Optimization: Cache dimensions to avoid layout thrashing ---
    let cachedStartY = 0;
    let cachedScrollable = 0;
    let cachedContainerH = 0;

    function updateDimensions() {
        if (!scrollytellingContainer) return;
        const scrollY = window.scrollY;
        const rect = scrollytellingContainer.getBoundingClientRect();
        cachedStartY = rect.top + scrollY;
        cachedContainerH = scrollytellingContainer.offsetHeight;
        cachedScrollable = Math.max(1, (cachedStartY + cachedContainerH - window.innerHeight) - cachedStartY);
    }

    updateDimensions();
    window.addEventListener('resize', () => {
        resizeCanvas();
        updateDimensions();
    });

    // --- Main RAF loop ---
    function update() {
        if (scrollytellingContainer) {
            const scrollY = window.scrollY;

            // 1. Toggle snapping class
            if (scrollY < cachedStartY + cachedContainerH - (window.innerHeight * 0.1)) {
                document.documentElement.classList.add('snapping-active');
            } else {
                document.documentElement.classList.remove('snapping-active');
            }

            // 2. Sampling (Fast access via cached values)
            rawProgress = Math.max(0, Math.min(1, (scrollY - cachedStartY) / cachedScrollable));
        }

        // 3. Precision Frame Lock
        const targetFrameIdx = rawProgress * (totalFrames - 1);
        const frameDelta = targetFrameIdx - currentFrame;

        // If extremely close, snap immediately to kill the 'tail stutter'
        if (Math.abs(frameDelta) < 0.05) {
            currentFrame = targetFrameIdx;
        } else {
            // Accelerator: 0.4 responsiveness normally, 0.8 when near the very ends
            // as the browser snap usually finishes fast.
            const speed = (rawProgress > 0.98 || rawProgress < 0.02) ? 0.8 : 0.4;
            currentFrame += frameDelta * speed;
        }

        // 4. Stable Render
        const rounded = Math.round(currentFrame);
        if (rounded !== lastRendered) {
            renderFrame(rounded);
        }

        requestAnimationFrame(update);
    }
});
