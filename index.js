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

const stackTraceOriginalStringIndicesThatAreOpen = new Set();
const stackTraceSearchStringField = document.getElementById(
  "stackTraceSearchStringField"
);
const stackTraceDisregardGeneratedCheckbox = document.getElementById(
  "stackTraceDisregardGeneratedCheckbox"
);
const stackTraceProcessGeneratedSqlCheckbox = document.getElementById(
  "stackTraceProcessGeneratedSqlCheckbox"
);
const stackTraceInputToggle = document.getElementById("stackTraceInputToggle");
const stackTraceTextField = document.getElementById("stackTraceTextField");
const stackTraceCopyDiv = document.getElementById("stackTraceCopyDiv");
const stackTraceCopyButton = document.getElementById("stackTraceCopyButton");
const stackTraceCopied = document.getElementById("stackTraceCopied");
const stackTraceOutput = document.getElementById("stackTraceOutput");

stackTraceCopyButton.onclick = () => {
  if (stackTraceOriginalStringIndicesThatAreOpen.size > 0) {
    navigator.clipboard.writeText(
      stackTraceTextField.value.slice(0, Math.max(...Array.from(stackTraceOriginalStringIndicesThatAreOpen)))
    );
    stackTraceCopied.innerHTML = "Copied to clipboard &#x2713";
  } else {
    stackTraceCopied.innerHTML = "Not copied, no lines are currently visible";
  }
  stackTraceCopied.style.transition = "opacity 0s linear";
  stackTraceCopied.style.opacity = 1;
  setTimeout(() => {
    stackTraceCopied.style.transition = "opacity 3s linear";
    stackTraceCopied.style.opacity = 0;
  }, 1);
};

const DELIMITER = " at ";
const DELIMITER_OFFSET = 1;
const processStackTrace = () => {
  const searchString = stackTraceSearchStringField.value;
  const disregardGenerated = stackTraceDisregardGeneratedCheckbox.checked;
  const processGeneratedSql = stackTraceProcessGeneratedSqlCheckbox.checked;
  const isImportant = (line) =>
    line
      .slice(DELIMITER.length - DELIMITER_OFFSET)
      .toLowerCase()
      .startsWith(searchString.toLowerCase()) &&
    (!disregardGenerated || !line.endsWith("(<generated>)"));
  let inputText = stackTraceTextField.value.replaceAll(/[\n\t]/ig, " ");
  inputText = inputText.replaceAll(/\\n\\tat /g, " at ");
  const processedLines = [];
  let firstLine = true;
  let originalStringIndex = 0;
  while (true) {
    if (inputText === "") {
      break;
    }
    let i = inputText.search(DELIMITER);
    let line;
    if (i === -1) {
      line = inputText;
      inputText = "";
    } else {
      line = inputText.slice(0, i + DELIMITER_OFFSET).trim();
    }
    const outputLine = createElement("div", "stackTraceOutputSectionLine");
    if (processGeneratedSql) {
      while ((processedSqlMatch = / bind => \[(.*?)(?<!\\)\]/.exec(line)) != null) {
        const bindArray = processedSqlMatch[1].split(", ");
        let sqlString = line.slice(0, processedSqlMatch.index);
        let bindArrayIndex = bindArray.length - 1;
        let j = processedSqlMatch.index;
        for (; j > 0; j--) {
          if (sqlString[j] === "?") {
            sqlString = sqlString.slice(0, j) + "<b>" + bindArray[bindArrayIndex] + "</b>" + sqlString.slice(j + 1);
            bindArrayIndex--;
            if (bindArrayIndex < 0) {
              break;
            }
          }
        }
        sqlString = sqlString.slice(j);
        const outputSpan1 = createElement("span", "stackTraceOutputTextSpan");
        outputSpan1.innerText = line.slice(0, j);
        const outputSpan2 = createElement("span", "stackTraceOutputTextSpan", "stackTraceOutputGeneratedSqlText");
        outputSpan2.innerHTML = sqlString;
        outputLine.appendChild(outputSpan1)
        outputLine.appendChild(outputSpan2);
        line = line.slice(processedSqlMatch.index + processedSqlMatch[0].length);
      }
      if (line.length > 0) {
        const outputSpan = createElement("span", "stackTraceOutputTextSpan");
        outputSpan.innerText = line;
        outputLine.appendChild(outputSpan);
      }
    } else {
      const outputSpan = createElement("span", "stackTraceOutputTextSpan");
      outputSpan.innerText = line;
      outputLine.appendChild(outputSpan);
    }
    originalStringIndex += i + DELIMITER_OFFSET;
    if (firstLine) {
      const outputDiv = createElement("div", "stackTraceOutputSectionText");
      outputDiv.appendChild(outputLine);
      processedLines.push({ priority: 0, originalStringIndex: originalStringIndex, outputDiv: outputDiv });
      firstLine = false;
    } else {
      const priority = isImportant(line) ? 1 : 2;
      const lastLine = processedLines.at(-1);
      if (priority === lastLine.priority) {
        lastLine.outputDiv.appendChild(outputLine);
        lastLine.originalStringIndex = originalStringIndex;
      } else {
        if (lastLine.priority < 2) {
          stackTraceOriginalStringIndicesThatAreOpen.add(lastLine.originalStringIndex);
        }
        const outputDiv = createElement("div", "stackTraceOutputSectionText");
        outputDiv.appendChild(outputLine);
        processedLines.push({ priority: priority, originalStringIndex: originalStringIndex, outputDiv: outputDiv });
      }
    }
    if (inputText !== "") {
      inputText = inputText.slice(i + DELIMITER_OFFSET);
    }
  }
  if (processedLines.length > 0) {
    const lastLine = processedLines.at(-1);
    if (lastLine.priority < 2) {
      stackTraceOriginalStringIndicesThatAreOpen.add(lastLine.originalStringIndex);
    }
    stackTraceCopyDiv.style.display = processedLines.length > 0 ? "flex" : "none";
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
          stackTraceOriginalStringIndicesThatAreOpen.add(processedLine.originalStringIndex);
        } else {
          outputSection.classList.add("stackTraceOutputSectionCollapsed");
          stackTraceOriginalStringIndicesThatAreOpen.delete(processedLine.originalStringIndex);
        }
      };
      outputSection.appendChild(toggle);
  
      outputSection.appendChild(processedLine.outputDiv);
      stackTraceOutput.appendChild(outputSection);
    });
  }
};
// Wait to do this, to allow input field to repopulate after user reopens closed tab
setTimeout(processStackTrace, 250);
stackTraceTextField.onchange = processStackTrace;
stackTraceSearchStringField.onchange = processStackTrace;
stackTraceDisregardGeneratedCheckbox.onchange = processStackTrace;
stackTraceProcessGeneratedSqlCheckbox.onchange = processStackTrace;

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
          const nodeParent = node.parentElement;
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

const compiledJsUrlStringField = document.getElementById("compiledJsUrlStringField")
const compiledJsLineField = document.getElementById("compiledJsLineField");
const compiledJsBeforeField = document.getElementById("compiledJsBeforeField");
const compiledJsAfterField = document.getElementById("compiledJsAfterField");
const compiledJsSearchStringField = document.getElementById("compiledJsSearchStringField");
const compiledJsFileUpload = document.getElementById("compiledJsFileUpload")
const compiledJsOutput = document.getElementById("compiledJsOutput");
const parsedEntries = [];

const processHarFile = async () => {
  const file = compiledJsFileUpload.files[0];
  if (!file) {
    return;
  }

  while (compiledJsOutput.lastChild) {
    compiledJsOutput.removeChild(compiledJsOutput.lastChild);
  }

  const [lineNumber, position] = compiledJsLineField.value.split(":").map((x) => parseInt(x));
  const text = await file.text();
  const json = JSON.parse(text);
  for (const entry of json.log.entries) {
    if (entry.response.content.mimeType === "application/javascript") {
      if (compiledJsUrlStringField.value && !entry.request.url.includes(compiledJsUrlStringField.value)) {
        continue;
      }

      const text = entry.response.content.text;
      if (!text) {
        continue;
      }
      
      const line = entry.response.content.text.split("\n")[lineNumber - 1];
      if (!line) {
        continue;
      }

      const before = compiledJsBeforeField.value ? parseInt(compiledJsBeforeField.value) : 0;
      const after = compiledJsAfterField.value ? parseInt(compiledJsAfterField.value) : 100;
      const parsedText = line.slice(position - before - 1, position + after - 1);
      if (!parsedText) {
        continue;
      }

      const sectionDiv = createElement("div", "stackTraceOutputSectionText");
      const endpointDiv = createElement("div");
      endpointDiv.innerText = `${entry.request.method} ${entry.request.url}`;
      sectionDiv.appendChild(endpointDiv);
      let codeDiv;

      if (compiledJsSearchStringField.value && parsedText.includes(compiledJsSearchStringField.value)) {
        codeDiv = createElement("div");

        const appendSearchStringSpan = () => {
          const span = createElement("span", "stackTraceOutputGeneratedSqlText", compiledJsSearchStringField.value);
          span.innerText = compiledJsSearchStringField.value;
          codeDiv.appendChild(span);
        }

        const portions = parsedText.split(compiledJsSearchStringField.value);
        for (let i = 0; i < portions.length; i++) {
          const portion = portions[i];
          const span = createElement("span");
          span.innerText = portion;
          codeDiv.appendChild(span)
          if (i !== portions.length - 1) {
            appendSearchStringSpan();
          }
        }

        sectionDiv.appendChild(codeDiv);
        parsedEntries.unshift(sectionDiv);
      } else {
        codeDiv = createElement("code");
        codeDiv.innerText = parsedText;
        sectionDiv.appendChild(codeDiv);
        parsedEntries.push(sectionDiv);
      }
    }
  }

  parsedEntries.forEach((entry) => {
    const outputSection = createElement("div", "stackTraceOutputSection");

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
    
    outputSection.appendChild(entry);
    compiledJsOutput.appendChild(outputSection);
  });
};

compiledJsFileUpload.onchange = processHarFile;
