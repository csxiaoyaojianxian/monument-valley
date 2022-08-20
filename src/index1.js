/* eslint-disable guard-for-in */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import GameLevel from './core/GameLevel';
import Charactor from './element/Charactor';
import config from './settings';

// 载入关卡配置
import map from './levelConfig/level2';

class ActonGroup {
  constructor() {
    this.actions = [];
  }

  start() {
    this.actions.forEach((item) => {
      item.start();
    });
  }

  stop() {
    this.actions.forEach((item) => {
      item.stop();
    });
  }
}

const app = new window.NOVA.App();
window.app = app;
// const size = config.blockSize || app.getWorldHeight() / 20;
const size = app.getWorldHeight() / 20;
const level = new GameLevel(app, 0x4578ff, map, {
  blockSize: size,
  moveSpeed: config.moveSpeed,
});
app.world = level;

let charactor;

app.logicLoop.add(() => {
  window.TWEEN.update();
});

function loadMusic() {
  const audioListener = new window.THREE.AudioListener();
  level.camera.add(audioListener);
  const bgm = new window.THREE.Audio(audioListener);
  const winSound = new window.THREE.Audio(audioListener);

  level.scene.add(bgm);
  level.scene.add(winSound);
  const loader = new window.THREE.AudioLoader();
  loader.load(
    'audio/bgm.mp3',
    (audioBuffer) => {
      bgm.setBuffer(audioBuffer);
      bgm.play();
      bgm.setLoop(true);
    },
  );
  loader.load(
    'audio/win.mp3',
    (audioBuffer) => {
      winSound.setBuffer(audioBuffer);
      level.winSound = winSound;
    },
  );
}

function loadKey() {
  const mtlLoader = new window.THREE.MTLLoader(level.loaderFactory.manager);
  mtlLoader.setPath('models/key/');
  mtlLoader.load('mariokey.mtl', (materials) => {
    materials.preload();
    const objLoader = new window.THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('models/key/');
    objLoader.load('mariokey.obj', (obj) => {
      level.meshFactory.addUserObjectCreator('key', (item, useless, container) => {
        const mesh = obj.children[0].clone();
        mesh.scale.set(item.sx || 1, item.sy || 1, item.sz || 1);
        mesh.position.set(item.x * size || 0, item.y * size || 0, item.z
          * size || 0);
        mesh.rotation.set(item.rx || 0, item.ry || 0, item.rz || 0);
        container.add(mesh);
        return mesh;
      });
    });
  });
}

function createBoneAnimation(bone, smd, id, isLoop, duration, callback) {
  const smdloader = new window.THREE.FileLoader(level.loaderFactory.manager);
  smdloader.load(`models/Mario/smd/${smd}.smd`, (smd) => {
    const actionGroup = new ActonGroup();
    const smdobj = parseSMD(smd);
    findBone(bone, smdobj);
    for (let i = 0; i < smdobj.length; i++) {
      smdobj[i].bone.rotation.order = 'ZYX';
      actionGroup.actions.push(animate(smdobj[i], isLoop, duration));
    }
    charactor.actions[id] = actionGroup;

    if (callback) {
      callback();
    }
  });
}

const loader = new window.THREE.ColladaLoader(level.loaderFactory.manager);
loader.load('models/Mario/mario.dae', (collada) => {
  const elf = collada.scene;
  elf.rotation.y = Math.PI / 2;

  charactor = new Charactor(level, {
    model: elf,
    scale: {
      x: 2,
      y: 2,
      z: 2,
    },
  });

  createBoneAnimation(elf.children[1].skeleton.bones, 'mario_run', 'walk', true, 30);
  createBoneAnimation(elf.children[1].skeleton.bones, 'mario_wait', 'idle', true, 30, () => {
    charactor.play('idle');
    level.setCharactor(charactor);
  });
  createBoneAnimation(elf.children[1].skeleton.bones, 'mario_clear', 'win', false, 16);

  for (const mesh of elf.children) {
    if (mesh.material) {
      mesh.material.shininess = 0;
    }
  }
});

function animate(smdobj, isLoop = true, duration = 30) {
  const animateObj = {
    smdobj,
    index: 0,
    loop: isLoop,
    time: duration,
    stop: () => {
      if (animateObj.tr) {
        animateObj.tr.stop();
      }
      if (animateObj.tp) {
        animateObj.tp.stop();
      }
    },
    start: () => {
      const { bone } = animateObj.smdobj;
      const pa = animateObj.smdobj.position;
      const ra = animateObj.smdobj.rotation;
      bone.position.set(pa[animateObj.index], pa[animateObj.index + 1], pa[animateObj.index + 2]);
      bone.rotation.set(ra[animateObj.index], ra[animateObj.index + 1], ra[animateObj.index + 2]);
      animateObj.index += 3;
      ani();

      function ani() {
        animateObj.tr = new TWEEN.Tween(bone.rotation)
          .to({
            x: ra[animateObj.index],
            y: ra[animateObj.index + 1],
            z: ra[animateObj.index + 2],
          }, animateObj.time)
          .start();
        animateObj.tp = new TWEEN.Tween(bone.position)
          .to({
            x: pa[animateObj.index],
            y: pa[animateObj.index + 1],
            z: pa[animateObj.index + 2],
          }, animateObj.time)
          .start()
          .onComplete(() => {
            animateObj.index += 3;
            if (animateObj.index >= pa.length) {
              animateObj.index = 0;
              if (animateObj.loop) {
                ani();
              }
            } else {
              ani();
            }
          });
      }
    },
  };
  return animateObj;
}

function parseNodes(bodyObj, line) {
  const info = line.split(' ');
  bodyObj[parseInt(info[0], 10)] = {
    name: info[1].substr(1, info[1].length - 2),
    parent: info[2],
    position: [],
    rotation: [],
    bone: undefined,
  };
}

function parseSkeleton(bodyObj, line) {
  if (line.indexOf('time') > -1) {
    bodyObj.tmpIndex = parseInt(line.split(' ')[1], 10);
    return;
  }
  const info = line.split(' ');

  const obj = bodyObj[parseInt(info[0], 10)];
  obj.position.push(parseFloat(info[1]));
  obj.position.push(parseFloat(info[2]));
  obj.position.push(parseFloat(info[3]));

  obj.rotation.push(parseFloat(info[4]));
  obj.rotation.push(parseFloat(info[5]));
  obj.rotation.push(parseFloat(info[6]));
}

function parseSMD(text) {
  const bodyObj = [];
  let index = 0;
  const passage = text.split('\n');
  const passageLen = passage.length;
  let flag;

  for (index = 0; index < passageLen; index++) {
    const line = passage[index];

    if (!flag) {
      if (line.indexOf('nodes') > -1) {
        flag = 'nodes';
        continue;
      } else if (line.indexOf('skeleton') > -1) {
        flag = 'skeleton';
        continue;
      }
    }
    if (!flag) {
      continue;
    }
    if (line.indexOf('end') > -1) {
      flag = undefined;
      continue;
    }
    if (flag === 'nodes') {
      parseNodes(bodyObj, line);
    } else if (flag === 'skeleton') {
      parseSkeleton(bodyObj, line);
    }
  }
  return bodyObj;
}

function findBone(bone, smd) {
  for (const i in bone) {
    smd[i].bone = bone[i];
  }
}

loadKey();
loadMusic();
