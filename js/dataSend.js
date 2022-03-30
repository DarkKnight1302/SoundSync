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

var txData = document.getElementById("txData");
var rxData;
var captureStart = document.getElementById("captureStart");
var captureStop = document.getElementById("captureStop");

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
        document.getElementById("p1").innerHTML = "paramets"+parameters;
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

captureStart.addEventListener("click", async function () {
    alert("Inside");
    init();

    await navigator.mediaDevices.getUserMedia({audio:true}).then(function (e) {
        document.getElementById("p1").innerHTML = "recordingh";
        mediaStream = context.createMediaStreamSource(e);

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
    }).catch(function (e) {
        alert(e.message);
    });

    rxData = 'Listening ...';
    document.getElementById("p1").innerHTML = "Listening...";
    captureStart.hidden = true;
    captureStop.hidden = false;
});

captureStop.addEventListener("click", function () {
    if (recorder) {
        recorder.disconnect(context.destination);
        mediaStream.disconnect(recorder);
        recorder = null;
    }

    rxData= 'Audio capture is paused! Press the "Start capturing" button to analyze audio from the microphone';
    document.getElementById("p1").innerHTML = "Stopped...";
    captureStart.hidden = false;
    captureStop.hidden = true;
});

captureStop.click();