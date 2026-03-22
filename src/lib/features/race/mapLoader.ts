//Src/lib/maploader
import * as THREE from 'three';
import { MAP_SCALE } from './constants';

export function loadMap(trackCode) {
  const parts = trackCode.trim().split('|');
  const wallData = parts[0].trim().split(/\s+/);
  const startData = parts[1].trim().split(/\s+/);
  const treeData = parts[2]?.trim().split(/\s+/) || [];
  const signData = parts[3]?.trim().split(/\s+/) || [];
  const backgroundCode = parts[4] || '';

  const walls = [];
  const start = [];
  const trees = [];
  const signs = [];

  // Walls
  wallData.forEach(line => {
    if (!line) return;
    const [p1Str, p2Str] = line.split('/');
    const p1 = new THREE.Vector2(...p1Str.split(',').map(Number));
    const p2 = new THREE.Vector2(...p2Str.split(',').map(Number));
    const wall = createWall(p1, p2);
    walls.push(wall);
  });

  // Start/Finish lines
  startData.forEach((line, idx) => {
    if (!line) return;
    const [p1Str, p2Str] = line.split('/');
    const p1 = new THREE.Vector2(...p1Str.split(',').map(Number));
    const p2 = new THREE.Vector2(...p2Str.split(',').map(Number));
    const color = idx === 0 ? 0x2580db : 0xdb2525;
    const lineMesh = createStartLine(p1, p2, color);
    start.push(lineMesh);
  });

  // Trees
  treeData.forEach(line => {
    if (!line) return;
    const [x, y] = line.split(',').map(Number);
    const tree = createTree(x, y);
    trees.push(tree);
  });

  // Signs
  signData.forEach(line => {
    if (!line) return;
    const [posStr, angleStr] = line.split('/');
    const [x, y, z] = posStr.split(',').map(Number);
    const angle = parseInt(angleStr);
    const sign = createSign(x, y, z, angle);
    signs.push(sign);
  });

  return { walls, start, trees, signs, backgroundCode };
}

function createWall(p1, p2) {
  const length = p1.distanceTo(p2) * MAP_SCALE + 0.3;
  const geometry = new THREE.BoxGeometry(length, 1.5, 0.3);
  const material = new THREE.MeshLambertMaterial({ color: 0xf48342 });
  const mesh = new THREE.Mesh(geometry, material);
  const center = new THREE.Vector2(-(p1.x + p2.x) / 2 * MAP_SCALE, (p1.y + p2.y) / 2 * MAP_SCALE);
  mesh.position.set(center.x, 0.75, center.y);
  const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  mesh.rotation.y = angle;
  // Attach collision data
  mesh.userData = {
    type: 'wall',
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)),
    width: length,
    p1: new THREE.Vector2(-p1.x * MAP_SCALE, p1.y * MAP_SCALE),
    p2: new THREE.Vector2(-p2.x * MAP_SCALE, p2.y * MAP_SCALE)
  };
  return mesh;
}

function createStartLine(p1, p2, color) {
  const length = p1.distanceTo(p2) * MAP_SCALE;
  const geometry = new THREE.BoxGeometry(length, 0.1, 1);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  const center = new THREE.Vector2(-(p1.x + p2.x) / 2 * MAP_SCALE, (p1.y + p2.y) / 2 * MAP_SCALE);
  mesh.position.set(center.x, 0, center.y);
  const angle = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  mesh.rotation.y = angle;
  mesh.userData = {
    type: 'checkpoint',
    index: color === 0x2580db ? 0 : 1,
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)),
    width: length
  };
  return mesh;
}

function createTree(x, y) {
  const geometry = new THREE.ConeGeometry(0, 4, 15);
  const material = new THREE.MeshLambertMaterial({ color: 0x1bad2c });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-x * MAP_SCALE, 0, y * MAP_SCALE);
  const scale = Math.random() + 1;
  mesh.scale.set(scale, scale, scale);
  mesh.userData = { type: 'tree' };
  return mesh;
}

function createSign(x, y, z, angle) {
  const geometry = new THREE.ConeGeometry(0.7, 2, 5);
  const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-x * MAP_SCALE, y + 1, z * MAP_SCALE);
  mesh.rotation.x = Math.PI / 2;
  mesh.rotation.y = angle * Math.PI / 180;
  mesh.userData = { type: 'sign' };
  return mesh;
}