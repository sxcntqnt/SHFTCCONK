import { setGltfOptions } from "@threlte/extras"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"

const draco = new DRACOLoader()
draco.setDecoderPath("/draco/")

setGltfOptions({
  dracoLoader: draco
})