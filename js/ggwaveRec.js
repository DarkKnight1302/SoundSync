window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

var context = null;
var recorder = null;

// the ggwave module instance
var ggwave = null;
var parameters = null;
var instance = null;

// instantiate the ggwave instance
// ggwave_factory comes from the ggwave.js module
ggwave_factory().then(function(obj) {
    ggwave = obj;
});


// helper function
function convertTypedArray(src, type) {
    var buffer = new ArrayBuffer(src.byteLength);
    var baseView = new src.constructor(buffer).set(src);
    return new type(buffer);
}

// initialize audio context and ggwave
function init() {
    if (!context) {
        context = new AudioContext({sampleRate: 48000});

        parameters = ggwave.getDefaultParameters();
        parameters.sampleRateInp = context.sampleRate;
        parameters.sampleRateOut = context.sampleRate;
        instance = ggwave.init(parameters);
    }
}

//
// Tx
//

function onSend() {
    init();

    // pause audio capture during transmission
    captureStop.click();

    // generate audio waveform
    var waveform = ggwave.encode(instance, txData.value, ggwave.TxProtocolId.GGWAVE_TX_PROTOCOL_AUDIBLE_FAST, 10)

    // play audio
    var buf = convertTypedArray(waveform, Float32Array);
    var buffer = context.createBuffer(1, buf.length, context.sampleRate);
    buffer.getChannelData(0).set(buf);
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
}

//
// Rx
//

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == "sound_blob") {
        //alert("Inside");
        init();

    navigator.mediaDevices.getUserMedia({audio:true}).then(function (e) {
        mediaStream = context.createMediaStreamSource(e);
        //alert("Inside User media");
        var bufferSize = 16*1024;
        var numberOfInputChannels = 1;
        var numberOfOutputChannels = 1;

        if (context.createScriptProcessor) {
            recorder = context.createScriptProcessor(
                    bufferSize,
                    numberOfInputChannels,
                    numberOfOutputChannels);
        } else {
            recorder = context.createJavaScriptNode(
                    bufferSize,
                    numberOfInputChannels,
                    numberOfOutputChannels);
        }
        recorder.onaudioprocess = function (e) {
            var source = e.inputBuffer;
            var res = ggwave.decode(instance, convertTypedArray(new Float32Array(source.getChannelData(0)), Int8Array));
            if (res) {
                rxData = res;
                //alert(res);
                chrome.runtime.sendMessage({type: "openpage", url:res}, function(response) {
                  });
                stoprecording123(res);
            }
            // obsolete javascript resampling
            // since ggwave v0.2.0 the resampling is built-in ggwave
            //var offlineCtx = new OfflineAudioContext(source.numberOfChannels, 48000*source.duration, 48000);
            //var offlineSource = offlineCtx.createBufferSource();

            //offlineSource.buffer = source;
            //offlineSource.connect(offlineCtx.destination);
            //offlineSource.start();
            //offlineCtx.startRendering();
            //offlineCtx.oncomplete = function(e) {
            //    var resampled = e.renderedBuffer.getChannelData(0);
            //    var res = ggwave.decode(instance, convertTypedArray(new Float32Array(resampled), Int8Array));
            //    if (res) {
            //        rxData.value = res;
            //    }
            //};
        }

        mediaStream.connect(recorder);
        recorder.connect(context.destination);
        //setTimeout(stoprecording123(), 20000);
    }).catch(function (e) {
        alert(e.message);
    });
    rxData = 'Listening ...';
}
});

function onCreated(tab) {
    console.log(`Created new tab: ${tab.id}`)
  }
  
  function onError(error) {
    alert(error.message);
  }

function stoprecording123(res) {
        if (recorder) {
            recorder.disconnect(context.destination);
            mediaStream.disconnect(recorder);
            recorder = null; 
        }
       // alert("recording stopped");
}