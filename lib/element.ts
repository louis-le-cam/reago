import type {
  Component,
  ComponentElement,
  ElementAttrs,
  ElementClasses,
  ElementOn,
  ElementProps,
  ElementStyle,
  Value,
} from "./index.ts";
import type { WriteSignal } from "./reactivity.ts";

export class Patch {
  refs: WriteSignal<HTMLElement | null>[] = [];
  on: ElementOn = {};
  attrs: ElementAttrs = {};
  props: ElementProps = {};
  classes: ElementClasses = [];
  style: ElementStyle = {};
  child: Component[] = [];
}

export type Item = Component | Patch;

export function patch(...items: Item[]): Patch {
  const patch = new Patch();

  for (const item of items) {
    if (item instanceof Patch) {
      patch.refs.push(...item.refs);

      for (const name in item.on) {
        const eventName = name as keyof HTMLElementEventMap;
        patch.on[eventName] = [
          ...((patch.on[eventName] as ((event: Event) => void)[]) ?? []),
          ...(item.on[eventName] as ((event: Event) => void)[]),
        ];
      }

      for (const name in item.attrs) {
        patch.attrs[name] = item.attrs[name] ?? patch.attrs[name];
      }

      for (const name in item.props) {
        patch.props[name] = item.props[name] ?? patch.props[name];
      }

      patch.classes.push(...item.classes);

      for (const name in item.style) {
        patch.style[name] = item.style[name];
      }

      patch.child.push(...item.child);
    } else {
      patch.child.push(item);
    }
  }

  return patch;
}

export function element(tag: string, ...items: Item[]): ComponentElement {
  const patch_ = patch(...items);

  return {
    tag,
    refs: patch_.refs,
    on: patch_.on,
    attrs: patch_.attrs,
    props: patch_.props,
    classes: patch_.classes,
    style: patch_.style,
    child: patch_.child,
  };
}

export function ref(signal: WriteSignal<HTMLElement | null>): Patch {
  const patch = new Patch();
  patch.refs = [signal];
  return patch;
}

export type HtmlElementBuilder = Record<
  keyof HTMLElementTagNameMap,
  (...items: Item[]) => ComponentElement
>;

export const html = new Proxy<HtmlElementBuilder>({} as HtmlElementBuilder, {
  get(_target, name, _receiver) {
    if (typeof name !== "string") {
      return undefined;
    }

    return (...items: Item[]) => element(name, ...items);
  },
});

export function on<T extends keyof HTMLElementEventMap>(
  event: T,
  handler: (event: HTMLElementEventMap[T]) => void,
): Patch {
  const patch = new Patch();
  patch.on = { [event]: [handler] };
  return patch;
}

export function attr(
  name: string,
  value: Value<string | number | null | undefined>,
): Patch {
  const patch = new Patch();
  patch.attrs = { [name]: value };
  return patch;
}

export function prop(name: string, value: Value<unknown>): Patch {
  const patch = new Patch();
  patch.props = { [name]: value };
  return patch;
}

export function classes(...classes: Value<string | null | undefined>[]) {
  const patch = new Patch();
  patch.classes = classes;
  return patch;
}

export function style(style: ElementStyle) {
  const patch = new Patch();
  patch.style = style;
  return patch;
}
