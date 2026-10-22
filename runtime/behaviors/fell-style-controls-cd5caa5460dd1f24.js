export default async function install(app) {
  const mount = app.getMount("fell-style-controls");
  const cfg = app.config;
  const layer = app.layers[cfg.layerId];
  app.assert(layer, "LakeDistrictFells layer is not available.");
  await layer.load();

  const ramps = {
    "blue-red": { label: "Blue → yellow → red", colors: ["#2b83ba", "#ffffbf", "#d7191c"] },
    "blue-red-direct": { label: "Blue → white → red", colors: ["#2166ac", "#f7f7f7", "#b2182b"] },
    "purple-orange": { label: "Purple → cream → orange", colors: ["#542788", "#f7f7f7", "#f1a340"] },
    "teal-magenta": { label: "Teal → pale → magenta", colors: ["#018571", "#f5f5f5", "#a6611a"] },
    "green-red": { label: "Green → yellow → red", colors: ["#1a9850", "#fee08b", "#d73027"] }
  };

  let stats = { ...cfg.defaults };
  try {
    const q = layer.createQuery();
    q.where = `${cfg.heightField} IS NOT NULL AND ${cfg.prominenceField} IS NOT NULL`;
    q.outStatistics = [
      { statisticType: "min", onStatisticField: cfg.heightField, outStatisticFieldName: "minHeight" },
      { statisticType: "max", onStatisticField: cfg.heightField, outStatisticFieldName: "maxHeight" },
      { statisticType: "min", onStatisticField: cfg.prominenceField, outStatisticFieldName: "minProminence" },
      { statisticType: "max", onStatisticField: cfg.prominenceField, outStatisticFieldName: "maxProminence" }
    ];
    q.returnGeometry = false;
    const result = await layer.queryFeatures(q);
    const a = result.features[0]?.attributes ?? {};
    const minHeight = Number(a.minHeight);
    const maxHeight = Number(a.maxHeight);
    const minProminence = Number(a.minProminence);
    const maxProminence = Number(a.maxProminence);
    if (Number.isFinite(minHeight) && Number.isFinite(maxHeight) && Number.isFinite(minProminence) && Number.isFinite(maxProminence)) {
      stats = {
        ...stats,
        minHeight,
        maxHeight,
        midHeight: (minHeight + maxHeight) / 2,
        minProminence,
        maxProminence,
        midProminence: (minProminence + maxProminence) / 2
      };
    }
  } catch (error) {
    app.reportError?.(error);
  }

  const storageKey = `nova:fell-style:${cfg.layerId}`;
  function loadState() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (saved && Array.isArray(saved.colors) && saved.colors.length === 3) return saved;
    } catch {}
    return { ramp: cfg.defaults.ramp, colors: cfg.defaults.colors };
  }
  let state = loadState();

  function makeRenderer(colors) {
    return {
      type: "simple",
      symbol: {
        type: "simple-marker",
        style: "triangle",
        size: 10,
        color: colors[0],
        outline: { color: "#ffffff", width: 0.7 }
      },
      visualVariables: [
        {
          type: "size",
          field: cfg.heightField,
          legendOptions: { title: "Height (m)" },
          stops: [
            { value: stats.minHeight, size: stats.sizeMin, label: `${Math.round(stats.minHeight)} m` },
            { value: stats.midHeight, size: stats.sizeMid, label: `${Math.round(stats.midHeight)} m` },
            { value: stats.maxHeight, size: stats.sizeMax, label: `${Math.round(stats.maxHeight)} m` }
          ]
        },
        {
          type: "color",
          field: cfg.prominenceField,
          legendOptions: { title: "Prominence (m)" },
          stops: [
            { value: stats.minProminence, color: colors[0], label: `${Math.round(stats.minProminence)} m` },
            { value: stats.midProminence, color: colors[1], label: `${Math.round(stats.midProminence)} m` },
            { value: stats.maxProminence, color: colors[2], label: `${Math.round(stats.maxProminence)} m` }
          ]
        }
      ]
    };
  }

  function applyState(save = true) {
    layer.renderer = makeRenderer(state.colors);
    if (save) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }
    swatches.forEach((swatch, i) => {
      swatch.style.background = state.colors[i];
      swatch.title = state.colors[i];
    });
    colorInputs.forEach((input, i) => { input.value = state.colors[i]; });
    valueLabels[0].textContent = `${Math.round(stats.minProminence)} m`;
    valueLabels[1].textContent = `${Math.round(stats.midProminence)} m`;
    valueLabels[2].textContent = `${Math.round(stats.maxProminence)} m`;
  }

  const root = document.createElement("div");
  root.style.display = "grid";
  root.style.gap = "12px";
  root.style.font = "inherit";
  root.style.color = "var(--calcite-color-text-1, #222)";
  root.style.minWidth = "0";

  const intro = document.createElement("p");
  intro.textContent = "Adjust the prominence color ramp. Triangle size remains driven by height.";
  intro.style.margin = "0";
  intro.style.lineHeight = "1.35";
  root.appendChild(intro);

  const label = document.createElement("label");
  label.textContent = "Color ramp";
  label.style.display = "grid";
  label.style.gap = "6px";
  const select = document.createElement("select");
  select.style.width = "100%";
  select.style.padding = "6px";
  Object.entries(ramps).forEach(([value, ramp]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = ramp.label;
    select.appendChild(option);
  });
  select.value = state.ramp && ramps[state.ramp] ? state.ramp : "blue-red";
  select.addEventListener("change", () => {
    const ramp = ramps[select.value];
    state = { ramp: select.value, colors: ramp.colors.slice() };
    applyState(true);
  });
  label.appendChild(select);
  root.appendChild(label);

  const sampleWrap = document.createElement("div");
  sampleWrap.style.display = "grid";
  sampleWrap.style.gap = "8px";
  const sampleTitle = document.createElement("div");
  sampleTitle.textContent = "Color samples";
  sampleTitle.style.fontWeight = "600";
  sampleWrap.appendChild(sampleTitle);

  const rampBar = document.createElement("div");
  rampBar.style.height = "18px";
  rampBar.style.borderRadius = "999px";
  rampBar.style.border = "1px solid rgba(0,0,0,0.2)";
  sampleWrap.appendChild(rampBar);

  const swatchRow = document.createElement("div");
  swatchRow.style.display = "grid";
  swatchRow.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  swatchRow.style.gap = "8px";
  const names = ["Low", "Middle", "High"];
  const colorInputs = [];
  const swatches = [];
  const valueLabels = [];

  names.forEach((name, index) => {
    const item = document.createElement("label");
    item.style.display = "grid";
    item.style.gap = "4px";
    item.style.minWidth = "0";
    const nameEl = document.createElement("span");
    nameEl.textContent = name;
    nameEl.style.fontSize = "12px";
    const swatch = document.createElement("span");
    swatch.style.display = "block";
    swatch.style.height = "28px";
    swatch.style.borderRadius = "6px";
    swatch.style.border = "1px solid rgba(0,0,0,0.25)";
    const input = document.createElement("input");
    input.type = "color";
    input.style.width = "100%";
    input.style.height = "32px";
    input.addEventListener("input", () => {
      state.colors[index] = input.value;
      state.ramp = "custom";
      applyState(true);
    });
    const valueEl = document.createElement("span");
    valueEl.style.fontSize = "11px";
    valueEl.style.color = "var(--calcite-color-text-2, #555)";
    item.append(nameEl, swatch, input, valueEl);
    swatches.push(swatch);
    colorInputs.push(input);
    valueLabels.push(valueEl);
    swatchRow.appendChild(item);
  });
  sampleWrap.appendChild(swatchRow);
  root.appendChild(sampleWrap);

  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset to blue-to-red";
  reset.style.padding = "7px 10px";
  reset.addEventListener("click", () => {
    state = { ramp: "blue-red", colors: ramps["blue-red"].colors.slice() };
    select.value = "blue-red";
    applyState(true);
  });
  root.appendChild(reset);

  const note = document.createElement("p");
  note.textContent = `Height uses ${cfg.heightField}; prominence uses ${cfg.prominenceField}. Your color choices are remembered in this browser.`;
  note.style.margin = "0";
  note.style.fontSize = "12px";
  note.style.color = "var(--calcite-color-text-2, #555)";
  note.style.lineHeight = "1.35";
  root.appendChild(note);

  function updateRampBar() {
    rampBar.style.background = `linear-gradient(90deg, ${state.colors[0]}, ${state.colors[1]}, ${state.colors[2]})`;
  }
  const originalApply = applyState;
  applyState = function(save = true) {
    originalApply(save);
    updateRampBar();
  };

  mount.replaceChildren(root);
  applyState(false);
  app.onCleanup(() => mount.replaceChildren());
}