import "./style.css";
import * as THREE from "three";
import { PointerLockControlsManifold } from "./PointerLockControlsManifold";

import objects from "./assets/objects.json";
console.log(objects);

const surfaceURL = "./geometry/surface_to_flat.json";

let surfaceMaxFrame = 0;
const surfaceFrames = [];
let surface = new THREE.Object3D();

const gridScale = 60;
const gridSize = 3;
const gridSink = 2 * gridScale;
const gridNumFrames = 40;
const grid = [];

const gridOffset = Math.floor(gridSize / 2);

/*
Camera and Renderer Setup
*/

const animationDelay = 40;
const cameraAnimationPos = new THREE.Vector3(50, 50, 50);

const cameraFOV = 90;
const cameraHeight = 2;
const cameraLerp = 0.05;
const cameraSlerp = 0.1;
const moveSpeed = 7;

let scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(cameraFOV, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(0, cameraHeight, 0);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xeeeeee, 1);

document.body.appendChild(renderer.domElement);

let avatar = new THREE.Object3D();
avatar.position.copy(camera.position);
avatar.quaternion.copy(camera.quaternion);

let controls = new PointerLockControlsManifold(camera, avatar, document.body);
let raycaster = new THREE.Raycaster();

const blocker = document.getElementById("blocker");
const instructions = document.getElementById("instructions");

instructions.addEventListener("click", function () {
  controls.lock();
});

controls.addEventListener("lock", function () {
  instructions.style.display = "none";
  blocker.style.display = "none";
});

controls.addEventListener("unlock", function () {
  blocker.style.display = "block";
  instructions.style.display = "";
});

scene.add(controls.getObject());

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const onKeyDown = function (event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;

    case "KeyO":
      surfaceFlat();
      break;
    case "KeyP":
      surfaceMinimal();
      break;
  }
};

const onKeyUp = function (event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
  }
};

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

/*
Lighting
*/
let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
hemiLight.color.setHSL(0.6, 0.6, 0.6);
hemiLight.groundColor.setHSL(0.1, 1, 0.4);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

let dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.color.setHSL(0.1, 1, 0.95);
dirLight.position.set(-1, 1.75, 1);
dirLight.position.multiplyScalar(100);
scene.add(dirLight);

dirLight.castShadow = true;

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;

let d = 50;

dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

dirLight.shadow.camera.far = 13500;

/*
Add Objects
*/

/*
let upQuaternion = new THREE.Quaternion();
upQuaternion.setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(Math.sqrt(3) / 3, Math.sqrt(3) / 3, Math.sqrt(3) / 3)
);

let floorGeometry = new THREE.PlaneGeometry(200, 200, 100, 100);
floorGeometry.rotateX(-Math.PI / 2);
floorGeometry.applyQuaternion(upQuaternion);

const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x049ef4 });

const floor = new THREE.Mesh(floorGeometry, floorMaterial);
scene.add(floor);
*/

let loader = new THREE.ObjectLoader();

loader.load(
  // resource URL
  surfaceURL,

  // onLoad callback
  function (fileScene) {
    scene.add(fileScene);

    surfaceMaxFrame = fileScene.children.length - 1;

    fileScene.children.forEach(function (obj) {
      const frameIndex = parseInt(obj.name);
      obj.material.side = THREE.DoubleSide;
      if (frameIndex != surfaceMaxFrame) {
        obj.visible = false;
      } else {
        surface = obj;
      }
      surfaceFrames[frameIndex] = obj;
    });

    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        if (i != gridOffset || i != j) {
          grid[i][j] = surface.clone();

          grid[i][j].translateX((i - gridOffset) * gridScale);
          grid[i][j].translateZ((j - gridOffset) * gridScale);

          const gridPos = new THREE.Vector3();
          gridPos.copy(grid[i][j].position);
          grid[i][j].translateY(-gridSink);

          scene.add(grid[i][j]);
        }
      }
    }
    gridUp();
    console.log(scene);
  },

  // onProgress callback
  function (xhr) {
    //progressText(xhr); // delete this if you don't want the progress text
  },

  // onError callback
  function (err) {
    console.error("An error happened");
  }
);

for (let name in objects) {
  const url = "./geometry/objects/" + name + ".json";

  const boxDiag = new THREE.Vector3();
  boxDiag.copy(objects[name].boundingBox.max);
  boxDiag.sub(objects[name].boundingBox.min);

  const boxGeometry = new THREE.BoxGeometry(boxDiag.x, boxDiag.y, boxDiag.z);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x71797e, transparent: true, opacity: 0.25 });

  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  const loadBox = new THREE.Mesh(boxGeometry, boxMaterial);

  box.position.copy(objects[name]["flatPos"]);
  box.quaternion.multiply(objects[name]["flatQuat"]);
  loadBox.position.copy(objects[name]["flatPos"]);
  loadBox.quaternion.multiply(objects[name]["flatQuat"]);

  loadBox.material.transparent = false;

  scene.add(box);
  scene.add(loadBox);

  loader.load(
    url,

    // onLoad callback
    function (fileScene) {
      scene.add(fileScene);
      objects[name]["instance"] = fileScene;

      // make threejs center of imported scene the same as the imported object's center
      fileScene.children.forEach(function (obj) {
        obj.geometry.translate(-objects[name]["flatPos"].x, -objects[name]["flatPos"].y, -objects[name]["flatPos"].z);
      });
      fileScene.position.copy(objects[name]["flatPos"]);

      scene.remove(box);
      scene.remove(loadBox);
    },

    //onProgress callback
    function (xhr) {
      loadBox.scale.copy(new THREE.Vector3(1, xhr.loaded / xhr.total, 1));
    },

    // onError callback
    function (err) {
      console.error("An error happened");
    }
  );
}

/*
Animation Loop
*/
let prevTime = 0;

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);

  const time = performance.now();

  if (controls.isLocked) {
    const delta = time - prevTime;

    if (moveForward || moveBackward) {
      const cameraRight = new THREE.Vector3(1, 0, 0);
      cameraRight.applyQuaternion(camera.quaternion);

      const cameraForward = new THREE.Vector3();
      cameraForward.copy(camera.up);
      cameraForward.cross(cameraRight);
      cameraForward.normalize();
      cameraForward.multiplyScalar(((Number(moveForward) - Number(moveBackward)) * moveSpeed * delta) / 1000);

      const cameraNewPos = new THREE.Vector3();
      cameraNewPos.copy(camera.position);
      cameraNewPos.add(cameraForward);

      camera.position.copy(cameraNewPos);

      const avatarNewPos = new THREE.Vector3();
      avatarNewPos.copy(avatar.position);
      avatarNewPos.add(cameraForward);
      avatar.position.copy(avatarNewPos);
    }
    if (moveRight || moveLeft) {
      camera.translateX(((Number(moveRight) - Number(moveLeft)) * moveSpeed * delta) / 1000);

      avatar.translateX(((Number(moveRight) - Number(moveLeft)) * moveSpeed * delta) / 1000);
    }
  }

  const cameraDown = new THREE.Vector3();
  cameraDown.copy(camera.up);
  cameraDown.negate();

  //raycaster.set(camera.position, cameraDown);
  raycaster.set(avatar.position, cameraDown);

  const intersects = raycaster.intersectObject(surface);

  if (intersects.length > 0) {
    if (!intersects[0].face.normal.equals(camera.up) || intersects[0].distance != cameraHeight) {
      const cameraDisplacement = new THREE.Vector3();
      cameraDisplacement.copy(intersects[0].face.normal);
      cameraDisplacement.multiplyScalar(cameraHeight);

      const cameraPosition = new THREE.Vector3();
      cameraPosition.copy(intersects[0].point);
      cameraPosition.add(cameraDisplacement);

      //camera.position.copy(cameraPosition);
      avatar.position.copy(cameraPosition);

      const cameraQuaternionChange = new THREE.Quaternion();
      cameraQuaternionChange.setFromUnitVectors(camera.up, intersects[0].face.normal);

      //camera.applyQuaternion(cameraQuaternionChange);
      avatar.applyQuaternion(cameraQuaternionChange);

      camera.up.copy(intersects[0].face.normal);
    }
  }
  if (controls.isLocked) {
    camera.position.lerp(avatar.position, cameraLerp);
    camera.quaternion.slerp(avatar.quaternion, cameraSlerp);
  }

  prevTime = time;
}

animate();

function surfaceMinimal() {
  if (surfaceFrames[surfaceMaxFrame].visible) {
    controls.isLocked = false;
    camera.position.copy(cameraAnimationPos);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    gridDown();

    callNTimes(
      function (num) {
        surfaceFrames[num].visible = false;
        surfaceFrames[num - 1].visible = true;
        surface = surfaceFrames[num - 1];

        for (let name in objects) {
          const newVertexPos = new THREE.Vector3();
          newVertexPos.fromBufferAttribute(
            surfaceFrames[num - 1].geometry.getAttribute("position"),
            objects[name]["surfaceIndex"]
          );
          const oldVertexPos = new THREE.Vector3();
          oldVertexPos.fromBufferAttribute(
            surfaceFrames[num].geometry.getAttribute("position"),
            objects[name]["surfaceIndex"]
          );
          const newVertexNormal = new THREE.Vector3();
          newVertexNormal.fromBufferAttribute(
            surfaceFrames[num - 1].geometry.getAttribute("normal"),
            objects[name]["surfaceIndex"]
          );
          const oldVertexNormal = new THREE.Vector3();
          oldVertexNormal.fromBufferAttribute(
            surfaceFrames[num].geometry.getAttribute("normal"),
            objects[name]["surfaceIndex"]
          );

          newVertexPos.sub(oldVertexPos);
          objects[name]["instance"].position.add(newVertexPos);

          let quatRotation = new THREE.Quaternion();
          quatRotation.setFromUnitVectors(oldVertexNormal, newVertexNormal);
          objects[name]["instance"].quaternion.multiply(quatRotation);
        }

        if (num == 1) {
          controls.isLocked = true;
        }
      },
      surfaceMaxFrame,
      animationDelay
    );
  }
}

function surfaceFlat() {
  if (surfaceFrames[0].visible) {
    controls.isLocked = false;
    camera.position.copy(cameraAnimationPos);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    callNTimes(
      function (num) {
        surfaceFrames[surfaceMaxFrame - num].visible = false;
        surfaceFrames[surfaceMaxFrame - num + 1].visible = true;
        surface = surfaceFrames[surfaceMaxFrame - num + 1];

        for (let name in objects) {
          const newVertexPos = new THREE.Vector3();
          newVertexPos.fromBufferAttribute(
            surfaceFrames[surfaceMaxFrame - num + 1].geometry.getAttribute("position"),
            objects[name]["surfaceIndex"]
          );
          const oldVertexPos = new THREE.Vector3();
          oldVertexPos.fromBufferAttribute(
            surfaceFrames[surfaceMaxFrame - num].geometry.getAttribute("position"),
            objects[name]["surfaceIndex"]
          );
          const newVertexNormal = new THREE.Vector3();
          newVertexNormal.fromBufferAttribute(
            surfaceFrames[surfaceMaxFrame - num + 1].geometry.getAttribute("normal"),
            objects[name]["surfaceIndex"]
          );
          const oldVertexNormal = new THREE.Vector3();
          oldVertexNormal.fromBufferAttribute(
            surfaceFrames[surfaceMaxFrame - num].geometry.getAttribute("normal"),
            objects[name]["surfaceIndex"]
          );

          newVertexPos.sub(oldVertexPos);
          objects[name]["instance"].position.add(newVertexPos);

          let quatRotation = new THREE.Quaternion();
          quatRotation.setFromUnitVectors(oldVertexNormal, newVertexNormal);
          objects[name]["instance"].quaternion.multiply(quatRotation);
        }

        if (num == 1) {
          controls.isLocked = true;

          gridUp();
        }
      },
      surfaceMaxFrame,
      animationDelay
    );
  }
}

function gridUp() {
  callNTimes(
    function (num) {
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          if (i != gridOffset || i != j) {
            if (num == gridNumFrames) {
              grid[i][j].visible = true;
            }
            const gridPos = new THREE.Vector3(grid[i][j].position.x, 0, grid[i][j].position.z);
            const alpha = (gridNumFrames - num + 1) / gridNumFrames;
            grid[i][j].position.lerp(gridPos, alpha);
            grid[i][j].scale.lerp(new THREE.Vector3(1, 1, 1), alpha);
          }
        }
      }
    },
    gridNumFrames,
    animationDelay
  );
}

function gridDown() {
  callNTimes(
    function (num) {
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          if (i != gridOffset || i != j) {
            const gridPos = new THREE.Vector3(grid[i][j].position.x, -gridSink, grid[i][j].position.z);
            const alpha = (gridNumFrames - num + 1) / gridNumFrames;
            grid[i][j].position.lerp(gridPos, alpha);
            grid[i][j].scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), alpha);

            if (num == 1) {
              grid[i][j].visible = false;
            }
          }
        }
      }
    },
    gridNumFrames,
    animationDelay
  );
}

function callNTimes(func, num, delay) {
  if (!num) return;
  func(num);
  setTimeout(function () {
    callNTimes(func, num - 1, delay);
  }, delay);
}

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
