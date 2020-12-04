// ==========================================================================
// Plyr Captions
// TODO: Create as class
// ==========================================================================

import tts from 'basic-tts';
import controls from './controls';
import support from './support';
import { dedupe } from './utils/arrays';
import browser from './utils/browser';
import {
  createElement,
  emptyElement,
  getAttributesFromSelector,
  insertAfter,
  removeElement,
  toggleClass,
  getElement,
} from './utils/elements';
import { on, triggerEvent } from './utils/events';
import fetch from './utils/fetch';
import i18n from './utils/i18n';
import is from './utils/is';
import { getHTML } from './utils/strings';
import { parseUrl } from './utils/urls';
var video, track;
var player;
var cahpCues = [];
var xhr;
var duration;
const chapters = {
  
  // Setup chapters
  setup() {
    // Requires UI support
    if (!this.supported.ui) {
      return;
    }
    player = this.media.plyr;
   

    // Inject the container
    if (!is.element(this.elements.chapters)) {
      this.elements.chapters = createElement('div', getAttributesFromSelector(this.config.selectors.chapters));
      insertAfter(this.elements.chapters, this.elements.wrapper);
    }

    // Fix IE chapters if CORS is used
    // Fetch chapters and inject as blobs instead (data URIs not supported!)
    if (browser.isIE && window.URL) {
      const elements = this.media.querySelectorAll('track');

      Array.from(elements).forEach(track => {
        const src = track.getAttribute('src');
        const url = parseUrl(src);

        if (
          url !== null &&
          url.hostname !== window.location.href.hostname &&
          ['http:', 'https:'].includes(url.protocol)
        ) {
          fetch(src, 'blob')
            .then(blob => {
              track.setAttribute('src', window.URL.createObjectURL(blob));
            })
            .catch(() => {
              removeElement(track);
            });
        }
      });
    }

    const browserLanguages = navigator.languages || [navigator.language || navigator.userLanguage || 'en'];
    const languages = dedupe(browserLanguages.map(language => language.split('-')[0]));
    let language = (this.storage.get('language') || this.config.chapters.language || 'auto').toLowerCase();

    // Use first browser language when language is 'auto'
    if (language === 'auto') {
      [language] = languages;
    }

    let active = this.storage.get('chapters');
    if (!is.boolean(active)) {
      ({ active } = this.config.chapters);
    }

    const elements = this.media.querySelectorAll('track');

    Array.from(elements).forEach(track => {
      const src = track.getAttribute('src');
      let index = src.indexOf('-en_chapter.vtt');
      if ((index !== -1) || (track.kind=='chapters')) {
        cahpCues =[];
      const url = parseUrl(src);
     xhr = new XMLHttpRequest();
     if (xhr != null) {
       xhr.open("GET", url, false /* sync */);
       xhr.setRequestHeader('Content-Type', 'text/text; charset=utf-8');
       
       xhr.onreadystatechange = function() {
         if (xhr.readyState == 4 /* complete */) {
           if (xhr.status != 200) {
             alert('Unable to retrieve file.');
           } else {
            cahpCues = parseWebVTT(xhr.responseText);
           }
         }
       }
       xhr.send();
     } else {
       alert('Error retrieving file.');
     }

    }
    });

  

    function parseWebVTT(data) {
      var srt;
      // check WEBVTT identifier
      if (data.substring(0,6) != "WEBVTT") {
        alert("Missing WEBVTT header: Not a WebVTT file - trying SRT.");
        srt = data;
      } else {
        // remove WEBVTT identifier line
        srt = data.split('\n').slice(1).join('\n');
      }
    
      // clean up string a bit
      srt = srt.replace(/\r+/g, ''); // remove dos newlines
      srt = srt.replace(/^\s+|\s+$/g, ''); // trim white space start and end
    
       
    
      // parse cues
      var cuelist = srt.split('\n\n');
      for (var i = 0; i < cuelist.length; i++) {
        var cue = cuelist[i];
        var content = "", start, end, id = "";
        var s = cue.split(/\n/);
        var t = 0;
        // is there a cue identifier present?
        if (!s[t].match(/(\d+):(\d+):(\d+)/)) {
          // cue identifier present
          id = s[0];
          t = 1;
        }
        // is the next line the time string
        if (!s[t].match(/(\d+):(\d+).(\d+)/)) {
          // file format error: next cue
          continue;
        }
        // parse time string
        var matchTimes = s[t].match(/([0-9]{2})?:?([0-9]{2}):([0-9]{2}).([0-9]{2,3})( ?--> ?)([0-9]{2})?:?([0-9]{2}):([0-9]{2}).([0-9]{2,3})/); 
        if (matchTimes) {
            
          start = Number(matchTimes[1] || 0) * 60 * 60 + Number(matchTimes[2]) * 60 + Number(matchTimes[3]) + Number("0.".concat(matchTimes[4]));
          end = Number(matchTimes[6] || 0) * 60 * 60 + Number(matchTimes[7]) * 60 + Number(matchTimes[8]) + Number("0.".concat(matchTimes[9]));
        }
        
         else {
          // Unrecognized timestring: next cue
          continue;
        }
    
        // concatenate text lines to html text
        content = s.slice(t+1).join("<br>");
    
        // add parsed cue
        cahpCues.push({id: id, start: start, end: end, content: content});
      }
      return cahpCues;
    }
 

    if (cahpCues && cahpCues.length > 0) {
      if (this.config && this.config.mediaDuration) {
        duration = this.config.mediaDuration.toFixed(2);
        duration = parseFloat(duration * 60);
      } else {
        duration = 0;
      }
      const bar_width= getElement.call(this, this.config.selectors.progress).offsetWidth;
      this.elements.container.style.minWidth='80%';
      this.elements.container.style.maxWidth='80%';
      this.elements.container.style.float ='left';
      const chapterContainer= createElement("div");
      chapterContainer.setAttribute('class', 'chapter_container');
      const chapterCaption = createElement("div");
      chapterCaption.setAttribute('class','chapterCaption');
      chapterCaption.setAttribute('tabindex', '0');
      chapterCaption.setAttribute('role', 'menu');
      const chapterList= createElement("ol");
      chapterList.setAttribute('id', 'chapters');
      chapterList.setAttribute('class', 'chapters');
      var chapnum=1;
      Array.from(this.media.textTracks).forEach(track => {
        if(track.kind === "chapters"){
     for (var i = 0; i < cahpCues.length; i++) {
      // var bar_width = document.getElementsByClassName('.plyr__progress').offsetWidth;
      const chapterItem = createElement('span');
      const captionItem = createElement('li');
      const start = parseFloat(cahpCues[i].start);
      const end = parseFloat(cahpCues[i].end);
      const perc = bar_width / duration;
      chapterItem.className = "containerBookmarks";
      captionItem.id = "segment" + start;
      captionItem.className = "captionBookmarks";
      captionItem.setAttribute('data-chapter', i);
      captionItem.setAttribute('tabindex', '0');
      captionItem.setAttribute('role', 'button');

       const value = getPercentagevalue(start, duration);
       chapterItem.style.left = "".concat(value / 100 * 100, "%");
       const cueContent = cahpCues[i].content.replace('&nbsp;',' ');
       chapterItem.innerText =chapnum + '.';
       captionItem.innerText =chapnum + '. ' + cueContent;

       captionItem.onclick = function () {
         seekChapter(this.getAttribute('data-chapter'));

       }
       chapterContainer.appendChild(chapterItem);
       chapterList.appendChild(captionItem);
       chapterCaption.appendChild(chapterList);
       chapnum++;
     }


        track.addEventListener('cuechange', function () {
     if (track.activeCues.length>0 ) {

          var currentLocation = "segment" + this.activeCues[0].startTime;
          var chapter = document.getElementById(currentLocation);

          if (chapter) {
            var locations = [].slice.call(document.querySelectorAll("#chapters li"));

            for (var i = 0; i < locations.length; ++i) {
              locations[i].classList.remove("current");
            }

            chapter.classList.add("current"); 
          }
         }
        });
      }
    });

 
     insertAfter(chapterContainer, this.elements.progress);
    // insertAfter(chapterCaption, this.elements.chapters);
    insertAfter(chapterCaption, this.elements.container);
    
   }

  function getPercentagevalue(current, max) {
    if (current === 0 || max === 0 || Number.isNaN(current) || Number.isNaN(max)) {
      return 0;
    }

    return (current / max * 100).toFixed(2);
  } 

    function seekChapter(chapter) {
      if (chapter) {
        player.currentTime = parseFloat(cahpCues[chapter].start);
      
      }		
    }
  },
  

};

export default chapters;
