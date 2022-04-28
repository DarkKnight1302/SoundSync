$(document).ready(function(){
    const uniqueid = "screenity-screen-recorder-extension";
    var recording = true;
    var drag, dragx, dragy, timer, pickr;
    var dragging = false;
    var dragged = false;
    var drawing = false;
    var erasing = false;
    var mousedown = false;
    var pendown = false;
    var cameraon = true;
    var micon = true;
    var tabaudioon = true;
    var arrowon = false;
    var texton = false;
    var clickon = false;
    var focuson = false;
    var hideon = false;
    var sliderhover = false;
    var sliderhovereraser = false;
    var penhover = false;
    var eraserhover = false;
    var cameradevices = [];
    var audiodevices = [];
    var alt = false;
    var mdown = false;
    var holdtalk = false;
    var persistent = false;
    var lastx = 0;
    var lasty = 0;
    var lastscrollx = 0;
    var lastscrolly = 0;
    
    // Get defaults
    function getDefaults() {
        chrome.storage.sync.get(['pushtotalk'], function(result) {
           if (result.pushtotalk) {
               holdtalk = true;
               micEnabled(false);
           } 
        });
        chrome.storage.sync.get(['toolbar'], function(result) {
           persistent = result.toolbar;
           if (!countdownactive && persistent) {
               chrome.runtime.sendMessage({type: "countdown"});
                if (persistent) {
                    $("#"+uniqueid+" #toolbar-record").removeClass("toolbar-inactive");
                }
           }
        });
        chrome.storage.sync.get(['mic'], function(result) {
            if (result.mic == 'disabled' || result.mic == 0) {
                micEnabled(false);
            }
        });
        chrome.storage.sync.get(['camera'], function(result) {
            if (result.camera == 'disabled' || result.camera == 0) {
                cameraEnabled(false);
            } else if (result.camera == 'disabled-access') {
                $("#"+uniqueid+" #camera").addClass("camera-on");
                $("#"+uniqueid+" #toolbar-settings").addClass("settings-camon");
                $("#"+uniqueid+" #wrap-iframe").addClass("no-camera");
                $("#"+uniqueid+" #hide-camera").addClass("camera-hidden");
                $("#"+uniqueid+" #detect-iframe").addClass("no-camera");
            }
        });
    }
    
    injectCode(true, countdownactive);
    
    // Inject or remove all the content
    function injectCode(inject, active) {
        if (inject) { 
            // Reset to start a new recording
            recording = true;
            alt = false;
            mdown = false;
            dragging = false;
            drawing = false;
            erasing = false;
            mousedown = false;
            pendown = false;
            cameraon = true;
            micon = true;
            tabaudioon = true;
            arrowon = false;
            window.arrowon = arrowon;
            texton = false;
            clickon = false;
            focuson = false;
            hideon = false;
            sliderhover = false;
            sliderhovereraser = false;
            penhover = false;
            eraserhover = false;

            // Get list of audio devices
            chrome.runtime.sendMessage({type: "audio-request"}, function(response){
                audiodevices = response.devices;
            });
            
            // Extension wrapper
            var wrapper = "<div id='"+uniqueid+"' style='width: 100%;height:100%;position:absolute;'></div>";
            $("body").append(wrapper);
            
            // Inject the iframe
            var iframeinject = "<div id='canvas-cont'><canvas id='canvas-draw'></canvas></div><div id='click-highlight'></div><div id='detect-iframe'><div id='hide-camera' class='camera-hidden'><img src='"+chrome.extension.getURL('./assets/images/close.svg')+"' class='noselect'></div><div id='change-size' class='camera-hidden'><div id='small-size' class='size-active choose-size'></div><div id='medium-size' class='choose-size'></div><div id='large-size' class='choose-size'></div></div></div><div id='wrap-iframe' class='notransition'><iframe src='"+chrome.extension.getURL('./html/camera.html')+"' allow='camera'></iframe></div><canvas id='canvas-freedraw' width=500 height=500></canvas><canvas id='canvas-focus' width=500 height=500></canvas>";
            $("#"+uniqueid).prepend(iframeinject);

            // Inject the toolbar
            var toolbarinject = "<div id='color-pckr-thing'></div><div id='pen-slider' class='toolbar-inactive'><input type='range' min=1 max=50><img class='slider-track' src='"+chrome.extension.getURL('./assets/images/slider-track.svg')+"'></div><div id='eraser-slider' class='toolbar-inactive'><input type='range' min=1 max=50><img class='slider-track' src='"+chrome.extension.getURL('./assets/images/slider-track.svg')+"'></div><iframe id='toolbar-settings' class='toolbar-inactive' src='"+chrome.extension.getURL('./html/settings.html')+"'></iframe><div id='toolbar-record-cursor' class='toolbar-inactive noselect'><div id='click-tool' class='tool' title='Highlight clicks'><img src='"+chrome.extension.getURL('./assets/images/click.svg')+"'/></div><div id='focus-tool' class='tool' title='Highlight cursor'><img src='"+chrome.extension.getURL('./assets/images/focus.svg')+"'/></div><div id='hide-cursor-tool' class='tool' title='Hide cursor when inactive'><img src='"+chrome.extension.getURL('./assets/images/hide-cursor.svg')+"'/></div></div>   <div id='toolbar-record-pen' class='toolbar-inactive noselect'><div id='pen-tool' class='tool' title='Pen tool'><img src='"+chrome.extension.getURL('./assets/images/pen.svg')+"' class=/></div><div id='eraser' class='tool' title='Eraser tool'><img src='"+chrome.extension.getURL('./assets/images/eraser.svg')+"'/></div><div id='color-pckr' class='tool' title='Change the annotation color'><div id='color-icon'></div></div><div id='text' class='tool' title='Text tool'><img src='"+chrome.extension.getURL('./assets/images/text.svg')+"'/></div><div id='arrow' class='tool' title='Arrow tool'><img src='"+chrome.extension.getURL('./assets/images/arrow.svg')+"'/></div><div id='clear' class='tool' title='Delete all annotations'><img src='"+chrome.extension.getURL('./assets/images/clear.svg')+"'/></div></div>   <div id='toolbar-record' class='toolbar-inactive noselect'><div id='pause' class='tool' title='Pause/resume recording'><img src='"+chrome.extension.getURL('./assets/images/pausewhite.svg')+"'/></div><div id='cursor' class='tool' title='Cursor settings'><img src='"+chrome.extension.getURL('./assets/images/cursor.svg')+"'/></div><div id='pen' class='tool' title='Annotation tools'><img src='"+chrome.extension.getURL('./assets/images/pen.svg')+"'/></div><div id='camera' title='Enable camera' class='tool'><img src='"+chrome.extension.getURL('./assets/images/camera.svg')+"'/></div><div id='mic' class='tool tool-active' title='Enable/disable microphone'><img src='"+chrome.extension.getURL('./assets/images/mic-off.svg')+"'/></div><div id='tab-audio' class='tool tool-active' title='Enable/disable browser audio'><img src='"+chrome.extension.getURL('./assets/images/tab-audio-off.svg')+"'/></div><div id='settings' class='tool' title='Recording settings'><img src='"+chrome.extension.getURL('./assets/images/settings.svg')+"'/></div></div>";
            $("#"+uniqueid).prepend(toolbarinject);
            
            getDefaults();
            
            // Initialize color picker
            pickr = Pickr.create({
            el: '#color-pckr',
            theme: 'nano',
            swatches: false,
            default: "#EB205D",
            useAsButton: true,
            autoReposition: true,
            position: "top-middle",
            components: {
                preview: true,
                opacity: true,
                hue: true,
                interaction: {
                    hex: false,
                    rgba: false,
                    hsla: false,
                    hsva: false,
                    cmyk: false,
                    input: false,
                    clear: false,
                    save: false
                }
            }
            });
            window.pickr = pickr;
            $("#"+uniqueid).append($(".pcr-app"));
            $("#"+uniqueid+" #camera").addClass("camera-on");
            drag = $("#"+uniqueid+" #wrap-iframe");
            
            // Allow CSS transitions (prevents camera from scaling on load)
            window.setTimeout(function(){
                $(".notransition").removeClass("notransition");
            }, 500);
            
            // Check if countdown is enabled
            if (active) {
                $("#"+uniqueid+" #toolbar-record").css("pointer-events", "none");
                chrome.storage.sync.get(['countdown_time'], function(result) {
                    injectCountdown(result.countdown_time);
                });
            } else {
                chrome.runtime.sendMessage({type: "countdown"});
                if (persistent) {
                    $("#"+uniqueid+" #toolbar-record").removeClass("toolbar-inactive");
                }
                if (camerasize && camerapos) {
                    cameraSize(camerasize);
                    setCameraPos(camerapos.x, camerapos.y);
                }
            }
            
            // Initialize canvas
            initCanvas();
        } else {
            $("#"+uniqueid).remove();
        }
    }
    
    // Countdown
    function injectCountdown(time){
        var countdowninject = "<div id='countdown'><img src='"+chrome.extension.getURL('./assets/images/3-countdown.svg')+"'></div>";
        $("#"+uniqueid).prepend(countdowninject);
        countdown(time);
    }
    function delay(num,time,last) {
        window.setTimeout(function(){
            if (!last) {
                $("#"+uniqueid+" #countdown img").attr("src", chrome.extension.getURL('./assets/images/'+num+'-countdown.svg'));
            } else {
                $("#"+uniqueid+" #countdown").addClass("countdown-done");
                window.setTimeout(function(){
                    chrome.runtime.sendMessage({type: "countdown"});
                },10);
                if (persistent) {
                    $("#"+uniqueid+" #toolbar-record").removeClass("toolbar-inactive");
                }
                $("#"+uniqueid+" #toolbar-record").css("pointer-events", "all");
            }
        },time*1000);
    }
    function countdown(time){
        $("#"+uniqueid+" #countdown img").attr("src", chrome.extension.getURL('./assets/images/'+time+'-countdown.svg'));
        for (var i = 0; i <= time; i++) {
            if (i == time) {
                delay(time-i,i,true);
            } else {
                delay(time-i,i,false);
            }
        }
    }

    // Canvas initialization
    var canvas_focus,ctx_focus,canvas_free,ctx_free,canvas;
    var last_mousex = 0;
    var last_mousey = 0;
    var mousex = 0;
    var mousey = 0;
    var pendown = false;
    var tooltype = 'draw';
    var penset = false;
    var textediting = false;
    var mouseover = false;
    var moretools = false;
    const canvas_free_id = "#"+uniqueid+" #canvas-freedraw";
    const canvas_focus_id = "#"+uniqueid+" #canvas-focus";
    var arrow;
    
    function initCanvas() {
        // Reset defaults
        canvas_focus = document.getElementById("canvas-focus");
        ctx_focus = canvas_focus.getContext('2d');
        canvas_free = document.getElementById("canvas-freedraw");
        ctx_free = canvas_free.getContext('2d');
        last_mousex = 0;
        last_mousey = 0;
        mousex = 0;
        mousey = 0;
        pendown = false;
        tooltype = 'draw';
        penset = false;
        $("#"+uniqueid+" #canvas-freedraw").css("pointer-events", 'none');
        
        // Interactive FabricJs canvas initialization
        canvas = new fabric.Canvas('canvas-draw', {
            preserveObjectStacking: true,
            height: $(document).height(),
            width: $(document).width(),
            renderOnAddRemove: false
        });
        textediting = false;
        $("#"+uniqueid+" #canvas-cont").css("pointer-events", 'none');
        
        // Resize canvas to be full size
        onResize();
        window.setTimeout(function(){
            onResize();
        },500)
        canvas.selection = false;
        mouseover = false;
        moretools = false;
        arrow = new Arrow(canvas);
        
        // Detect mousedown on FabricJs canvas
        canvas.on('mouse:down', function(options) {
            if (textediting) {
                textediting = false;
            } else if (texton && options.target == null && !canvas.getActiveObject()) {
                newTextbox(options.pointer.x, options.pointer.y);
            }
        })
    }
    
    
    // Switch system/microphone audio on and off
    function audioEnable(type, enable) {
        chrome.runtime.sendMessage({type: "audio-switch", enable:enable, source:type});
    }
    
    // Switch microphone on and off
    function micEnabled(enable) {
        micon = enable;
        if (enable) {
            $("#"+uniqueid+" #mic").addClass("tool-active");
            $("#"+uniqueid+" #mic img").attr("src", chrome.extension.getURL('./assets/images/mic-off.svg'));
            audioEnable("mic", true);
        } else {
            $("#"+uniqueid+" #mic").removeClass("tool-active");
            $("#"+uniqueid+" #mic img").attr("src", chrome.extension.getURL('./assets/images/mic.svg'));
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
            $("#"+uniqueid+" #tab-audio").removeClass("tool-active");
            $("#"+uniqueid+" #tab-audio img").attr("src", chrome.extension.getURL('./assets/images/tab-audio.svg'));
            chrome.runtime.sendMessage({type: "tab-audio-off"});
        } else {
            audioEnable("tab", true);
            tabaudioon = true;
            $("#"+uniqueid+" #tab-audio").addClass("tool-active");
            $("#"+uniqueid+" #tab-audio img").attr("src", chrome.extension.getURL('./assets/images/tab-audio-off.svg'));
            chrome.runtime.sendMessage({type: "tab-audio-on"});
        }
    })
    
    // Listen for popup/background/content messages
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.type == "camera-list") {
            cameradevices = request.devices;
        } else if (request.type == "audio-list") {
            audiodevices = request.devices;
        } else if (request.type == "end") {
            injectCode(false, false);
        } else if (request.type == "pause/resume") {
            pauseResume();
        } else if (request.type == "mute/unmute") {
            if (micon) {
                micEnabled(false);
            } else {
                micEnabled(true);
            }
        } else if (request.type == "push-to-talk") {
            holdtalk = request.enabled;
            micEnabled(false);
        } else if (request.type == "switch-toolbar") {
            persistent = request.enabled;
            if (persistent) {
                $("#toolbar-record").removeClass("toolbar-inactive");
            } else {
                $("#toolbar-record").addClass("toolbar-inactive");
            }
        } else if (request.type == "restart") {
            camerapos = request.camerapos;
            camerasize = request.camerasize;
            injectCode(true, request.countdown);
        } else if (request.type == "update-camera") {
            if (request.id == "disabled" || request.id == 0) {
                cameraEnabled(false);
            } else if (request.id == "disabled-access") {
                $("#"+uniqueid+" #camera").addClass("camera-on");
                $("#"+uniqueid+" #toolbar-settings").addClass("settings-camon");
                $("#"+uniqueid+" #wrap-iframe").addClass("no-camera");
                $("#"+uniqueid+" #hide-camera").addClass("camera-hidden");
                $("#"+uniqueid+" #detect-iframe").addClass("no-camera");
            } else {
                cameraEnabled(true);
            }
        } else if (request.type == "update-cmic") {
            if (request.id == "disabled" || request.id == 0) {
                micEnabled(false);
            } else {
                micEnabled(true);
            }
        } else if (request.type == "no-camera-access") {
            $("#"+uniqueid+" #camera").addClass("camera-on");
            $("#"+uniqueid+" #toolbar-settings").addClass("settings-camon");
            $("#"+uniqueid+" #wrap-iframe").addClass("no-camera");
            $("#"+uniqueid+" #hide-camera").addClass("camera-hidden");
            $("#"+uniqueid+" #detect-iframe").addClass("no-camera");
        }
    });
});