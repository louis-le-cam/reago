import {
  effect,
  type ReactiveNode,
  type WriteSignal,
  withReactiveNode,
} from "./reactivity.ts";

export type Component = ComponentNode | (() => Component);

export type ComponentNode = ComponentElement | Component[] | string | number;

export type Value<T> = T | (() => T);

export type ComponentElement = {
  tag: string;
  refs?: WriteSignal<HTMLElement | null>[];
  on?: ElementOn;
  attrs?: ElementAttrs;
  props?: ElementProps;
  classes?: ElementClasses;
  style?: ElementStyle;
  child?: Component;
};

export type ElementOn = {
  [name in keyof HTMLElementEventMap]?: ((
    event: HTMLElementEventMap[name],
  ) => void)[];
};

export type ElementAttrs = Record<
  string,
  Value<string | number | null | undefined>
>;

export type ElementProps = Record<string, Value<unknown>>;

export type ElementClasses = Value<string | null | undefined>[];

export type ElementStyle = Record<
  string,
  Value<string | number | null | undefined>
>;

export function mountOn(element: HTMLElement, component: () => Component) {
  const reactiveNode: ReactiveNode = {
    dirty: false,
    type: "component",
    nodes: [],
    component,
    children: [],
  };

  reactiveNode.nodes = withReactiveNode(reactiveNode, () =>
    render(component()),
  );

  element.append(...reactiveNode.nodes);

  function frame() {
    renderIfDirty(reactiveNode);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function replaceChildNodes(previousNodes: Node[], nodes: Node[]) {
  if (
    nodes.length === 0 ||
    previousNodes.length === 0 ||
    previousNodes[0].parentNode === null
  ) {
    throw new Error("TODO: error message");
  }

  const parent = previousNodes[0].parentNode;

  for (const node of previousNodes.slice(1)) {
    parent.removeChild(node);
  }

  parent.replaceChild(nodes[nodes.length - 1], previousNodes[0]);

  for (const node of nodes.slice(0, -1)) {
    parent.insertBefore(node, nodes[nodes.length - 1]);
  }
}

function renderIfDirty(reactiveNode: ReactiveNode) {
  if (!reactiveNode.dirty) {
    if (reactiveNode.type === "component") {
      for (const child of reactiveNode.children) {
        renderIfDirty(child);
      }
    }

    return;
  }

  reactiveNode.dirty = false;

  switch (reactiveNode.type) {
    case "component": {
      reactiveNode.children = [];

      // TODO: Maybe should recreate the reactive node so we only subscribe to
      // signals used in the last function run.
      const nodes = withReactiveNode(reactiveNode, () =>
        render(reactiveNode.component()),
      );

      replaceChildNodes(reactiveNode.nodes, nodes);
      reactiveNode.nodes = nodes;
      break;
    }
    case "effect": {
      withReactiveNode(reactiveNode, reactiveNode.effect);
    }
  }
}

function render(component: Component): ChildNode[] {
  if (typeof component === "string") {
    return [new Text(component)];
  } else if (typeof component === "number") {
    return [new Text(component.toString())];
  } else if (typeof component === "function") {
    return renderFunction(component);
  } else if (Array.isArray(component)) {
    const nodes = component.flatMap((component) => render(component));
    if (nodes.length === 0) {
      nodes.push(new Text());
    }
    return nodes;
  } else if (typeof component === "object") {
    return renderElement(component);
  } else {
    throw new Error("TODO: error message");
  }
}

function renderFunction(component: () => Component): ChildNode[] {
  const reactiveNode: ReactiveNode = {
    dirty: false,
    type: "component",
    nodes: [],
    component,
    children: [],
  };

  reactiveNode.nodes = withReactiveNode(reactiveNode, () =>
    render(component()),
  );

  return reactiveNode.nodes;
}

function renderElement(component: ComponentElement): ChildNode[] {
  const element = document.createElement(component.tag);

  for (const ref of component.refs ?? []) {
    ref.set(element);
  }

  if (component.child !== undefined) {
    element.append(...render(component.child));
  }

  if (component.attrs !== undefined) {
    for (const name in component.attrs) {
      const value = component.attrs[name];

      const setAttribute = (value: string | number | null | undefined) => {
        if (typeof value === "string") {
          element.setAttribute(name, value);
        } else if (typeof value === "number") {
          element.setAttribute(name, value.toString());
        } else {
          element.removeAttribute(name);
        }
      };

      if (typeof value === "function") {
        effect(() => setAttribute(value()));
      } else {
        setAttribute(value);
      }
    }
  }

  if (component.props !== undefined) {
    for (const [name, value] of Object.entries(component.props)) {
      if (typeof value === "function") {
        // biome-ignore lint/suspicious/noExplicitAny: We allow setting arbitrary element properties which is not safe.
        effect(() => ((element as any)[name] = value()));
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: We allow setting arbitrary element properties which is not safe.
        (element as any)[name] = value;
      }
    }
  }

  if (component.classes !== undefined) {
    for (const className of component.classes) {
      if (typeof className !== "function") {
        if (typeof className === "string") {
          element.classList.add(className);
        }
        continue;
      }

      let previousClass: string | null = null;
      effect(() => {
        if (previousClass !== null) {
          element.classList.remove(previousClass);
        }
        previousClass = className() ?? null;
        if (previousClass !== null) {
          element.classList.add(previousClass);
        }
      });
    }
  }

  if (component.style !== undefined) {
    for (const [name, value] of Object.entries(component.style)) {
      const setStyle = (value: string | number | null | undefined) => {
        if (typeof value === "string") {
          element.style.setProperty(name, value);
        } else if (typeof value === "number") {
          element.style.setProperty(name, value.toString());
        }
      };

      if (typeof value === "function") {
        effect(() => setStyle(value()));
      } else {
        setStyle(value);
      }
    }
  }

  if (component.on !== undefined) {
    for (const name in component.on) {
      const eventName = name as keyof HTMLElementEventMap;
      for (const handler of component.on[eventName] ?? []) {
        element.addEventListener(eventName, handler as (event: Event) => void);
      }
    }
  }

  return [element];
}
