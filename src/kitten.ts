type VariableMap = { [key: string]: unknown };

type ReactiveVariable = {
  newValue: unknown;
  oldValue: unknown;
};

type ReactiveClass = {
  // update(vars: { [key: string]: ReactiveVariable }): void;
  [key: string]: unknown;
};

export const createReactiveClass = ({
  onUpdate,
}: {
  onUpdate: (vars: { [key: string]: ReactiveVariable }) => void;
}): ReactiveClass => {
  let data: VariableMap = {};
  let prevData: VariableMap = {};
  const reactiveClass = new Proxy(
    {},
    {
      set(target, p, newValue) {
        const oldValue = Reflect.get(target, p);
        const success = Reflect.set(target, p, newValue);
        onUpdate({
          [p]: {
            newValue,
            oldValue,
          },
        });
        return success;
      },
    }
  );
  return reactiveClass;
};

export const objEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

const evalInScope = (script: string, scope: object) =>
  Function(`"use strict"; ${script}`).bind(scope)();

const shouldUpdate = (
  text: string,
  state: ReactiveClass,
  changes: { [key: string]: ReactiveVariable }
) => Object.keys(changes).some((k) => text.includes("this." + k));

const renderReactiveChildren = (
  element: HTMLElement,
  state: ReactiveClass,
  changes: { [key: string]: ReactiveVariable },
  reactiveElements: {
    element: HTMLElement;
    state: ReactiveClass;
  }[]
) => {
  const allElements = element.querySelectorAll("*");

  const forElements = element.querySelectorAll("[k-for]");
  forElements.forEach((el) => {
    if (!shouldUpdate(el.getAttribute("k-for")!, state, changes)) return;
    if (el.tagName !== "TEMPLATE") return;
    const template = el as HTMLTemplateElement;
    if (!template.content) return;

    const parent = template.parentElement!;
    parent.textContent = "";

    parent.appendChild(template);

    let forString = template.getAttribute("k-for")!.split(" in ");

    if (typeof forString[1] === "number") {
      for (let x = 0; x < parseInt(forString[1]); x++) {}
    } else {
      // const forLoop: unknown[] = evalStringVars(forString[1], data);
      // for (let [i, v] of forLoop.entries()) {
      //   const templateClone = template.content.firstElementChild!.cloneNode(
      //     true
      //   ) as HTMLElement;
      //   console.log(forString[0]);
      //   console.log(v);
      //   replaceForElementValue(templateClone, {
      //     key: String(forString[0]),
      //     value: v,
      //   });
      //   parent.appendChild(templateClone);
      // }
    }
  });

  const ifElements = element.querySelectorAll("[k-if]");
  ifElements.forEach((el) => {
    const isMounted = el.hasAttribute("k-mounted");
    if (!(shouldUpdate(el.getAttribute("k-if")!, state, changes) || !isMounted))
      return;
    el.setAttribute("k-mounted", "");
    if (el.tagName !== "TEMPLATE") return;
    const template = el as HTMLTemplateElement;
    if (!template.content) return;

    const open = evalInScope(template.getAttribute("k-if")!, state);

    const templateClone = template.content.firstElementChild!.cloneNode(
      true
    ) as HTMLElement;
    const isNextElement =
      template.previousElementSibling?.isEqualNode(templateClone);

    if (open && !isNextElement) {
      template.before(templateClone);
    } else if (!open && isNextElement) {
      template.previousElementSibling?.remove();
    }
  });

  element.querySelectorAll(`[k-text]`).forEach((el) => {
    const isMounted = el.hasAttribute("k-mounted");
    if (
      !(shouldUpdate(el.getAttribute("k-text")!, state, changes) || !isMounted)
    )
      return;
    el.setAttribute("k-mounted", "");
    console.log("updating", el.getAttribute("k-text"));
    const text = el.getAttribute("k-text")!;
    el.textContent = String(evalInScope(`return (${text})`, state));
  });

  element.querySelectorAll(`[k-html]`).forEach((el) => {
    const isMounted = el.hasAttribute("k-mounted");
    if (
      !(shouldUpdate(el.getAttribute("k-html")!, state, changes) || !isMounted)
    )
      return;
    el.setAttribute("k-mounted", "");
    const text = el.getAttribute("k-html")!;
    el.innerHTML = String(evalInScope(`return (${text})`, state));
  });

  const bindingElements = element.querySelectorAll("[k-bind]");
  bindingElements.forEach((el) => {
    if (!(el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const key = input.getAttribute("k-bind");
    input.value = String(state[key!]);

    if (key) {
      input.oninput = (event) => {
        event.preventDefault();
        const value = input.value;
        state[key!] = value;
      };
    }
  });

  allElements.forEach((el) => {
    el.getAttributeNames().forEach((attribute) => {
      if (!attribute.startsWith("@")) return;
      const eventName = attribute.substring(1) as keyof ElementEventMap;
      const action = el.getAttribute(attribute)!;
      const element = el as HTMLElement;
      element[`on${eventName}`] = () => {
        evalInScope(action, state);
      };
    });
  });
};

export const createApp = (selector: string) => {
  const reactiveElements: {
    element: HTMLElement;
    state: ReactiveClass;
  }[] = [];

  const root = document.querySelector(selector) as HTMLElement;

  const rootState = createReactiveClass({
    onUpdate(vars) {
      renderReactiveChildren(root, rootState, vars, reactiveElements);
      // console.log(vars);
    },
  });
  Object.entries(
    evalInScope(`return (${root.getAttribute("k-data")!})`, rootState)
  ).forEach(([k, v]) => (rootState[k] = v));

  reactiveElements.push({
    element: root,
    state: rootState,
  });

  console.log(rootState);

  // const data = createReactiveClass({
  //   onUpdate(vars) {
  //     console.log("update", vars);
  //     console.log("data", data);
  //   },
  // });

  // data.hello = "world";
  // data.hello = "hyou";
  // data.name = "john";

  // evalInScope(`this.hello = 'world'`, data);
  // console.log(data);
};
