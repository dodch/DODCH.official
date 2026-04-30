// dodchmellow-pro-v.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Comparison Slider Logic
    const slider = document.getElementById('comparison-slider');
    const beforeImage = document.querySelector('.comparison-image.before');
    const sliderLine = document.querySelector('.slider-line');
    const sliderButton = document.querySelector('.slider-button');

    if (slider && beforeImage && sliderLine && sliderButton) {
        const updateSlider = (value) => {
            const val = value;
            beforeImage.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
            sliderLine.style.left = `${val}%`;
            sliderButton.style.left = `${val}%`;
        };

        slider.addEventListener('input', (e) => {
            updateSlider(e.target.value);
        });

        updateSlider(slider.value);
    }

    // 2. Hero Video: Forward → Smooth Reverse (2× speed) → Loop
    const heroVideo = document.getElementById('hero-video');
    const heroCanvas = document.getElementById('hero-canvas');

    if (heroVideo && heroCanvas) {
        const ctx = heroCanvas.getContext('2d');

        // --- Config ---
        const CAPTURE_FPS = 25;          // Frames captured per second during forward play
        const REVERSE_FPS = 100;         // Frames played per second during reverse (4× effective speed)
        const PAUSE_BEFORE_LOOP_MS = 2000; // Pause duration at end of reverse before looping
        const CAPTURE_INTERVAL = 1000 / CAPTURE_FPS;

        // --- State ---
        let frames = [];                 // Captured ImageBitmap frames
        let captureTimer = null;
        let reverseRaf = null;
        let reverseIndex = 0;
        let isReversing = false;
        let lastReverseTime = 0;
        const reverseFrameDelay = 1000 / REVERSE_FPS;

        /** Resize canvas to match the video intrinsic dimensions */
        const syncCanvasSize = () => {
            heroCanvas.width = heroVideo.videoWidth || window.innerWidth;
            heroCanvas.height = heroVideo.videoHeight || window.innerHeight;
        };

        /** Capture current video frame as an ImageBitmap (GPU-friendly, non-blocking) */
        const captureFrame = () => {
            if (heroVideo.readyState < 2) return;
            createImageBitmap(heroVideo).then(bitmap => {
                frames.push(bitmap);
            }).catch(() => { });
        };

        /** Start capturing frames at CAPTURE_FPS during forward playback */
        const startCapture = () => {
            frames = [];
            captureTimer = setInterval(captureFrame, CAPTURE_INTERVAL);
        };

        /** Stop capturing */
        const stopCapture = () => {
            if (captureTimer) {
                clearInterval(captureTimer);
                captureTimer = null;
            }
        };

        /**
         * Reverse playback loop using RAF + timestamps for consistent framerate.
         * Draws pre-captured frames from the array backwards onto the canvas.
         */
        const reverseLoop = (timestamp) => {
            if (!isReversing) return;

            if (timestamp - lastReverseTime >= reverseFrameDelay) {
                lastReverseTime = timestamp;

                if (reverseIndex < 0 || frames.length === 0) {
                    // Finished reversing — switch back to forward playback
                    stopReverse();
                    return;
                }

                const frame = frames[reverseIndex];
                if (frame) {
                    ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
                    ctx.drawImage(frame, 0, 0, heroCanvas.width, heroCanvas.height);
                }
                reverseIndex--;
            }

            reverseRaf = requestAnimationFrame(reverseLoop);
        };

        /** Begin reverse mode: hide video, show canvas, start reverse loop */
        const startReverse = () => {
            stopCapture();
            if (frames.length === 0) {
                // No frames captured — fall back to simple replay
                heroVideo.currentTime = 0;
                heroVideo.play().catch(() => { });
                return;
            }

            syncCanvasSize();
            reverseIndex = frames.length - 1;
            isReversing = true;
            lastReverseTime = 0;

            heroVideo.style.opacity = '0';
            heroCanvas.style.display = 'block';

            reverseRaf = requestAnimationFrame(reverseLoop);
        };

        /** End reverse mode: hold on the first frame for 2s, then restore video and loop */
        const stopReverse = () => {
            isReversing = false;
            cancelAnimationFrame(reverseRaf);

            // Canvas stays visible, holding the first frame as a still for 2 seconds
            setTimeout(() => {
                heroCanvas.style.display = 'none';
                heroVideo.style.opacity = '0.8';

                heroVideo.currentTime = 0;
                heroVideo.play().then(() => {
                    startCapture();
                }).catch(() => { });
            }, 2000);
        };

        /** Full reset: stop all activity, hide canvas, reset video to start */
        const fullReset = () => {
            isReversing = false;
            stopCapture();
            cancelAnimationFrame(reverseRaf);

            heroCanvas.style.display = 'none';
            heroVideo.style.opacity = '0.8';
            heroVideo.pause();
            heroVideo.currentTime = 0;
            frames = [];
        };

        /** Kick off everything once metadata is loaded */
        const init = () => {
            syncCanvasSize();
            heroVideo.loop = false;
            heroVideo.addEventListener('ended', startReverse);

            // --- IntersectionObserver: pause when out of viewport, resume on re-entry ---
            let pauseTimeout = null;

            const observer = new IntersectionObserver((entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    // Back in view — clear any pending pause and resume
                    clearTimeout(pauseTimeout);
                    if (heroVideo.paused && !isReversing) {
                        heroVideo.play().then(() => {
                            startCapture();
                        }).catch(() => { });
                    }
                } else {
                    // Out of view — give a short grace period then reset
                    pauseTimeout = setTimeout(() => {
                        fullReset();
                    }, 300);
                }
            }, {
                threshold: 0.1 // Trigger when <10% of hero is visible
            });

            const heroSection = heroVideo.closest('section') || heroVideo.parentElement;
            observer.observe(heroSection);

            // Initial playback start
            heroVideo.play().then(() => {
                startCapture();
            }).catch(e => console.log('Autoplay prevented:', e));
        };

        if (heroVideo.readyState >= 1) {
            init();
        } else {
            heroVideo.addEventListener('loadedmetadata', init, { once: true });
        }
    }
});