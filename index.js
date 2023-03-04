const createElement = (tag, ...classList) => {
  const element = document.createElement(tag);
  element.classList.add(...classList);
  return element;
};

const visitedTabIndices = [];
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
  if (!visitedTabIndices.includes(index)) {
    if (index === 1) {
      processRadixTree();
    }
  }
  visitedTabIndices.push(index);
};

tabs.forEach((tab, index) => {
  tab.onclick = () => showPage(index);
  index === currentTab ? showPage(index) : hidePage(index);
});

const stackTraceSearchStringField = document.getElementById(
  "stackTraceSearchStringField"
);
const stackTraceDisregardGeneratedCheckbox = document.getElementById(
  "stackTraceDisregardGeneratedCheckbox"
);
const stackTraceInputToggle = document.getElementById("stackTraceInputToggle");
const stackTraceTextField = document.getElementById("stackTraceTextField");
const stackTraceOutput = document.getElementById("stackTraceOutput");

const DELIMITER = " at ";
const DELIMITER_OFFSET = 1;
const processStackTrace = () => {
  const searchString = stackTraceSearchStringField.value;
  const disregardGenerated = stackTraceDisregardGeneratedCheckbox.checked;
  const isImportant = (line) =>
    line
      .slice(DELIMITER.length - DELIMITER_OFFSET)
      .toLowerCase()
      .startsWith(searchString.toLowerCase()) &&
    (!disregardGenerated || !line.endsWith("(<generated>)"));
  let inputText = stackTraceTextField.value;
  const processedLines = [];
  let firstLine = true;
  for (
    let i = inputText.search(DELIMITER);
    i !== -1;
    i = inputText.search(DELIMITER)
  ) {
    const line = inputText.slice(0, i + DELIMITER_OFFSET).trim();
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
    inputText = inputText.slice(i + DELIMITER_OFFSET);
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
stackTraceSearchStringField.onchange = processStackTrace;
stackTraceDisregardGeneratedCheckbox.onchange = processStackTrace;

let stackTraceInputToggleValue = true;
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

const radixTreeTextField = document.getElementById("radixTreeTextField");
const radixTreeSelectedNodeInfo = document.getElementById(
  "radixTreeSelectedNodeInfo"
);
const radixTreeOutput = document.getElementById("radixTreeOutput");
const setRadixTreeSelectedNodeInfo = (channelSections, subscriptionIds) => {
  radixTreeSelectedNodeInfo.innerText = `Channel: ${channelSections.join(
    "."
  )}\nSubscriptionIds: ${subscriptionIds.join(", ")}`;
};
const processRadixTreeEdge = (label, target, channelSections) => {
  channelSections = [...channelSections];
  const edges = target.edges;
  const subscriptionIds = target.subscriptionIds;
  const container = createElement("div", "radixTreeNodeContainer");
  if (label !== null) {
    const processedEdge = createElement("div", "radixTreeEdge");
    if (label) {
      channelSections.push(label);
      const edgeText = createElement("div", "radixTreeEdgeText");
      edgeText.innerText = label;
      processedEdge.appendChild(edgeText);
    }
    container.appendChild(processedEdge);
  }
  const processedNode = createElement("div", "radixTreeNode");
  if (subscriptionIds && subscriptionIds.length > 0) {
    processedNode.innerText = subscriptionIds.length;
    processedNode.classList.add("radixTreeNodeWithSubscriptions");
  }
  processedNode.onclick = () =>
    setRadixTreeSelectedNodeInfo(channelSections, subscriptionIds || []);
  container.appendChild(processedNode);
  if (edges.length > 0) {
    const bottomEdge = createElement("div", "radixTreeBottomEdge");
    container.appendChild(bottomEdge);
    const childrenContainer = createElement("div", "radixTreeNodeChildren");
    edges.forEach((edge) => {
      const child = processRadixTreeEdge(
        edge.label,
        edge.target,
        channelSections
      );
      childrenContainer.appendChild(child);
    });
    container.appendChild(childrenContainer);
  }
  return container;
};
const postProcessRadixTree = (radixTreeNodeElement) => {
  const children = Array.from(radixTreeNodeElement.children);
  if (children.length !== 0) {
    children.forEach(postProcessRadixTree);
    children.forEach((node) => {
      if (node.classList.contains("radixTreeNodeChildren")) {
        const children = Array.from(node.children);
        if (children.length > 1) {
          const bottomLine = createElement("div", "radixTreeBottomLine");
          const firstChildHalfWidth = children[0].offsetWidth / 2;
          const lastChildHalfWidth = children.at(-1).offsetWidth / 2;
          bottomLine.style.width = `${
            node.offsetWidth - firstChildHalfWidth - lastChildHalfWidth
          }px`;
          bottomLine.style.marginLeft = `${firstChildHalfWidth}px`;
          bottomLine.style.marginRight = `${lastChildHalfWidth}px`;
          nodeParent = node.parentElement;
          nodeParent.insertBefore(bottomLine, nodeParent.lastChild);
        }
      } else if (node.classList.contains("radixTreeEdgeText")) {
        const nodeFullWidth = node.offsetWidth;
        node.onmouseover = () => (node.style.maxWidth = `${nodeFullWidth}px`);
        node.onmouseleave = () =>
          (node.style.maxWidth = `${Math.min(node.offsetWidth, 48)}px`);
        node.onmouseleave();
      }
    });
  }
};
const processRadixTree = async () => {
  while (radixTreeOutput.lastChild) {
    radixTreeOutput.removeChild(radixTreeOutput.lastChild);
  }
  let raw = radixTreeTextField.value;
  if (!raw) {
    return;
  }
  raw = raw.replaceAll("\\", "");
  raw = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  try {
    const json = JSON.parse(raw);
    const tree = json.tree;
    const rootNode = tree.rootNode;
    radixTreeOutput.appendChild(processRadixTreeEdge(null, rootNode, []));
    postProcessRadixTree(radixTreeOutput.firstChild);
  } catch (ex) {
    radixTreeOutput.innerText = "Unable to parse tree from json";
    console.log(ex);
  }
};
processRadixTree();
radixTreeTextField.onchange = processRadixTree;
