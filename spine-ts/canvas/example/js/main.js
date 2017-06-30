// EASELJS IMPLEMENTATION
var easelCanvas = document.createElement('canvas');
var easelStage = new createjs.Stage(easelCanvas);
easelCanvas.width = window.innerWidth;
easelCanvas.height = window.innerHeight;
document.body.appendChild(easelCanvas);
createjs.Ticker.addEventListener("tick", handleTick);

function handleTick(event) {
  easelStage.update();
}

function addSpineToEasel(c) {
  var circle = new createjs.Shape(); // background easel layer just for testing
  circle.graphics.beginFill("Chartreuse").drawCircle(0, 0, 50);
  circle.x = 100;
  circle.y = 50;
  easelStage.addChild(circle);

  var bm = new createjs.Bitmap(c);
  var cntr = new createjs.Container();
  cntr.addChild(bm);
  easelStage.addChild(cntr);

  var circle = new createjs.Shape();  // foreground easel layer just for testing
  circle.graphics.beginFill("DeepSkyBlue").drawCircle(0, 0, 50);
  circle.x = 100;
  circle.y = 125;
  easelStage.addChild(circle);

}


/* Pass assetObj with required properties shown below
 * If assetObj is preloaded with the properties 'atlasTxt', 'jsonObj', or 'pngImg' they will pass directly without loading
 * If assetObj is missing any or all preloaded props, the missing assets will be loaded as needed.
 */
var assetObj = {
  'dir': 'assets/LEO/cheer/', // don't forget trailing slash
  'fname': 'anim_cheer_leo',
  'anim': 'animation'
}

/* Toggle the following 2 lines to test with and without preload (do not enable both simultaneously) */
preload()
//init(assetObj);

/* This 'preload' function is for only for testing and should be deleted in production */
function preload() {
  var atlas = xhrReq('GET', assetObj.dir + assetObj.fname + '.atlas', 'text');
  var json = xhrReq('GET', assetObj.dir + assetObj.fname + '.json', 'json');
  var png = loadImg(assetObj.dir + assetObj.fname + '.png');
  Promise.all([atlas, json, png]).then(function(values) {
    assetObj.atlasTxt = values[0];
    assetObj.jsonObj = values[1];
    assetObj.pngImg = values[2];
    console.log('Assets were preloaded.');
    init(assetObj);
  });

  function xhrReq(method, url, type) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.responseType = type;
      xhr.onload = function() {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject('Oh Snap! ' + xhr.statusText);
        }
      };
      xhr.onerror = function() {
        reject('Oh Snap! There was an error.');
      };
      xhr.send();
    });
  }

  function loadImg(src) {
    return new Promise(function(resolve, reject) {
      var img = document.createElement('img');
      img.src = src;
      img.onload = function() {
        resolve(img);
      };
    });
  }
}

/* This is the start of the original source, modified to accept preloaded assets.
 * All other repo code was left untouched
 */
var spineCanvas = document.createElement('canvas');
var lastFrameTime = Date.now() / 1000;
var context;
var assetManager;
var skeleton, state, bounds;
var skeletonRenderer;

function init(assetObj) {
  context = spineCanvas.getContext("2d");

  skeletonRenderer = new spine.canvas.SkeletonRenderer(context);
  // enable debug rendering
  skeletonRenderer.debugRendering = false;
  // enable the triangle renderer, supports meshes, but may produce artifacts in some browsers
  skeletonRenderer.triangleRendering = false;

  assetManager = new spine.canvas.AssetManager();

  if (assetObj.jsonObj) {
    assetManager.assets[assetObj.dir + assetObj.fname + ".json"] = assetObj.jsonObj;
  } else {
    assetManager.loadText(assetObj.dir + assetObj.fname + ".json");
  }

  if (assetObj.atlasTxt) {
    assetManager.assets[assetObj.dir + assetObj.fname + ".atlas"] = assetObj.atlasTxt;
  } else {
    assetManager.loadText(assetObj.dir + assetObj.fname.replace("-pro", "").replace("-ess", "") + ".atlas");
  }

  if (assetObj.pngImg) {
    assetManager.assets[assetObj.dir + assetObj.fname + ".png"] = assetManager.textureLoader(assetObj.pngImg);
  } else {
    assetManager.loadTexture(assetObj.dir + assetObj.fname.replace("-pro", "").replace("-ess", "") + ".png");
  }

  if (assetObj.jsonObj && assetObj.atlasTxt && assetObj.pngImg) {
    loadComplete();
  } else {
    requestAnimationFrame(loadProgress);
  }

  function loadProgress() {
    if (assetManager.isLoadingComplete()) {
      loadComplete();
    } else {
      requestAnimationFrame(loadProgress);
    }
  }

  function loadComplete() {
    var data = loadSkeleton(assetObj.fname, assetObj.anim, "default");
    skeleton = data.skeleton;
    state = data.state;
    bounds = data.bounds;
    spineCanvas.width = Math.ceil(bounds.size.x);
    spineCanvas.height = Math.ceil(bounds.size.y);

    addSpineToEasel(spineCanvas);
    requestAnimationFrame(render);
  }
}

function loadSkeleton(name, initialAnimation, skin) {
  if (skin === undefined) skin = "default";

  // Load the texture atlas using name.atlas and name.png from the AssetManager.
  // The function passed to TextureAtlas is used to resolve relative paths.
  atlas = new spine.TextureAtlas(assetManager.get(assetObj.dir + assetObj.fname.replace("-pro", "").replace("-ess", "") + ".atlas"), function(fname) {
    return assetManager.get(assetObj.dir + fname);
  });

  // Create a AtlasAttachmentLoader, which is specific to the WebGL backend.
  atlasLoader = new spine.AtlasAttachmentLoader(atlas);

  // Create a SkeletonJson instance for parsing the .json file.
  var skeletonJson = new spine.SkeletonJson(atlasLoader);

  // Set the scale to apply during parsing, parse the file, and create a new skeleton.
  var skeletonData = skeletonJson.readSkeletonData(assetManager.get(assetObj.dir + name + ".json"));
  var skeleton = new spine.Skeleton(skeletonData);
  skeleton.flipY = true;
  var bounds = calculateBounds(skeleton);
  skeleton.setSkinByName(skin);

  // Create an AnimationState, and set the initial animation in looping mode.
  var animationState = new spine.AnimationState(new spine.AnimationStateData(skeleton.data));
  animationState.setAnimation(0, initialAnimation, true);
  animationState.addListener({
    event: function(trackIndex, event) {
      // console.log("Event on track " + trackIndex + ": " + JSON.stringify(event));
    },
    complete: function(trackIndex, loopCount) {
      // console.log("Animation on track " + trackIndex + " completed, loop count: " + loopCount);
    },
    start: function(trackIndex) {
      // console.log("Animation on track " + trackIndex + " started");
    },
    end: function(trackIndex) {
      // console.log("Animation on track " + trackIndex + " ended");
    }
  })

  // Pack everything up and return to caller.
  return { skeleton: skeleton, state: animationState, bounds: bounds };
}

function calculateBounds(skeleton) {
  var data = skeleton.data;
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform();
  var offset = new spine.Vector2();
  var size = new spine.Vector2();
  skeleton.getBounds(offset, size, []);
  return { offset: offset, size: size };
}

function render() {
  var now = Date.now() / 1000;
  var delta = now - lastFrameTime;
  lastFrameTime = now;

  resize();

  /*
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = "#cccccc";
  context.fillRect(0, 0, spineCanvas.width, spineCanvas.height);
  context.restore();
  */

  state.update(delta);
  state.apply(skeleton);
  skeleton.updateWorldTransform();
  skeletonRenderer.draw(skeleton);

  /*
  context.strokeStyle = "green";
  context.beginPath();
  context.moveTo(-1000, 0);
  context.lineTo(1000, 0);
  context.moveTo(0, -1000);
  context.lineTo(0, 1000);
  context.stroke();
  */

  requestAnimationFrame(render);
}

function resize() {
  /*
	var w = spineCanvas.clientWidth;
	var h = spineCanvas.clientHeight;
	if (spineCanvas.width != w || spineCanvas.height != h) {
		spineCanvas.width = w;
		spineCanvas.height = h;
	}
  */

  // magic

  spineCanvas.width = spineCanvas.width; // there seems to be an issue where stage does not clear even with "clearRect".  This hack fixes it...

  var centerX = bounds.offset.x + bounds.size.x / 2;
  var centerY = bounds.offset.y + bounds.size.y / 2;
  var scaleX = bounds.size.x / spineCanvas.width;
  var scaleY = bounds.size.y / spineCanvas.height;
  var scale = Math.max(scaleX, scaleY) * 1.2;
  if (scale < 1) scale = 1;
  var width = spineCanvas.width * scale;
  var height = spineCanvas.height * scale;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(1 / scale, 1 / scale);
  context.translate(-centerX, -centerY);
  context.translate(width / 2, height / 2);
}
