$(document).ready(function(){
    const uniqueid = "sound-sync-extension";
    var micon = true;
    var tabaudioon = true;
    var audiodevices = [];
    // Get defaults
    function getDefaults() {
        chrome.storage.sync.get(['mic'], function(result) {
            if (result.mic == 'disabled' || result.mic == 0) {
                micEnabled(false);
            }
        });
    }
    
    injectCode(true, countdownactive);
    
    // Inject or remove all the content
    function injectCode(inject, active) {
        if (inject) { 

            micon = true;
            tabaudioon = true;

            // Get list of audio devices
            chrome.runtime.sendMessage({type: "audio-request"}, function(response){
                audiodevices = response.devices;
            });
            
            // // Extension wrapper
            // var wrapper = "<div id='"+uniqueid+"' style='width: 100%;height:100%;position:absolute;'></div>";
            // $("body").append(wrapper);
            
            // // Inject the iframe
            // var iframeinject = "<div id='canvas-cont'><canvas id='canvas-draw'></canvas></div><div id='click-highlight'></div><div id='detect-iframe'><div id='hide-camera' class='camera-hidden'><img src='"+chrome.extension.getURL('./assets/images/close.svg')+"' class='noselect'></div><div id='change-size' class='camera-hidden'><div id='small-size' class='size-active choose-size'></div><div id='medium-size' class='choose-size'></div><div id='large-size' class='choose-size'></div></div></div><div id='wrap-iframe' class='notransition'><iframe src='"+chrome.extension.getURL('./html/camera.html')+"' allow='camera'></iframe></div><canvas id='canvas-freedraw' width=500 height=500></canvas><canvas id='canvas-focus' width=500 height=500></canvas>";
            // $("#"+uniqueid).prepend(iframeinject);
            
            getDefaults();
    }
    
    // Switch system/microphone audio on and off
    function audioEnable(type, enable) {
        chrome.runtime.sendMessage({type: "audio-switch", enable:enable, source:type});
    }
    
    // Switch microphone on and off
    function micEnabled(enable) {
        micon = enable;
        if (enable) {
            audioEnable("mic", true);
        } else {
            audioEnable("mic", false);
        }
    }
    
    // Turn on/off microphone
    $(document).on("click", "#"+uniqueid+" #mic", function(){
        micEnabled(!micon)
    })
    
    // Turn on/off tab audio
    $(document).on("click", "#"+uniqueid+" #tab-audio", function(){
        if (tabaudioon) {
            audioEnable("tab", false);
            tabaudioon = false;
            chrome.runtime.sendMessage({type: "tab-audio-off"});
        } else {
            audioEnable("tab", true);
            tabaudioon = true;
            chrome.runtime.sendMessage({type: "tab-audio-on"});
        }
    })
    
    // Listen for popup/background/content messages
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.type == "audio-list") {
            audiodevices = request.devices;
        } else if (request.type == "end") {
            injectCode(false, false);
        } else if (request.type == "update-cmic") {
            if (request.id == "disabled" || request.id == 0) {
                micEnabled(false);
            } else {
                micEnabled(true);
            }
        }
    });
});