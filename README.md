# Reago

A small and simple reactive web framework.

## Examples

### Basic

```ts
mountOn(document.body, app);

function app(): Component {
  return html.h2("Hello world!");
}
```

### Counter

```ts
function counter(): Component {
  const counter = signal(0);

  const decrement = () => counter.update((counter) => counter - 1);
  const increment = () => counter.update((counter) => counter + 1);

  return html.div(
    "Counter is: ",
    counter,
    " ",
    html.button("-", on("click", decrement)),
    " ",
    html.button("+", on("click", increment)),
  );
}
```

### Asynchronous resource

```ts
interface Pokemon {
  name: string;
  url: string;
}

async function fetchPokemons(page: number): Promise<Pokemon[]> {
  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=20&offset=${page * 20}`,
  );

  return (await response.json()).results;
}

function pokemons(): Component {
  const page = signal(0);
  const pokemons = resource(
    () => ({ page: page() }),
    async ({ page }) => fetchPokemons(page),
  );

  const previousPage = () => page.set(Math.max(page() - 1, 0));
  const nextPage = () => page.set(page() + 1);

  return [
    html.button("<", on("click", previousPage)),
    " ",
    html.button(">", on("click", nextPage)),
    html.ul(() =>
      (pokemons.value() ?? []).map((pokemon) =>
        html.li(html.a(attr("href", pokemon.url), pokemon.name)),
      ),
    ),
  ];
}
```
