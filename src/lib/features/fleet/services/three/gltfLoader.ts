import { browser } from "$app/environment";
import { GLTFLoader } from "three-stdlib";
import { DRACOLoader } from "three-stdlib";

let gltfLoader: GLTFLoader;
let dracoLoader: DRACOLoader;

if (browser) {
  // Initialize DRACOLoader first
  dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/"); // path to draco decoder

  // Initialize GLTFLoader and attach DRACOLoader
  gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
}

// Export both if you need them elsewhere
export { gltfLoader, dracoLoader };