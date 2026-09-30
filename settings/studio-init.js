// Release Homey's loading overlay independently from editor rendering.
let studioViewStarted = false;
let studioLayoutStarted = false;
let studioHomeyStarted = false;
let studioReadySent = false;
function applyStudioTranslations() {
  document.documentElement.lang = window.Homey.language || 'en';
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = window.Homey.__(element.dataset.i18n);
  });
}
function startStudio() {
  const homeyReady=typeof window.Homey?.ready==='function' && typeof window.Homey?.api==='function' && typeof window.Homey?.__==='function';
  // The SDK can exist before its translation and API methods are ready.
  if (!homeyReady) return;
  if (homeyReady && !studioReadySent) {
    window.Homey.ready();
    studioReadySent = true;
  }
  const errorBox=document.getElementById('studio-startup-error');
  try {
    if (!studioViewStarted) {
      if (typeof document.querySelectorAll === 'function') applyStudioTranslations();
      if (!studioLayoutStarted && typeof initializeStudioLayout === 'function') {
        initializeStudioLayout();
        studioLayoutStarted = true;
      }
      if (typeof currentPages !== 'undefined' && selectedDeviceId === 'demo' && currentPages.active?.slots?.[3]) {
        currentPages.active.slots[3].title = window.Homey.__('common.temperature');
      }
      renderUI();
      updateStudioSaveState();
      studioViewStarted = true;
    }
    if (homeyReady && !studioHomeyStarted) {
      loadDevices();
      loadGlobalMqttSettings();
      loadGlobalWeatherSettings();
      startStudioStatusPolling();
      studioHomeyStarted = true;
    }
    if(errorBox)errorBox.hidden=true;
  } catch(error) {
    console.error('Studio startup failed:',error);
    if(errorBox){
      document.getElementById('studio-startup-error-text').textContent='Studion käynnistys epäonnistui: '+(error?.message||String(error));
      errorBox.hidden=false;
    }
  }
}
startStudio();
