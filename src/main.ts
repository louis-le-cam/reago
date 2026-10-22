import { type Component, mountOn } from "reago";
import { html, on } from "reago/element";
import { signal } from "reago/reactivity";

mountOn(document.body, app);

function app(): Component {
  return [
    html.hgroup(
      html.h1("reago"),
      html.p("A small and simple reactive web framework"),
    ),
    counter,
  ];
}

function counter(): Component {
  const counter = signal(0);

  return html.div(
    "Counter is: ",
    counter,
    " ",
    html.button(
      "-",
      on("click", () => counter.update((counter) => counter - 1)),
    ),
    " ",
    html.button(
      "+",
      on("click", () => counter.update((counter) => counter + 1)),
    ),
  );
}
