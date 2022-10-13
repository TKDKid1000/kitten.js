interface ReactiveApp {
  mount: (selector: string) => void;
}

type VariableMap = { [key: string]: unknown };

type ReactiveData = {
  _update(): void;
  update(): void;
  all(value: VariableMap): void;
  set(key: string, value: unknown): void;
  get(key: string): void;
  forEach(callbackFn: (key: string, value: unknown) => void): void;
  previous: VariableMap;
  toJSON(): VariableMap;
  toString(): string;
};

const createReactiveData = (): ReactiveData => {
  let data: VariableMap = {};
  let prevData: VariableMap = {};
  return {
    _update() {
      this.update();
      prevData = Object.assign({}, data);
    },
    update() {},
    all(value: VariableMap) {
      data = value;
      this._update();
    },
    set(key: string, value: unknown) {
      data[key] = value;
      this._update();
    },
    get(key: string) {
      return data[key];
    },
    forEach(callbackFn: (key: string, value: unknown) => void) {
      for (const [k, v] of Object.entries(data)) {
        callbackFn(k, v);
      }
    },
    get previous() {
      return Object.assign({}, prevData);
    },
    toJSON() {
      return Object.assign({}, data);
    },
    toString() {
      return JSON.stringify(data);
    },
  };
};

export const objEqual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

const evalStringVars = (text: string, data: ReactiveData) => {
  let dataObj = data.toJSON();
  let evalReturn = null;
  const replaceString = (txt: string) => {
    data.forEach(
      (k) => (txt = txt.replaceAll("$" + k, `dataObj['${String(k)}']`))
    );
    return txt;
  };
  evalReturn = eval(replaceString(text));
  if (!objEqual(dataObj, data.toJSON())) {
    data.all(dataObj);
  }
  return evalReturn;
};

const replaceForElementValue = (
  element: HTMLElement,
  { key, value }: { key: string; value: unknown }
) => {
  for (let x = 0; x < element.attributes.length; x++) {
    const attribute = element.attributes.item(x);
    console.log(attribute?.name);
    element.setAttribute(
      attribute!.name,
      attribute!.value.replaceAll("$" + key, String(value))
    );
  }

  element.querySelectorAll("*").forEach((el) => {
    const { attributes } = el;
    console.log(el);
    for (let x = 0; x < attributes.length; x++) {
      const attribute = attributes.item(x);
      console.log(attribute?.name);
      el.setAttribute(
        attribute!.name,
        attribute!.value.replaceAll("$" + key, String(value))
      );
    }
  });
};

const shouldUpdate = (text: string, data: ReactiveData) => {
  const dataObj = data.toJSON();
  return Object.entries(dataObj).some(
    ([k, v]) =>
      (!objEqual(v, data.previous[k]) || typeof v === "function") &&
      text.includes("$" + k)
  );
};

export const initApp = (): ReactiveApp => {
  let data = createReactiveData();
  let root: HTMLElement;

  data.update = () => {
    render();
  };

  const render = () => {
    const allElements = root.querySelectorAll("*");

    const forElements = root.querySelectorAll("[r-for]");
    forElements.forEach((el) => {
      if (!shouldUpdate(el.getAttribute("r-for")!, data)) return;
      if (el.tagName !== "TEMPLATE") return;
      const template = el as HTMLTemplateElement;
      if (!template.content) return;

      const parent = template.parentElement!;
      parent.textContent = "";

      parent.appendChild(template);

      let forString = template.getAttribute("r-for")!.split(" in ");

      if (typeof forString[1] === "number") {
        for (let x = 0; x < parseInt(forString[1]); x++) {}
      } else {
        const forLoop: unknown[] = evalStringVars(forString[1], data);
        for (let [i, v] of forLoop.entries()) {
          const templateClone = template.content.firstElementChild!.cloneNode(
            true
          ) as HTMLElement;
          console.log(forString[0]);
          console.log(v);
          replaceForElementValue(templateClone, {
            key: String(forString[0]),
            value: v,
          });
          parent.appendChild(templateClone);
        }
      }
    });

    const ifElements = root.querySelectorAll("[r-if]");
    ifElements.forEach((el) => {
      if (!shouldUpdate(el.getAttribute("r-if")!, data)) return;
      if (el.tagName !== "TEMPLATE") return;
      const template = el as HTMLTemplateElement;
      if (!template.content) return;

      const open = evalStringVars(template.getAttribute("r-if")!, data);

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

    root.querySelectorAll(`[r-text]`).forEach((el) => {
      if (!shouldUpdate(el.getAttribute("r-text")!, data)) return;
      const text = el.getAttribute("r-text")!;
      el.textContent = String(evalStringVars(text, data));
    });

    root.querySelectorAll(`[r-html]`).forEach((el) => {
      if (!shouldUpdate(el.getAttribute("r-html")!, data)) return;
      const text = el.getAttribute("r-html")!;
      el.innerHTML = String(evalStringVars(text, data));
    });

    const bindingElements = root.querySelectorAll("[r-bind]");
    bindingElements.forEach((el) => {
      if (!(el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const key = input.getAttribute("r-bind");
      input.value = String(data.get(key!));

      if (key) {
        input.oninput = (event) => {
          event.preventDefault();
          const value = input.value;
          data.set(key!, value);
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
          evalStringVars(action, data);
        };
      });
    });
  };

  const mount = (selector: string) => {
    root = document.querySelector(selector)!;
    const x = eval(`(${root.getAttribute("r-data") || "{}"})`);
    data.all(x);
  };

  return { mount };
};
