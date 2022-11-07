import * as THREE from "https://unpkg.com/three@0.108.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js";
// import { FBXLoader } from "https://unpkg.com/three@0.108.0/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "https://unpkg.com/three@0.108.0/examples/jsm/loaders/GLTFLoader.js";
import Stats from "https://unpkg.com/three@0.108.0/examples/jsm/libs/stats.module.js";

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

const container = document.querySelector("#canvasWrap");
let scene, camera, renderer, prevTime;
let controls, boxHelper, stats, fps;

/** 캐릭터 속도 관련 변수들 */
let moveSpeed = 0;
let maxSpeed = 0;
let acceleration = 0;

/** 애니메이션 관련 정의 */
let mixer, currentAnimationAction;
const animationsMap = {};
const pressedKeys = {};

let model = new THREE.Object3D();

const init = () => {
  scene = new THREE.Scene();
  //   scene.background = new THREE.Color("#eee"); //배경 컬러
  camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 1, 5000);
  camera.position.set(0, 100, 180);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  // 렌더러 쉐도우 효과 적용
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMshadowMap;

  // document.body.appendChild(renderer.domElement);
  container.appendChild(renderer.domElement);

  //카메라 컨트롤
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 100, 0);
  controls.enablePan = false;
  controls.enableDamping = true;

  /** fps 상태창 */
  stats = new Stats();
  container.appendChild(stats.dom);
  fps = stats;

  //바닥
  {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    const material = new THREE.MeshPhongMaterial({
      color: 0xeeeeee,
    });
    const boxMesh = new THREE.Mesh(geometry, material);
    boxMesh.rotation.x = -Math.PI / 2;
    boxMesh.receiveShadow = true;
    scene.add(boxMesh);
  }

  const axes = new THREE.AxesHelper(1000);
  scene.add(axes);

  const gridHelper = new THREE.GridHelper(1000, 20);
  //   scene.add(gridHelper);

  // 포인트 라이트 추가
  const addPointLight = (helperColor, ...pos) => {
    const color = 0xffffff;
    const intensity = 1.5;
    const light = new THREE.PointLight(color, intensity);

    light.position.set(...pos);
    scene.add(light);

    // 헬퍼 추가
    const pointLightHelper = new THREE.PointLightHelper(light, 10, helperColor);
    scene.add(pointLightHelper);
  };

  // 기본 조명 넣기
  {
    var light = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
    light.position.set(100, 100, 100);
    scene.add(light);

    // 무대 밝히는 사이드 조명 추가
    addPointLight(0xff0000, 500, 150, 500);
    addPointLight(0xffff00, -500, 150, 500);
    addPointLight(0x00ff00, -500, 150, -500);
    addPointLight(0x0000ff, 500, 150, -500);

    // 그림자용 조명 추가
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.2);
    shadowLight.position.set(200, 500, 200);
    shadowLight.target.position.set(0, 0, 0);

    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = 1024;
    shadowLight.shadow.mapSize.height = 1024;
    shadowLight.shadow.radius = 5;
    shadowLight.shadow.camera.top = shadowLight.shadow.camera.right = 700;
    shadowLight.shadow.camera.bottom = shadowLight.shadow.camera.left = -700;
    shadowLight.shadow.camera.near = 100;
    shadowLight.shadow.camera.far = 900;
    const shadowCameraHelper = new THREE.CameraHelper(
      shadowLight.shadow.camera
    );
    scene.add(shadowLight);
    scene.add(shadowCameraHelper);

    scene.add(shadowLight.target);

    // 헬퍼 추가
    const dicrectionalLightHelper = new THREE.DirectionalLightHelper(
      shadowLight,
      10
    );
    scene.add(dicrectionalLightHelper);
  }
  //   {
  //     //안개
  //     const near = 1;
  //     const far = 250;
  //     const color = "#eeeeee";
  //     scene.fog = new THREE.Fog(color, near, far);
  //   }

  fbxLoadFunc("model/brian.glb");
};

/**
 * animation fade In/Out으로 자연스러운 동작 변환 연출
 * @param {string} name animationsMap의 key
 */
const changeAnimation = () => {
  const prevAnimationAction = currentAnimationAction;
  if (
    pressedKeys["w"] ||
    pressedKeys["a"] ||
    pressedKeys["s"] ||
    pressedKeys["d"]
  ) {
    if (pressedKeys["shift"]) {
      currentAnimationAction = animationsMap["Run"];
      // moveSpeed = 350;
      maxSpeed = 350;
      acceleration = 3;
    } else {
      currentAnimationAction = animationsMap["Walk"];
      // moveSpeed = 80;
      maxSpeed = 80;
      acceleration = 3;
    }
  } else {
    currentAnimationAction = animationsMap["Stand"];
    moveSpeed = 0;
    maxSpeed = 0;
    acceleration = 0;
  }

  if (prevAnimationAction !== currentAnimationAction) {
    prevAnimationAction.fadeOut(0.5);
    currentAnimationAction.reset().fadeIn(0.5).play();
  }
};

const fbxLoadFunc = (modelName) => {
  const fbxLoader = new GLTFLoader();
  fbxLoader.load(
    modelName,
    (object) => {
      model = object.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          // child.receiveShadow = true;}
        }
      });

      // 바인딩 박스 추가
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = (box.max.y - box.min.y) / 2;
      boxHelper = new THREE.BoxHelper(model);
      scene.add(boxHelper);
      //크기 조절
      let scaleNum = 0.5;
      model.scale.set(scaleNum, scaleNum, scaleNum);

      mixer = new THREE.AnimationMixer(model);
      //   const controls = document.getElementById("controls");
      object.animations.forEach((animationClip) => {
        const name = animationClip.name;
        console.log(name);
        // console.log(name);
        // const animationBtn = document.createElement("div");
        //     animationBtn.classList = "button";
        //     animationBtn.innerText = name;
        //     animationBtn.addEventListener("click", () => {
        //       changeAnimation(name);
        //     });
        //     controls.appendChild(animationBtn);

        const animationAction = mixer.clipAction(animationClip);
        animationsMap[name] = animationAction;
      });

      currentAnimationAction = animationsMap["Stand"];
      currentAnimationAction.play();

      // model.add(object);
      scene.add(model);

      //트윈맥스 카메라 이동
      gsap.from(camera.position, {
        duration: 1.8,
        delay: 0,
        z: 0,
        ease: "Power4.easeInOut",
      });
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (error) => {
      console.log(error);
    }
  );
};

/**
 * 눌러진 키에 따른 카메라 각도 보정 function
 */
let prevDirectionOffset = 0;
const directionOffsetControl = () => {
  const pressedKey = pressedKeys;
  let directionOffest = 0; // w

  if (pressedKey["w"]) {
    if (pressedKey["a"]) {
      directionOffest = Math.PI / 4; // w+a (45도)
    } else if (pressedKey["d"]) {
      directionOffest = -Math.PI / 4; // w+d (-45도)
    }
  } else if (pressedKey["s"]) {
    if (pressedKey["a"]) {
      directionOffest = Math.PI / 4 + Math.PI / 2; // s+a (135도)
    } else if (pressedKey["d"]) {
      directionOffest = -Math.PI / 4 - Math.PI / 2; // s+d (-135도)
    } else {
      directionOffest = Math.PI; // s (180도)
    }
  } else if (pressedKey["a"]) {
    directionOffest = Math.PI / 2; // a (90도)
  } else if (pressedKey["d"]) {
    directionOffest = -Math.PI / 2; // d (-90도)
  } else {
    directionOffest = prevDirectionOffset;
  }
  prevDirectionOffset = directionOffest;
  return directionOffest;
};

const clock = new THREE.Clock();
const animate = (time) => {
  time *= 0.001;
  controls.update();
  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);

    const angleCameraDirectionAxisY =
      Math.atan2(
        camera.position.x - model.position.x,
        camera.position.z - model.position.z
      ) + Math.PI;

    const rotateQuarternion = new THREE.Quaternion();
    rotateQuarternion.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angleCameraDirectionAxisY + directionOffsetControl()
    );

    model.quaternion.rotateTowards(rotateQuarternion, THREE.Math.degToRad(5));

    const walkDirection = new THREE.Vector3();
    camera.getWorldDirection(walkDirection);

    walkDirection.y = 0;
    walkDirection.normalize();

    walkDirection.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      directionOffsetControl()
    );

    if (moveSpeed < maxSpeed) moveSpeed += acceleration;
    else moveSpeed -= acceleration * 2;

    const moveX = walkDirection.x * moveSpeed * delta;
    const moveZ = walkDirection.z * moveSpeed * delta;

    model.position.x += moveX;
    model.position.z += moveZ;

    camera.position.x += moveX;
    camera.position.z += moveZ;
    controls.target.set(model.position.x, model.position.y, model.position.z);
  }

  if (boxHelper) {
    boxHelper.update();
  }
  prevTime = time;
  fps.update();
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

const stageResize = () => {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  //카메라 비율을 화면 비율에 맞춘다
};

init();
animate();
window.addEventListener("resize", stageResize);
document.addEventListener("keydown", (event) => {
  pressedKeys[event.key.toLowerCase()] = true;
  changeAnimation();
});
document.addEventListener("keyup", (event) => {
  pressedKeys[event.key.toLowerCase()] = false;
  changeAnimation();
});
