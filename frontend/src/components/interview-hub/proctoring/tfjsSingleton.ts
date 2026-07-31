export interface ObjectDetectionModel {
  detect: (img: any) => Promise<any[]>;
}

let tfModelPromise: Promise<ObjectDetectionModel> | null = null;
let cachedModel: ObjectDetectionModel | null = null;
let isLoading = false;

/**
 * Lazy loads TensorFlow.js and COCO-SSD object detection model as a singleton.
 * Ensures model loading occurs once per session and stays cached in memory.
 */
export async function loadCocoSsdModel(
  onProgress?: (stepMessage: string) => void
): Promise<ObjectDetectionModel> {
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
      const tf = await import("@tensorflow/tfjs");
      onProgress?.("Loading AI Proctor");
      if (tf && typeof tf.ready === "function") {
        await tf.ready();
      }

      onProgress?.("Loading Object Detection");
      const coco = await import("@tensorflow-models/coco-ssd");
      const model = await coco.load({
        base: "lite_mobilenet_v2",
      });

      cachedModel = model;
      isLoading = false;
      onProgress?.("Ready");
      return model;
    } catch (err) {
      tfModelPromise = null;
      isLoading = false;
      console.error("[TF.js Proctoring] AI model load error:", err);
      throw err;
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
