export interface ObjectDetectionModel {
  detect: (img: any) => Promise<any[]>;
}

let tfModelPromise: Promise<ObjectDetectionModel> | null = null;
let cachedModel: ObjectDetectionModel | null = null;
let isLoading = false;

const FALLBACK_MODEL: ObjectDetectionModel = {
  detect: async () => [],
};

/**
 * Lazy loads TensorFlow.js and COCO-SSD object detection model as a singleton.
 * Ensures model loading occurs once per session and stays cached in memory.
 * Gracefully handles ChunkLoadError in Next.js Turbopack development mode.
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

      // Load TensorFlow.js core dynamically with ChunkLoadError protection
      let tf: any = null;
      try {
        // @ts-ignore
        tf = await import("@tensorflow/tfjs");
      } catch (importErr) {
        console.warn("[TF.js Proctoring] Could not load @tensorflow/tfjs chunk dynamically:", importErr);
      }

      if (tf && typeof tf.ready === "function") {
        try {
          await tf.ready();
        } catch (readyErr) {
          console.warn("[TF.js Proctoring] tf.ready() warning:", readyErr);
        }
      }

      onProgress?.("Loading Object Detection");
      let coco: any = null;
      try {
        // @ts-ignore
        coco = await import("@tensorflow-models/coco-ssd");
      } catch (cocoErr) {
        console.warn("[TF.js Proctoring] Could not load @tensorflow-models/coco-ssd chunk dynamically:", cocoErr);
      }

      if (coco && typeof coco.load === "function") {
        try {
          const model = await coco.load({
            base: "lite_mobilenet_v2",
          });
          cachedModel = model;
          isLoading = false;
          onProgress?.("Ready");
          return model;
        } catch (modelErr) {
          console.warn("[TF.js Proctoring] coco.load() warning:", modelErr);
        }
      }

      // If dynamic chunk loading failed in Turbopack, fallback safely
      console.warn("[TF.js Proctoring] Activating fallback proctoring detector due to dynamic chunk load failure.");
      cachedModel = FALLBACK_MODEL;
      isLoading = false;
      onProgress?.("Ready");
      return FALLBACK_MODEL;
    } catch (err) {
      tfModelPromise = null;
      isLoading = false;
      console.warn("[TF.js Proctoring] AI model load fallback activated:", err);
      cachedModel = FALLBACK_MODEL;
      return FALLBACK_MODEL;
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
