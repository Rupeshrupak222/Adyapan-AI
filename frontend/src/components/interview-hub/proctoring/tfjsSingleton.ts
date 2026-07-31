import type * as cocoSsd from "@tensorflow-models/coco-ssd";

let tfModelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let cachedModel: cocoSsd.ObjectDetection | null = null;
let isLoading = false;

/**
 * Lazy loads TensorFlow.js and COCO-SSD object detection model as a singleton.
 * Ensures model loading occurs once per session and stays cached in memory.
 */
export async function loadCocoSsdModel(
  onProgress?: (stepMessage: string) => void
): Promise<cocoSsd.ObjectDetection> {
  if (cachedModel) {
    onProgress?.("Ready");
    return cachedModel;
  }

  if (tfModelPromise) {
    onProgress?.("Loading Object Detection...");
    return tfModelPromise;
  }

  isLoading = true;

  tfModelPromise = (async () => {
    try {
      onProgress?.("Preparing Interview Environment");
      // Dynamically import @tensorflow/tfjs and @tensorflow-models/coco-ssd
      const tf = await import("@tensorflow/tfjs");
      onProgress?.("Loading AI Proctor");

      // Ensure ready & backend set up
      await tf.ready();

      onProgress?.("Loading Object Detection");
      const coco = await import("@tensorflow-models/coco-ssd");
      const model = await coco.load({
        base: "lite_mobilenet_v2", // Lightweight model optimized for browser speed & low CPU usage
      });

      cachedModel = model;
      isLoading = false;
      onProgress?.("Ready");
      return model;
    } catch (err) {
      tfModelPromise = null;
      isLoading = false;
      console.error("[TF.js Proctoring] Error loading COCO-SSD model:", err);
      throw new Error("Failed to initialize AI object detection engine.");
    }
  })();

  return tfModelPromise;
}

export function isModelLoaded(): boolean {
  return cachedModel !== null;
}

export function isModelLoading(): boolean {
  return isLoading;
}
