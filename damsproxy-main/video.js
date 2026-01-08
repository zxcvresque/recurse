// video.js

// Video Player Initialization and Management
let videoPlayerInstance = null;
let currentVideoUrl = null;

function initializeVideoPlayer() {
  console.log('Initializing video player...');

  // --- DOM Element References ---
  const videoPlayerModal = document.getElementById("video-player-modal");
  const videoModalTitle = document.getElementById("video-modal-title");
  const closeVideoModalBtn = document.getElementById("close-video-modal-btn");
  const videoElement = document.getElementById("player");

  if (!videoPlayerModal || !videoModalTitle || !closeVideoModalBtn || !videoElement) {
    console.error('Video player elements not found in DOM');
    return;
  }

  /**
   * Initializes or re-initializes the Plyr video player with a new source.
   * @param {string} videoUrl - The URL of the video to play.
   * @param {string} videoTitle - The title of the video.
   */
  function initializePlayer(videoUrl, videoTitle) {
    console.log('Initializing player with URL:', videoUrl);

    // Save resume info
    const resumeInfo = { url: videoUrl, title: videoTitle };
    localStorage.setItem("resume_watching", JSON.stringify(resumeInfo));

    // If a player instance already exists, destroy it first
    if (videoPlayerInstance) {
      console.log('Destroying existing player instance');
      videoPlayerInstance.destroy();
      videoPlayerInstance = null;
    }

    // Set video source
    videoElement.src = videoUrl;
    currentVideoUrl = videoUrl;

    // Create a new Plyr instance
    console.log('Creating new Plyr instance');
    videoPlayerInstance = new Plyr(videoElement, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      storage: { enabled: true, key: 'plyr' },
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] }
    });

    // Set title
    videoModalTitle.innerText = `[STREAMING: ${videoTitle}]`;

    // Show the modal
    videoPlayerModal.classList.remove("hidden");

    // Play the video
    videoPlayerInstance.play().catch(error => {
      console.error('Error playing video:', error);
      showNotification('Error playing video. Please try again.', 'error');
    });
  }

  /**
   * Stops the video and closes the player modal.
   */
  function closeVideoPlayer() {
    console.log('Closing video player');

    if (videoPlayerInstance) {
      videoPlayerInstance.pause();
      videoPlayerInstance.destroy();
      videoPlayerInstance = null;
    }

    currentVideoUrl = null;
    videoPlayerModal.classList.add("hidden");
  }

  // --- Event Listeners ---

  // Listener for the modal's close button
  closeVideoModalBtn.addEventListener("click", closeVideoPlayer);

  // Listener to close the modal if the user clicks on the background overlay
  videoPlayerModal.addEventListener("click", (e) => {
    if (e.target === videoPlayerModal) {
      closeVideoPlayer();
    }
  });

  // Global function to play video (called from HTML buttons)
  window.playVideo = function(videoUrl, videoTitle) {
    console.log('Playing video:', videoUrl, videoTitle);
    if (videoUrl && videoTitle) {
      initializePlayer(videoUrl, videoTitle);
    } else {
      console.error('Invalid video URL or title');
      showNotification('Error: Invalid video data', 'error');
    }
  };

  console.log('Video player initialized successfully');
}

// Initialize video player when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeVideoPlayer();
});
