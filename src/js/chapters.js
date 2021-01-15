// ==========================================================================
// Plyr Chapters
// TODO: Create as class
// ==========================================================================

import controls from './controls';
import support from './support';
import { dedupe } from './utils/arrays';
import browser from './utils/browser';
import {
  createElement,
  getAttributesFromSelector,
  insertAfter,
  removeElement,
  toggleClass,
  setAttributes,
} from './utils/elements';
import { on, triggerEvent } from './utils/events';
import fetch from './utils/fetch';
import i18n from './utils/i18n';
import is from './utils/is';
import { parseUrl } from './utils/urls';

const chapters = {
  // Setup chapters
  setup() {
    // Requires UI support
    if (!this.supported.ui) {
      return;
    }

    // Only HTML5 supported at this point
    if (!this.isHTML5) {
      // Clear menu and hide
      if (
        is.array(this.config.controls) &&
        this.config.controls.includes('settings') &&
        this.config.settings.includes('chapters')
      ) {
        controls.setChaptersList.call(this);
      }

      return;
    }

    // Inject the container
    if (!is.element(this.elements.chapters)) {
      this.elements.chapters = createElement('div', getAttributesFromSelector(this.config.selectors.chapters));
      insertAfter(this.elements.chapters, this.elements.inner);
    }

    // Fix IE chapters if CORS is used
    // Fetch chapters and inject as blobs instead (data URIs not supported!)
    if (browser.isIE && window.URL) {
      const elements = this.media.querySelectorAll('track');
      console.log('IE blob setup', elements);

      Array.from(elements).forEach((track) => {
        const src = track.getAttribute('src');
        const url = parseUrl(src);

        if (
          url !== null &&
          url.hostname !== window.location.href.hostname &&
          ['http:', 'https:'].includes(url.protocol)
        ) {
          fetch(src, 'blob')
            .then((blob) => {
              track.setAttribute('src', window.URL.createObjectURL(blob));
            })
            .catch(() => {
              removeElement(track);
            });
        }
      });
    }

    // Get and set initial data
    // The "preferred" options are not realized unless / until the wanted language has a match
    // * languages: Array of user's browser languages.
    // * language:  The language preferred by user settings or config
    // * active:    The state preferred by user settings or config
    // * toggled:   The real descriptions state

    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage || 'en'];
    const languages = dedupe(browserLanguages.map((language) => language.split('-')[0]));
    let language = (this.storage.get('language') || this.config.chapters.language || 'auto').toLowerCase();

    // Use first browser language when language is 'auto'
    if (language === 'auto') {
      [language] = languages;
    }

    let active = this.storage.get('chapters');
    if (!is.boolean(active)) {
      ({ active } = this.config.chapters);
    }

    Object.assign(this.chapters, {
      toggled: false,
      active,
      language,
      languages,
    });

    // Watch changes to textTracks and update chapters
    if (this.isHTML5) {
      const trackEvents = this.config.chapters.update ? 'addtrack removetrack' : 'removetrack';
      on.call(this, this.media.textTracks, trackEvents, chapters.update.bind(this));
    }

    // Update available languages in list next tick (the event must not be triggered before the listeners)
    setTimeout(chapters.update.bind(this), 0);
  },

  update() {
    const tracks = chapters.getTracks.call(this, true);
    // Get the wanted language
    const { active, language, meta, currentTrackNode } = this.chapters;
    const languageExists = Boolean(tracks.find((track) => track.language === language));

    // Handle tracks (add event listener and "pseudo"-default)
    if (this.isHTML5) {
      tracks
        .filter((track) => !meta.get(track))
        .forEach((track) => {
          this.debug.log('Chapters track added', track);

          // Attempt to store if the original dom element was "default"
          meta.set(track, {
            default: track.mode === 'showing',
          });

          // Note: mode='hidden' forces a track to download. To ensure every track
          // isn't downloaded at once, only 'showing' tracks should be reassigned
          // eslint-disable-next-line no-param-reassign
          if (track.mode === 'showing') {
            // eslint-disable-next-line no-param-reassign
            track.mode = 'hidden';
          }

          // Add event listener for cue changes
          on.call(this, track, 'cuechange', () => chapters.updateCues.call(this));
        });
      on.call(this, this.media, 'seeked playing timeupdate', () => chapters.updateCuesList.call(this));
    }

    // Update language first time it matches, or if the previous matching track was removed
    if ((languageExists && this.language !== language) || !tracks.includes(currentTrackNode)) {
      chapters.setLanguage.call(this, language);
      chapters.toggle.call(this, active && languageExists);
    }

    // Enable or disable chapters based on track length
    toggleClass(this.elements.container, this.config.classNames.chapters.enabled, !is.empty(tracks));

    // Update chapters list when data has loaded
    if (is.array(this.config.controls) && this.config.controls.includes('chapters')) {
      on.call(this, this.media, 'canplaythrough', () => controls.setChaptersList.call(this));
    }
  },
  // Toggle chapters display
  // Used internally for the toggleChapters method, with the passive option forced to false
  toggle(input, passive = true) {
    // If there's no full support
    if (!this.supported.ui) {
      return;
    }

    const { toggled } = this.chapters; // Current state
    const activeClass = this.config.classNames.chapters.active;
    // Get the next state
    // If the method is called without parameter, toggle based on current value
    const active = is.nullOrUndefined(input) ? !toggled : input;

    // Update state and trigger event
    if (active !== toggled) {
      // When passive, don't override user preferences
      if (!passive) {
        this.chapters.active = active;
        this.storage.set({ chapters: active });
      }

      // Force language if the call isn't passive and there is no matching language to toggle to
      if (!this.language && active && !passive) {
        const tracks = chapters.getTracks.call(this);
        const track = chapters.findTrack.call(this, [this.chapters.language, ...this.chapters.languages], true);

        // Override user preferences to avoid switching languages if a matching track is added
        this.chapters.language = track.language;

        // Set caption, but don't store in localStorage as user preference
        chapters.set.call(this, tracks.indexOf(track));
        return;
      }

      // Toggle button if it's enabled
      if (this.elements.buttons.chapters) {
        this.elements.buttons.chapters.pressed = active;
      }

      // Add class hook
      toggleClass(this.elements.container, activeClass, active);

      this.chapters.toggled = active;

      // Update settings menu
      controls.updateSetting.call(this, 'chapters');

      // Trigger event (not used internally)
      triggerEvent.call(this, this.media, active ? 'chaptersenabled' : 'chaptersdisabled');
    }

    // Wait for the call stack to clear before setting mode='hidden'
    // on the active track - forcing the browser to download it
    setTimeout(() => {
      if (active && this.chapters.toggled) {
        this.chapters.currentTrackNode.mode = 'hidden';
      }
    });
  },

  // Set chapters by track index
  // Used internally for the currentChapTrack setter with the passive option forced to false
  set(index, passive = true) {
    const tracks = chapters.getTracks.call(this);

    // Disable chapters if setting to -1
    if (index === -1) {
      chapters.toggle.call(this, false, passive);
      return;
    }

    if (!is.number(index)) {
      this.debug.warn('Invalid chapter argument', index);
      return;
    }

    if (!(index in tracks)) {
      this.debug.warn('Chapter track not found', index);
      return;
    }

    if (this.chapters.currentChapTrack !== index) {
      this.chapters.currentChapTrack = index;
      const track = tracks[index];
      const { language } = track || {};

      // Store reference to node for invalidation on remove
      this.chapters.currentTrackNode = track;

      // Update settings menu
      controls.updateSetting.call(this, 'chapters');

      // When passive, don't override user preferences
      if (!passive) {
        this.chapters.language = language;
        this.storage.set({ language });
      }

      // Handle Vimeo chapters
      if (this.isVimeo) {
        this.debug.warn('Vimeo not supported');
      }

      // Trigger event
      triggerEvent.call(this, this.media, 'languagechange');
    }

    // Show chapters
    chapters.toggle.call(this, true, passive);

    if (this.isHTML5) {
      // If we change the active track while a cue is already displayed we need to update it
      chapters.updateCues.call(this);
    }
  },

  // Set chapters by language
  // Used internally for the language setter with the passive option forced to false
  setLanguage(input, passive = true) {
    if (!is.string(input)) {
      this.debug.warn('Invalid language argument', input);
      return;
    }
    // Normalize
    const language = input.toLowerCase();
    this.chapters.language = language;

    // Set currentChapTrack
    const tracks = chapters.getTracks.call(this);
    const track = chapters.findTrack.call(this, [language]);
    chapters.set.call(this, tracks.indexOf(track), passive);
  },

  // Get current valid caption tracks
  // If update is false it will also ignore tracks without metadata
  // This is used to "freeze" the language options when chapters.update is false
  getTracks(update = false) {
    // Handle media or textTracks missing or null
    const tracks = Array.from((this.media || {}).textTracks || []);
    // For HTML5, use cache instead of current tracks when it exists (if chapters.update is false)
    // Filter out removed tracks and tracks that aren't chapters (for example metadata)
    return tracks
      .filter((track) => !this.isHTML5 || update || this.chapters.meta.has(track))
      .filter((track) => ['chapters'].includes(track.kind));
  },

  // Match tracks based on languages and get the first
  findTrack(languages, force = false) {
    const tracks = chapters.getTracks.call(this);
    const sortIsDefault = (track) => Number((this.chapters.meta.get(track) || {}).default);
    const sorted = Array.from(tracks).sort((a, b) => sortIsDefault(b) - sortIsDefault(a));
    let track;

    languages.every((language) => {
      track = sorted.find((t) => t.language === language);
      return !track; // Break iteration if there is a match
    });

    // If no match is found but is required, get first
    return track || (force ? sorted[0] : undefined);
  },

  // Get the current track
  getCurrentTrack() {
    return chapters.getTracks.call(this)[this.currentChapTrack];
  },

  // Get UI label for track
  getLabel(track) {
    let currentChapTrack = track;

    if (!is.track(currentChapTrack) && support.textTracks && this.chapters.toggled) {
      currentChapTrack = chapters.getCurrentTrack.call(this);
    }

    if (is.track(currentChapTrack)) {
      if (!is.empty(currentChapTrack.label)) {
        return currentChapTrack.label;
      }

      if (!is.empty(currentChapTrack.language)) {
        return track.language.toUpperCase();
      }

      return i18n.get('enabled', this.config);
    }

    return i18n.get('disabled', this.config);
  },

  setCues(cues) {
    chapters.cues = cues;
  },

  // Update chapters using current track's active cues
  // Also optional array argument in case there isn't any track (ex: vimeo)
  updateCues() {
    // Requires UI
    if (!this.supported.ui) {
      return;
    }

    if (!is.element(this.elements.chapters)) {
      this.debug.warn('No chapters element to render to');
      return;
    }

    const track = chapters.getCurrentTrack.call(this);

    let cues = Array.from((track || {}).activeCues || []).map((cue) => cue.startTime);

    if (this.chapters.active && cues.length > 0 && cues[0]) {
      // Beginning of new chapter
      // Trigger event
      triggerEvent.call(this, this.media, 'cuechange');
    }
  },

  updateCuesList() {
    var activeChapterIndex;
    if (!chapters.cues) {
      this.debug.log('No chapters cues set', chapters);
      return;
    }
    chapters.cues.map((cue, index) => {
      if (this.media.currentTime >= cue.startTime) {
        activeChapterIndex = index;
      }
    });
    for (let i = 0; i < this.elements.chapters.children.length; i++) {
      let chapterItem = this.elements.chapters.children[i];
      toggleClass(chapterItem, 'active', activeChapterIndex === i);
      setAttributes(chapterItem, { 'aria-checked': activeChapterIndex === i ? 'true' : 'false' });
    }
  },
};

export default chapters;
