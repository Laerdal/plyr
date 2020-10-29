// ==========================================================================
// Browser sniffing
// Unfortunately, due to mixed support, UA sniffing is required
// ==========================================================================

const browser = {
  isIE: /* @cc_on!@ */ false || !!document.documentMode,
  isEdge: window.navigator.userAgent.includes('Edge'),
  isWebkit: 'WebkitAppearance' in document.documentElement.style && !/Edge/.test(navigator.userAgent),
  isIPhone: /(iPhone|iPod)/gi.test(navigator.platform),
  isIos: /(iPad|iPhone|iPod)/gi.test(navigator.platform),
  isFirefox: window.navigator.userAgent.includes('Firefox'),
  isChrome: window.navigator.userAgent.includes('Chrome') && navigator.vendor=='Google Inc.',
  isSafari: window.navigator.userAgent.includes('Safari') && navigator.vendor=='Apple Computer, Inc.'
};

export default browser;
