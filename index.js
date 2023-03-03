const createElement = (tag, ...classList) => {
  const element = document.createElement(tag);
  element.classList.add(...classList);
  return element;
};

const tabs = Array.from(document.getElementById("tabs").children);
const pages = Array.from(document.getElementById("pages").children);
let currentTab = 0;

const hidePage = (index) => {
  tabs[index].classList.remove("selectedTab");
  pages[index].style.display = "none";
};
const showPage = (index) => {
  hidePage(currentTab);
  currentTab = index;
  tabs[index].classList.add("selectedTab");
  pages[index].style.display = "flex";
};

tabs.forEach((tab, index) => {
  tab.onclick = () => showPage(index);
  index === currentTab ? showPage(index) : hidePage(index);
});

let stackTraceInputToggleValue = true;
const stackTraceInputToggle = document.getElementById("stackTraceInputToggle");
const stackTraceTextField = document.getElementById("stackTraceTextField");
const STACK_TRACE_INPUT_MAX_HEIGHT = "1000px";
stackTraceTextField.style.maxHeight = STACK_TRACE_INPUT_MAX_HEIGHT;
stackTraceInputToggle.onclick = () => {
  stackTraceInputToggleValue = !stackTraceInputToggleValue;
  stackTraceInputToggle.style.transform = stackTraceInputToggleValue
    ? "rotate(0deg)"
    : "rotate(-90deg)";
  stackTraceTextField.style.maxHeight = stackTraceInputToggleValue
    ? STACK_TRACE_INPUT_MAX_HEIGHT
    : "0px";
};
const stackTraceOutput = document.getElementById("stackTraceOutput");
const delimiter = " at ";
const delimiterOffset = 1;
const importantText = "com.hyperproof";
const isImportant = (line) =>
  line.slice(delimiter.length - delimiterOffset).startsWith(importantText) &&
  !line.endsWith("(<generated>)");
const processStackTrace = () => {
  let inputText = stackTraceTextField.value;
  const processedLines = [];
  let firstLine = true;
  for (
    let i = inputText.search(delimiter);
    i !== -1;
    i = inputText.search(delimiter)
  ) {
    const line = inputText.slice(0, i + delimiterOffset).trim();
    if (firstLine) {
      processedLines.push({ priority: 0, text: line });
    } else {
      const priority = firstLine ? 0 : isImportant(line) ? 1 : 2;
      const lastLine = processedLines.at(-1);
      if (priority === lastLine.priority) {
        lastLine.text += "\n" + line;
      } else {
        processedLines.push({ priority: priority, text: line });
      }
    }
    inputText = inputText.slice(i + delimiterOffset);
    firstLine = false;
  }
  while (stackTraceOutput.lastChild) {
    stackTraceOutput.removeChild(stackTraceOutput.lastChild);
  }
  processedLines.forEach((processedLine) => {
    const outputSection = document.createElement("div");
    outputSection.classList.add(
      "stackTraceOutputSection",
      `stackTraceOutputSectionPriority${processedLine.priority}`
    );
    if (processedLine.priority > 1) {
      outputSection.classList.add("stackTraceOutputSectionCollapsed");
    }

    const toggle = createElement("div", "stackTraceOutputSectionToggle");
    toggle.innerHTML = "&#9660;";
    toggle.onclick = () => {
      if (
        outputSection.classList.contains("stackTraceOutputSectionCollapsed")
      ) {
        outputSection.classList.remove("stackTraceOutputSectionCollapsed");
      } else {
        outputSection.classList.add("stackTraceOutputSectionCollapsed");
      }
    };
    outputSection.appendChild(toggle);

    const text = createElement("div", "stackTraceOutputSectionText");
    processedLine.text.split("\n").forEach((l) => {
      const line = createElement("div", "stackTraceOutputSectionLine");
      line.innerText = l;
      text.appendChild(line);
    });
    outputSection.appendChild(text);

    stackTraceOutput.appendChild(outputSection);
  });
};
processStackTrace();
stackTraceTextField.onchange = processStackTrace;
