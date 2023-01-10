import "./style.css";
import * as THREE from "three";
import { PointerLockControlsManifold } from "./PointerLockControlsManifold";

import surfaceURL from "./assets/geometry/surface_to_flat.json?url";
import { seededRandom } from "three/src/math/MathUtils";

let surfaceMaxFrame = 0;
const surfaceFrames = [];
let surface = new THREE.Object3D();

const gridScale = 60;
const gridSize = 3;
const gridLerp = 0.05;
const gridSink = 2 * gridScale;
let gridDown = false;
let gridAnimation = false;
const gridAnimationError = 0.0001;
const grid = [];

const gridOffset = Math.floor(gridSize / 2);

/*
Camera and Renderer Setup
*/

const animationDelay = 80;
const cameraAnimationPos = new THREE.Vector3(750, 750, 750);

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
let boxGeometry = new THREE.BoxGeometry(1, 1, 2);

const box1 = new THREE.Mesh(boxGeometry, new THREE.MeshNormalMaterial());
box1.position.set(0, 3, 0);
scene.add(box1);

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
    gridAnimation = true;
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

  if (gridAnimation) {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (i != gridOffset || i != j) {
          grid[i][j].visible = true;
          const gridPos = new THREE.Vector3(grid[i][j].position.x, -gridDown * gridSink, grid[i][j].position.z);
          const distGridLerp =
            (gridLerp * (gridSize * gridScale ** 2)) / (grid[i][j].position.x ** 2 + grid[i][j].position.z ** 2);

          grid[i][j].position.lerp(gridPos, distGridLerp);
          grid[i][j].scale.lerp(new THREE.Vector3(!gridDown, !gridDown, !gridDown), gridLerp);

          if (grid[i][j].position.y < -gridSink + 1000 * gridAnimationError) {
            grid[i][j].visible = false;
          }
        }
      }
    }
    if (grid[0][0].position.y > -gridAnimationError || grid[0][0].position.y < -gridSink + gridAnimationError) {
      gridAnimation = false;
    }
  }

  prevTime = time;
}

animate();

function surfaceMinimal() {
  if (surfaceFrames[surfaceMaxFrame].visible) {
    controls.isLocked = false;
    gridDown = true;
    gridAnimation = true;
    camera.position.lerp(cameraAnimationPos, cameraLerp);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    callNTimes(
      function (num) {
        surfaceFrames[num].visible = false;
        surfaceFrames[num - 1].visible = true;
        surface = surfaceFrames[num - 1];

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
    camera.position.lerp(cameraAnimationPos, cameraLerp);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    callNTimes(
      function (num) {
        surfaceFrames[surfaceMaxFrame - num].visible = false;
        surfaceFrames[surfaceMaxFrame - num + 1].visible = true;
        surface = surfaceFrames[surfaceMaxFrame - num + 1];

        if (num == 1) {
          controls.isLocked = true;
          gridDown = false;
          gridAnimation = true;
        }
      },
      surfaceMaxFrame,
      animationDelay
    );
  }
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
