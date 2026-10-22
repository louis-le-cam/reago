import type { Component } from "./index.ts";

export type Signal<T> = () => T;
export type WriteSignal<T> = Signal<T> & {
  set: (value: T) => void;
  update: (map: (value: T) => T) => void;
};

export type ReactiveNode = {
  dirty: boolean;
} & (
  | {
      type: "component";
      nodes: ChildNode[];
      component: () => Component;
      children: ReactiveNode[];
    }
  | {
      type: "effect";
      effect: () => void;
    }
);

export let REACTIVE_NODE: ReactiveNode | null = null;

export function withReactiveNode<T>(node: ReactiveNode, func: () => T) {
  if (
    REACTIVE_NODE !== null &&
    REACTIVE_NODE.type === "component" &&
    !REACTIVE_NODE.children.includes(node)
  ) {
    REACTIVE_NODE.children.push(node);
  }

  const lastReactiveNode = REACTIVE_NODE;
  REACTIVE_NODE = node;
  const value = func();
  REACTIVE_NODE = lastReactiveNode;

  return value;
}

export function signal<T>(
  value: T,
  config?: { equal: (previous: T, value: T) => boolean },
): WriteSignal<T> {
  let subscribed: WeakRef<ReactiveNode>[] = [];

  const equal = config?.equal ?? ((previous, value) => previous === value);

  const cleanSubscribed = () => {
    subscribed = subscribed.filter((ref) => ref.deref() !== undefined);
  };

  const track = () => {
    if (REACTIVE_NODE !== null) {
      if (!subscribed.some((ref) => ref.deref() === REACTIVE_NODE)) {
        subscribed.push(new WeakRef(REACTIVE_NODE));
      }
    }
  };

  const signal: WriteSignal<T> = () => {
    cleanSubscribed();
    track();
    return value;
  };

  signal.update = (map: (value: T) => T) => {
    cleanSubscribed();
    const previous = value;
    value = map(previous);

    if (equal(previous, value)) {
      return;
    }

    for (const ref of subscribed) {
      const reactiveNode = ref.deref();
      if (reactiveNode !== undefined) {
        reactiveNode.dirty = true;
      }
    }
  };

  signal.set = (newValue: T) => {
    signal.update(() => newValue);
  };

  return signal;
}

export function effect(effect: () => void) {
  const reactiveNode: ReactiveNode = {
    dirty: false,
    type: "effect",
    effect,
  };

  withReactiveNode(reactiveNode, effect);
}

export function untracked<T>(value: () => T): T {
  const lastReactiveNode = REACTIVE_NODE;
  REACTIVE_NODE = null;

  const val = value();

  REACTIVE_NODE = lastReactiveNode;

  return val;
}

export function computed<T>(computation: () => T): Signal<T> {
  const value = signal(undefined as T);
  effect(() => value.set(computation()));
  return value;
}

export interface Resource<T> {
  reload: () => void;
  status: Signal<"loading" | "loaded" | "error">;
  hasValue: Signal<boolean>;
  value: Signal<T | null>;
}

export function resource<Inputs, T>(
  inputs: () => Inputs,
  loader: (input: Inputs) => Promise<T>,
): Resource<T> {
  const status = signal<"loading" | "loaded" | "error">("loading");
  const hasValue = signal<boolean>(false);
  const value = signal<T | null>(null);

  let latestLoadId = {};

  const load = () => {
    const loadId = {};
    latestLoadId = loadId;

    // TODO: Support previous operation abortion with an `AbortSignal`
    loader(inputs()).then((val) => {
      if (latestLoadId !== loadId) {
        return;
      }

      // TODO: Maybe implement equality check in signals
      if (!untracked(hasValue)) {
        hasValue.set(true);
      }

      value.set(val);
    });
  };

  effect(load);

  return {
    reload: () => untracked(load),
    status,
    hasValue,
    value,
  };
}
