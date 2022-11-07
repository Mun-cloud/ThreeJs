import * as THREE from "https://unpkg.com/three@0.108.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.108.0/examples/jsm/controls/OrbitControls.js";
// import { FBXLoader } from "https://unpkg.com/three@0.108.0/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "https://unpkg.com/three@0.108.0/examples/jsm/loaders/GLTFLoader.js";

let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

let scene, camera, renderer;
let controls;

/** 애니메이션 관련 정의 */
let mixer, currentAnimationAction;
const animationsMap = {};

let model = new THREE.Object3D();

const init = () => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#eee"); //배경 컬러
  camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 1, 1000);
  camera.position.set(0, 50, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;

  // document.body.appendChild(renderer.domElement);
  document.querySelector("#canvasWrap").appendChild(renderer.domElement);

  //카메라 컨트롤
  controls = new OrbitControls(camera, renderer.domElement);

  //바닥
  const geometry = new THREE.BoxGeometry(5000, 1, 5000);
  const material = new THREE.MeshPhongMaterial({
    color: 0xeeeeee,
  });
  const boxMesh = new THREE.Mesh(geometry, material);
  boxMesh.position.set(0, -1, 0);
  boxMesh.receiveShadow = true;
  scene.add(boxMesh);

  const axes = new THREE.AxesHelper(150);
  scene.add(axes);

  const gridHelper = new THREE.GridHelper(240, 20);
  scene.add(gridHelper);
  {
    //조명 넣기
    var light = new THREE.HemisphereLight(0xffffff, 0x080820, 1);
    light.position.set(100, 100, 100);
    scene.add(light);
  }
  {
    //조명
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.PointLight(color, intensity);
    light.castShadow = true;

    light.position.set(40, 100, 40);

    light.shadow.mapSize.width = 1024 * 2;
    light.shadow.mapSize.height = 1024 * 2;
    light.shadow.radius = 10;

    scene.add(light);
  }
  //   {
  //     //안개
  //     const near = 1;
  //     const far = 250;
  //     const color = "#eeeeee";
  //     scene.fog = new THREE.Fog(color, near, far);
  //   }

  fbxLoadFunc("model/joe.glb", "mixamo.com", 0, 10, 0);
  //   fbxLoadFunc("./model/DismissingGesture.FBX", "mixamo.com", 12, 0, -300);
};

/**
 * animation fade In/Out으로 자연스러운 동작 변환 연출
 * @param {string} name animationsMap의 key
 */
const changeAnimation = (name) => {
  const prevAnimationAction = currentAnimationAction;
  currentAnimationAction = animationsMap[name];
  if (prevAnimationAction !== currentAnimationAction) {
    prevAnimationAction.fadeOut(0.5);
    currentAnimationAction.reset().fadeIn(0.5).play();
  }
};

const fbxLoadFunc = (modelName, animationName, ...pos) => {
  const fbxLoader = new GLTFLoader();
  fbxLoader.load(
    modelName,
    (object) => {
      model = object.scene;
      console.log(model);

      //크기 조절
      let scaleNum = 0.1;
      model.scale.set(scaleNum, scaleNum, scaleNum);
      model.position.set(...pos);

      // object.traverse(function (child) {
      //   if (child.isMesh) {
      //     child.castShadow = true;
      //     // child.receiveShadow = true;
      //   }
      // });

      mixer = new THREE.AnimationMixer(model);
      const controls = document.getElementById("controls");
      object.animations.forEach((animationClip) => {
        const name = animationClip.name;

        const animationBtn = document.createElement("div");
        animationBtn.classList = "button";
        animationBtn.innerText = name;
        animationBtn.addEventListener("click", () => {
          changeAnimation(name);
        });
        controls.appendChild(animationBtn);

        const animationAction = mixer.clipAction(animationClip);
        animationsMap[name] = animationAction;
      });

      currentAnimationAction = animationsMap["Idle"];
      currentAnimationAction.play();
      // //애니메이션
      // object.mixer = new THREE.AnimationMixer(object);
      // const clips = object.animations;
      // mixers.push(object.mixer);
      // // console.log(mixers.length);

      // if (mixers.length > 0) {
      //   const clip = THREE.AnimationClip.findByName(clips, animationName);
      //   let action = object.mixer.clipAction(clip);
      //   // console.log(action);
      //   action.play();
      // }

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

const clock = new THREE.Clock();

let solderZ = 0;
const animate = () => {
  //controls.update();
  const delta = clock.getDelta();
  // console.log(delta);
  if (mixer) {
    mixer.update(delta);
  }

  solderZ += 0.1;
  model.position.z = Math.sin(20);
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

/*
class App {
  constructor() {
    const divContainer = document.getElementById("canvasWrap");
    this._divContainer = divContainer;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    divContainer.appendChild(renderer.domElement);
    this._renderer = renderer;

    const scene = new THREE.Scene();
    this._scene = scene;

    this._setupCamera();
    this._setupLight();
    this._setupModel();
    this._setupControls();

    window.onresize = this.resize.bind(this);
    this.resize();

    requestAnimationFrame(this.render.bind(this));
  }

  _setupControls() {
    new OrbitControls(this._camera, this._divContainer);
  }
  _setupCamera() {
    const width = this._divContainer.clientWidth;
    const height = this._divContainer.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 2;
    this._camera = camera;
  }
  _setupLight() {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    this._scene.add(light);
  }
  _setupModel() {
    new GLTFLoader().load("./model/joe.glb", (gltf) => {
      const model = gltf.scene;
      this._scene.add(model);
    });
  }

  resize() {
    const width = this._divContainer.clientWidth;
    const height = this._divContainer.clientHeight;

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    this._renderer.setSize(width, height);
  }

  render(time) {
    this._renderer.render(this._scene, this._camera);
    // this.update(time);
    requestAnimationFrame(this.render.bind(this));
  }

  update(time) {}
}

new App();
*/
