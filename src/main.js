import "./style.css";
import * as THREE from "three";
import { PointerLockControlsManifold } from "./PointerLockControlsManifold";

import jsonTest from "./assets/surface.json";

console.log(jsonTest);

/*
Camera and Renderer Setup
*/

const cameraHeight = 5;

let scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

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

const moveSpeed = 15;

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
box1.position.set(0, -3, -3);
scene.add(box1);

let loader = new THREE.ObjectLoader();

loader.load(
  // resource URL
  jsonTest,

  // onLoad callback
  function (obj) {
    scene.add(obj);
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

  const intersects = raycaster.intersectObjects(scene.children);

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
  camera.position.lerp(avatar.position, 0.05);
  camera.quaternion.slerp(avatar.quaternion, 0.1);

  prevTime = time;
}

animate();

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
