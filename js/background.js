const audioCtx = new AudioContext();
const destination = audioCtx.createMediaStreamDestination();
var output = new MediaStream();
var micsource;
var syssource;
var mediaRecorder = '';
var mediaConstraints;
var micstream;
var audiodevices = [];
var cancel = false;
var recording = false;
var tabid = 0;
var maintabs = [];
var camtabs = [];
var recording_type = "tab-only";
var pushtotalk;
var newwindow = null;
var micable = true;
var width = 1920;
var height = 1080;
var quality = "max";
var fps = 60;
var camerasize = "small-size";
var camerapos = {x:"10px", y:"10px"};
const streamSaver = window.streamSaver;

chrome.tabs.onCreated.addListener(function(tab) {
    //by default, content scripts are loaded after page has finished loading
    getSources(null);
});

var constraints = {
    audio: true
  };
  // Get a list of the available camera devices
  function getSources(request) {
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
          var audiodevices = [];
          navigator.mediaDevices.enumerateDevices().then(function(devices) {
            devices.forEach(function(device) {
                if (device.kind == "audioinput") {
                    audiodevices.push({label:device.label, id:device.deviceId});
                }
            });
              chrome.runtime.sendMessage({type: "sources-audio", devices:audiodevices});
          });
      }).catch(function(error){
          chrome.runtime.sendMessage({type: "sources-audio-noaccess"});
      });
  }

// Get list of available audio devices
getDeviceId();
chrome.runtime.onInstalled.addListener(function() {
    // Set defaults when the extension is installed
    chrome.storage.sync.set({
        toolbar: true,
        countdown: true,
        countdown_time: 3,
        flip: true,
        pushtotalk: false,
        camera: 0,
        mic: 0,
        type: "tab-only",
        quality: "max",
        fps: 60,
				start:0,
				total:0
    });
});

// Start recording the current tab
function getTab() {
    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabCapture.capture({
            video: false,
            audio: true,
            videoConstraints: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    minWidth: width,
                    minHeight: height,
                    maxWidth: width,
                    maxHeight: height,
                    maxFrameRate: fps
                },
            },
        }, function(stream) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.runtime.sendMessage({
                    type: "sound_blob",
                    tabid: tabs[0].id
                });
            });
        });
    });
}

// Inject content scripts to start recording
function startRecording() {
		chrome.storage.sync.set({
			start: Date.now()
		});
    if (recording_type == "camera-only") {
        injectContent(true);
        recording = true;
    }
    getDeviceId();
    record();
}

// Get microphone audio and start recording video
function record() {
    // Get window dimensions to record
    chrome.windows.getCurrent(function(window){
        width = window.width;
        height = window.height;
    })
    
    var constraints;
    chrome.storage.sync.get(['fps'], function(result) {
        fps = result.fps;
        chrome.storage.sync.get(['quality'], function(result) {
            quality = result.quality;
            chrome.storage.sync.get(['mic'], function(result) {
                // Set microphone constraints
                constraints = {
                    audio: {
                        deviceId: result.mic
                    }
                }

                // Start microphone stream
                navigator.mediaDevices.getUserMedia(constraints).then(function(mic) {
                    micable = true;
                    micstream = mic;
                    micsource = audioCtx.createMediaStreamSource(mic);

                    // Check recording type
                    if (recording_type == "desktop") {
                        getDesktop();
                    } else if (recording_type == "tab-only") {
                        getTab();
                    }
                }).catch(function(error) {
                    micable = false;

                    // Check recording type
                    if (recording_type == "desktop") {
                        getDesktop();
                    } else if (recording_type == "tab-only") {
                        getTab();
                    }
                });
            });
        });
    });
}

// Inject content script
function injectContent(start) {
     chrome.storage.sync.get(['countdown'], function(result) {
        chrome.tabs.getSelected(null, function(tab) {
            if (maintabs.indexOf(tab.id) == -1 && recording_type != "camera-only") {
                // Inject content if it's not a camera recording and the script hasn't been injected before in this tab
                tabid = tab.id;
                chrome.tabs.executeScript(tab.id, {
                    file: './js/libraries/jquery-3.5.1.min.js'
                });
                chrome.tabs.executeScript(tab.id, {
                    file: './js/libraries/fabric.min.js'
                });
                chrome.tabs.executeScript(tab.id, {
                    file: './js/libraries/pickr.min.js'
                });
                chrome.tabs.executeScript(tab.id, {
                    file: './js/libraries/arrow.js'
                });

                // Check if it's a new or ongoing recording
                if (start) {
                    chrome.tabs.executeScript(tab.id, {
                        code: 'window.countdownactive = ' + result.countdown + ';window.camerasize = "' + camerasize + '";window.camerapos = {x:"'+camerapos.x+'",y:"'+camerapos.y+'"};'
                    }, function() {
                        chrome.tabs.executeScript(tab.id, {
                            file: './js/content.js'
                        });
                    });
                } else {
                    chrome.tabs.executeScript(tab.id, {
                        code: 'window.countdownactive = false;window.camerasize = "' + camerasize + '";window.camerapos = {x:"'+camerapos.x+'",y:"'+camerapos.y+'"};'
                    }, function() {
                        chrome.tabs.executeScript(tab.id, {
                            file: './js/content.js'
                        });
                    });
                }

                chrome.tabs.insertCSS(tab.id, {
                    file: './css/content.css'
                })
                chrome.tabs.insertCSS(tab.id, {
                    file: './css/libraries/pickr.css'
                })
                maintabs.push(tab.id);
            } else if (camtabs.indexOf(tab.id) == -1 && recording_type == "camera-only") {
                // Inject content for camera recording if the script hasn't been injected before in this tab
                tabid = tab.id;
                chrome.tabs.executeScript(tab.id, {
                    file: './js/libraries/jquery-3.5.1.min.js'
                });

                // Check if it's a new or ongoing recording
                if (start) {
                    chrome.tabs.executeScript(tab.id, {
                        code: 'window.countdownactive = ' + result.countdown
                    }, function() {
                        chrome.tabs.executeScript(tab.id, {
                            file: './js/cameracontent.js'
                        });
                    });
                } else {
                    chrome.tabs.executeScript(tab.id, {
                        code: 'window.countdownactive = false;'
                    }, function() {
                        chrome.tabs.executeScript(tab.id, {
                            file: './js/cameracontent.js'
                        });
                    });
                }

                chrome.tabs.insertCSS(tab.id, {
                    file: './css/cameracontent.css'
                })
                camtabs.push(tab.id);
            } else {
                // If the current tab already has the script injected
                if (recording_type == "camera-only") {
                    if (start) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "restart-cam",
                            countdown: result.countdown
                        });
                    } else {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "restart-cam",
                            countdown: false,
                        });
                    }
                } else {
                    if (start) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "restart",
                            countdown: result.countdown
                        });
                    } else {
                        chrome.tabs.sendMessage(tab.id, {
                            type: "restart",
                            countdown: false,
                            camerapos: camerapos,
                            camerasize: camerasize
                        });
                    }
                }
            }
        })
    })
}

function stopRecording(save) {
    tabid = 0;

    // Show default icon
    chrome.browserAction.setIcon({path: "../assets/extension-icons/logo-32.png"});
    
    chrome.tabs.getSelected(null, function(tab) {
        // Check if recording has to be saved or discarded
        if (save == "stop" || save == "stop-save") {
            cancel = false;
        } else {
            cancel = true;
        }
        mediaRecorder.stop();
        // Check if it's a desktop or tab recording (recording done in background script)
        
            recording = false;
            if (cancel) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "stop-cancel"
                });
            } else {
                chrome.tabs.sendMessage(tab.id, {
                    type: "stop-save"
                });
            }
        chrome.tabs.sendMessage(tab.id, {
            type: "stoprecording123"
        });

        // Remove injected content
        chrome.tabs.sendMessage(tab.id, {
            type: "end"
        });
    });
}

// Get a list of the available audio devices
function getDeviceId() {
    audiodevices = [];
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
        devices.forEach(function(device) {
            if (device.kind == "audioinput") {
                audiodevices.push({
                    label: device.label,
                    id: device.deviceId
                });
            }
        });
        chrome.runtime.sendMessage({type: "audio-done", devices:audiodevices});
    });
}

// Mute/unmute microphone and system audio
function audioSwitch(source, enable) {
    if (recording_type != "camera-only") {
        // Start a new microphone stream if one doesn't exist already
        if (!micable) {
            chrome.tabs.getSelected(null, function(tab) {
                navigator.mediaDevices.getUserMedia({
                    audio: true
                }).then(function(mic) {
                    micable = true;
                    micstream = mic;
                    micsource = audioCtx.createMediaStreamSource(mic);
                    micsource.connect(destination);
                }).catch(function(error) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: "no-mic-access"
                    });
                });
            });
        }
        if (source == "mic" && !enable && micable) {
            micsource.disconnect(destination);
        } else if (source == "mic" && enable && micable) {
            micsource.connect(destination);
        } else if (source == "tab" && !enable) {
            syssource.disconnect(destination);
        } else {
            syssource.connect(destination);
        }
    } else {
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {
                type: "mic-switch",
                enable: enable
            });
        });
    }
}

// Update camera device
function updateCamera(request) {
    chrome.tabs.getSelected(null, function(tab) {
        // Save user preference
        chrome.storage.sync.set({
            camera: request.id
        });

        // Send user preference to content script
        chrome.tabs.sendMessage(tab.id, {
            type: request.type,
            id: request.id
        });
    });
}

// Toggle push to talk
function pushToTalk(request, id) {
    chrome.tabs.getSelected(null, function(tab) {
        pushtotalk = request.enabled;

        // Send user preference to content script
        chrome.tabs.sendMessage(tab.id, {
            type: request.type,
            enabled: request.enabled
        });
    });
}

// Countdown is over / recording can start
function countdownOver() {
        if (!recording) {
            mediaRecorder.start();
            recording = true;
        }
}

// Inject content when tab redirects while recording
function pageUpdated(sender) {
    chrome.tabs.getSelected(null, function(tab) {
        if (sender.tab.id == tab.id) {
            if (recording && tab.id == tabid && recording_type == "tab-only") {
                injectContent(false)
                getDeviceId();
                tabid = 0;
            } else if (recording && recording_type == "desktop") {
                injectContent(false)
                getDeviceId();
                tabid = 0;
            }
            maintabs.splice(maintabs.indexOf(tabid), 1);
        }
    });
}

// // Changed tab selection
// chrome.tabs.onActivated.addListener(function(tabId, changeInfo, tab) {
//     if (!recording) {
//         // Hide injected content if the recording is already over
//         chrome.tabs.getSelected(null, function(tab) {
//             chrome.tabs.sendMessage(tab.id, {
//                 type: "end"
//             });
//         });
//     } else if (recording && recording_type == "desktop" && maintabs.indexOf(tabId) == -1) {
//         // Inject content for entire desktop recordings (content should be on any tab)
//         injectContent(false);
//     }
// });

chrome.tabs.onRemoved.addListener(function(tabid, removed) {
    // Stop recording if tab is closed in a camera only recording
    if (tabid == tabid && recording && recording_type == "camera-only") {
        recording = false;
        
        // Show default icon
        chrome.browserAction.setIcon({path: "../assets/extension-icons/logo-32.png"});
        tabid = 0;
    }
})

// Keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
    if (recording) {
        if (command == "stop") {
            stopRecording(command);
        } else if (command == "pause/resume") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "pause/resume"
                });
            });
        } else if (command == "cancel") {
            stopRecording(command);
        } else if (command == "mute/unmute" && !pushtotalk) {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "mute/unmute"
                });
            });
        }
    }
});

function OpenPage(url1) {
    chrome.tabs.create({
        url : url1
      });
}

// Listen for messages from content / popup
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type == "record") {
            startRecording();
        } else if (request.type == "openpage") {
            OpenPage(request.url);
        }
        else if (request.type == "reloadAudio") {
            getSources(null);    
        } else if (request.type == "injectscript") {
            injectContent(true);
        } else if (request.type == "pause") {
            pauseRecording();
            sendResponse({success: true});
        } else if (request.type == "resume") {
            resumeRecording();
            sendResponse({success: true});
        } else if (request.type == "stop-save") {
            stopRecording(request.type);
        } else if (request.type == "stop-cancel") {
            stopRecording(request.type);
        } else if (request.type == "audio-request") {
            sendResponse({devices: audiodevices});
        } else if (request.type == "update-camera") {
            updateCamera(request);
        } else if (request.type == "audio-switch") {
            audioSwitch(request.source, request.enable);
        } else if (request.type == "camera-list") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: request.type,
                    devices: request.devices,
                    audio: request.audio
                });
            });
        } else if (request.type == "flip-camera") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: request.type,
                    enabled: request.enabled
                });
            });
        } else if (request.type == "push-to-talk") {
            pushtotalk(request);
        } else if (request.type == "switch-toolbar") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: request.type,
                    enabled: request.enabled
                });
            });
        } else if (request.type == "countdown") {
            countdownOver();
        } else if (request.type == "recording-type") {
            recording_type = request.recording;
        } else if (request.type == "record-request") {
            sendResponse({recording: recording});
        } else if (request.type == "pause-camera") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "pause-camera"
                });
            });
        } else if (request.type == "resume-camera") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "resume-record"
                });
            });
        } else if (request.type == "no-camera-access") {
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "no-camera-access"
                });
            });
        } else if (request.type == "audio-check") {
            getDeviceId();
        } else if (request.type == "end-camera-recording") {
            recording = false;
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "end-recording"
                });
            });
						if (!request.cancel) {
							saveRecording("", request.blobs);
						} 
        } else if (request.type == "sources-loaded") {
            pageUpdated(sender);
        } else if (request.type == "camera-size") {
            camerasize = request.size;
        } else if (request.type == "camera-pos") {
            camerapos.x = request.x;
            camerapos.y = request.y;
        } else if (request.type == "test") {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendMessage(tab.id, {
								type: "hello"
						});
				});
				}
    }
);
