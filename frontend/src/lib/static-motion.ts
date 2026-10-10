import { createElement, type ReactElement, type ComponentType } from "react";
import { motion as framerMotion, AnimatePresence } from "framer-motion";

type AnyProps = Record<string, unknown>;
type MotionComponent = ComponentType<AnyProps>;
type AnyFunction = (...args: unknown[]) => unknown;

const INSTANT_TRANSITION = {
  duration: 0,
  delay: 0,
  repeat: 0,
  repeatDelay: 0,
  ease: "linear",
} as const;

const STRIPPED_PROPS = new Set([
  "whileHover",
  "whileTap",
  "whilePress",
  "whileFocus",
  "whileDrag",
  "whileInView",
  "viewport",
  "drag",
  "dragConstraints",
  "dragDirectionLock",
  "dragElastic",
  "dragMomentum",
  "dragPropagation",
  "dragSnapToOrigin",
  "dragTransition",
  "layout",
  "layoutId",
  "layoutClip",
  "layoutDependency",
  "layoutRoot",
  "layoutScroll",
]);

function instantizeVariant(target: unknown): unknown {
  if (target && typeof target === "object" && !Array.isArray(target)) {
    return { ...(target as AnyProps), transition: INSTANT_TRANSITION };
  }
  return target;
}

function sanitizeVariants(variants: AnyProps): AnyProps {
  const out: AnyProps = {};
  for (const key of Object.keys(variants)) {
    const variant = variants[key];
    out[key] =
      typeof variant === "function"
        ? (...args: unknown[]) => instantizeVariant((variant as AnyFunction)(...args))
        : instantizeVariant(variant);
  }
  return out;
}

function sanitizeAnimTarget(value: unknown): unknown {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const obj = value as AnyProps;
    if ("transition" in obj) return { ...obj, transition: INSTANT_TRANSITION };
    return value;
  }
  return value;
}

const componentCache = new Map<string, MotionComponent>();
const framerComponents = framerMotion as unknown as Record<string, MotionComponent>;

function createStaticMotionComponent(tag: string): MotionComponent {
  const Component = (props: AnyProps): ReactElement => {
    const clean: AnyProps = {};
    for (const key of Object.keys(props)) {
      if (STRIPPED_PROPS.has(key)) continue;
      clean[key] = props[key];
    }
    clean.transition = INSTANT_TRANSITION;
    if ("animate" in clean) clean.animate = sanitizeAnimTarget(clean.animate);
    if ("exit" in clean) clean.exit = sanitizeAnimTarget(clean.exit);
    if ("variants" in clean) clean.variants = sanitizeVariants(clean.variants as AnyProps);
    return createElement(framerComponents[tag], clean);
  };
  Component.displayName = `StaticMotion.${tag}`;
  return Component;
}

export const motion = new Proxy({} as Record<string, MotionComponent>, {
  get(_target, tag) {
    if (typeof tag !== "string") return undefined;
    let component = componentCache.get(tag);
    if (!component) {
      component = createStaticMotionComponent(tag);
      componentCache.set(tag, component);
    }
    return component;
  },
});

export { AnimatePresence };
