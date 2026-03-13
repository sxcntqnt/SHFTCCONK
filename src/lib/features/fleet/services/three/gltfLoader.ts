import { browser } from "$app/environment"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader"

let draco: DRACOLoader | undefined

if (browser) {
  draco = new DRACOLoader()
  draco.setDecoderPath("/draco/")
}

export { draco }