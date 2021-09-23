import 'custom-event-polyfill';
import 'url-polyfill';

import sources from './sources';

document.addEventListener('DOMContentLoaded', function () {
  const playerOptions = {
    debug: true,
    title: 'View From A Blue Moon',
    hideControls: false,
    iconUrl: 'dist/demo.svg',
    keyboard: {
      global: true,
    },
    tooltips: {
      controls: true,
    },
    controls: [
      'play-large',
      'transcript',
      // 'restart',
      // 'rewind',
      'play',
      // 'fast-forward',
      'progress',
      'current-time',
      // 'duration',
      'mute',
      'volume',
      'captions',
      'descriptions',
      'chapters',
      'settings',
      'pip',
      'airplay',
      // 'download',
      'fullscreen',
    ],
    captions: {
      active: true,
    },
    descriptions: {
      active: true,
    },
    chapters: {
      active: true,
    },
    previewThumbnails: {
      enabled: true,
      src: ['https://cdn.plyr.io/static/demo/thumbs/100p.vtt', 'https://cdn.plyr.io/static/demo/thumbs/240p.vtt'],
    },
    vimeo: {
      // Prevent Vimeo blocking plyr.io demo site
      referrerPolicy: 'no-referrer',
    },
    fullscreen: {
      container: null,
    },
  };

  // ---- Setup the players ----------------------------------
  // ---- 1. Standard player -----------------
  const videoPlayer = new Plyr('#video-player', playerOptions);
  // ---- 2. Player with descriptions -----------------
  const videoPlayerWithDescriptions = new Plyr('#video-player-with-descriptions', playerOptions);
  // ---- 2. Player with chapters -----------------
  const videoPlayerWithChapters = new Plyr('#video-player-with-chapters', playerOptions);
  // ---- 3. Player with fullscreen container -----------------
  const fullscreenContainerOptions = playerOptions;
  fullscreenContainerOptions.fullscreen.container = '.container';
  const videoPlayerWithFullscreenContainer = new Plyr(
    '#video-player-with-fullscreen-container',
    fullscreenContainerOptions,
  );

  const audioPlayer = new Plyr('#audio-player', playerOptions);
  const youtubePlayer = new Plyr('#youtube-player', playerOptions);
  const vimeoPlayer = new Plyr('#vimeo-player', playerOptions);

  // Expose for tinkering in the console
  window.videoPlayer = videoPlayer;
  window.videoPlayerWithDescriptions = videoPlayerWithDescriptions;
  window.videoPlayerWithChapters = videoPlayerWithChapters;
  window.videoPlayerWithFullscreenContainer = videoPlayerWithFullscreenContainer;
  window.audioPlayer = audioPlayer;
  window.youtubePlayer = youtubePlayer;
  window.vimeoPlayer = vimeoPlayer;

  // Set the source
  videoPlayer.source = sources.video;
  videoPlayerWithDescriptions.source = sources.videoWithDescriptions;
  videoPlayerWithChapters.source = sources.videoWithChapters;
  videoPlayerWithFullscreenContainer.source = sources.video;
  audioPlayer.source = sources.audio;
});
