// Release Homey's loading overlay independently from editor rendering.
let studioViewStarted = false;
let studioHomeyStarted = false;
let studioReadySent = false;
function startStudio() {
  const homeyReady=typeof window.Homey?.ready==='function' && typeof window.Homey?.api==='function';
  if (homeyReady && !studioReadySent) {
    window.Homey.ready();
    studioReadySent = true;
  }
  const errorBox=document.getElementById('studio-startup-error');
  try {
    if (!studioViewStarted) {
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
