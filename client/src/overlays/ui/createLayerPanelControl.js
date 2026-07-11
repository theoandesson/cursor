import { OVERLAY_CONTROL_TYPES } from "../registry/overlayDefinitions.js";

const ROOT_CLASS = "map-layer-panel maplibregl-ctrl";
const TITLE_CLASS = "map-layer-panel__title";
const HINT_CLASS = "map-layer-panel__hint";
const SECTION_CLASS = "map-layer-panel__section";
const SECTION_LABEL_CLASS = "map-layer-panel__section-label";
const LAYER_CLASS = "map-layer-panel__layer";
const LAYER_HEAD_CLASS = "map-layer-panel__layer-head";
const LAYER_NAME_CLASS = "map-layer-panel__layer-name";
const TOGGLE_CLASS = "map-layer-panel__toggle";
const SLIDER_ROW_CLASS = "map-layer-panel__slider-row";
const SLIDER_LABEL_CLASS = "map-layer-panel__slider-label";
const RANGE_CLASS = "map-layer-panel__range";
const RANGE_VALUE_CLASS = "map-layer-panel__range-value";
const ANIM_CLASS = "map-layer-panel__anim";
const ROW_CLASS = "map-layer-panel__row";
const BUTTON_CLASS = "map-layer-panel__button";
const BUTTON_PRIMARY_CLASS = "map-layer-panel__button--primary";
const STATUS_CLASS = "map-layer-panel__status";
const COLLAPSE_CLASS = "map-layer-panel__collapse";

const SPEED_LABELS = ["0.5×", "1×", "1.5×", "2×"];

const releaseListeners = (listeners) => {
  listeners.forEach((release) => release());
  listeners.length = 0;
};

const setToggleState = ({ button, visible }) => {
  button.dataset.state = visible ? "active" : "idle";
  button.setAttribute("aria-pressed", String(visible));
  button.textContent = visible ? "På" : "Av";
};

const createButton = ({ label, title, isPrimary = false }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  if (isPrimary) {
    button.classList.add(BUTTON_PRIMARY_CLASS);
  }
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
};

const createRangeRow = ({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  formatValue,
  onInput
}) => {
  const row = document.createElement("div");
  row.className = SLIDER_ROW_CLASS;

  const rangeLabel = document.createElement("label");
  rangeLabel.className = SLIDER_LABEL_CLASS;
  rangeLabel.setAttribute("for", id);
  rangeLabel.textContent = label;

  const range = document.createElement("input");
  range.id = id;
  range.type = "range";
  range.className = RANGE_CLASS;
  range.min = String(min);
  range.max = String(max);
  range.step = String(step);
  range.value = String(value);
  range.setAttribute("aria-valuemin", String(min));
  range.setAttribute("aria-valuemax", String(max));
  range.setAttribute("aria-valuenow", String(value));
  range.setAttribute("aria-label", label);

  const output = document.createElement("output");
  output.className = RANGE_VALUE_CLASS;
  output.setAttribute("for", id);
  output.textContent = formatValue(value);

  const onRangeInput = () => {
    const nextValue = Number(range.value);
    output.textContent = formatValue(nextValue);
    range.setAttribute("aria-valuenow", String(nextValue));
    onInput(nextValue);
  };

  range.addEventListener("input", onRangeInput);

  row.append(rangeLabel, range, output);
  return {
    row,
    range,
    output,
    release: () => range.removeEventListener("input", onRangeInput)
  };
};

const groupBySection = (overlays) => {
  const sections = new Map();

  overlays.forEach((overlay) => {
    const sectionName = overlay.section ?? "Övrigt";
    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName).push(overlay);
  });

  return sections;
};

const buildRadarControls = ({ overlay, overlayManager, layerNode, listeners }) => {
  const plugin = overlayManager.getPlugin(overlay.id);
  if (!plugin) {
    return null;
  }

  const anim = document.createElement("div");
  anim.className = ANIM_CLASS;
  anim.setAttribute("aria-label", "Radaranimation");

  const row = document.createElement("div");
  row.className = ROW_CLASS;

  const playButton = createButton({
    label: "▶",
    title: "Spela radaranimation",
    isPrimary: true
  });
  const pauseButton = createButton({
    label: "⏸",
    title: "Pausa radaranimation"
  });
  const previousButton = createButton({
    label: "⏮",
    title: "Föregående radarbild"
  });
  const nextButton = createButton({
    label: "⏭",
    title: "Nästa radarbild"
  });

  const onPlay = async () => {
    await overlayManager.setVisible(overlay.id, true);
    await plugin.play();
    sync();
  };
  const onPause = () => {
    plugin.pause();
    sync();
  };
  const onPrevious = async () => {
    await overlayManager.setVisible(overlay.id, true);
    await plugin.stepPrevious();
    sync();
  };
  const onNext = async () => {
    await overlayManager.setVisible(overlay.id, true);
    await plugin.stepNext();
    sync();
  };

  playButton.addEventListener("click", onPlay);
  pauseButton.addEventListener("click", onPause);
  previousButton.addEventListener("click", onPrevious);
  nextButton.addEventListener("click", onNext);
  listeners.push(
    () => playButton.removeEventListener("click", onPlay),
    () => pauseButton.removeEventListener("click", onPause),
    () => previousButton.removeEventListener("click", onPrevious),
    () => nextButton.removeEventListener("click", onNext)
  );

  row.append(previousButton, playButton, pauseButton, nextButton);

  const timeline = createRangeRow({
    id: `timeline-${overlay.id}`,
    label: "Tidslinje",
    min: 0,
    max: 0,
    value: 0,
    formatValue: () => plugin.getAnimationState().frameTime,
    onInput: async (value) => {
      await overlayManager.setVisible(overlay.id, true);
      await plugin.scrubTo(value);
      sync();
    }
  });
  listeners.push(timeline.release);

  const speed = createRangeRow({
    id: `speed-${overlay.id}`,
    label: "Hastighet",
    min: 0,
    max: SPEED_LABELS.length - 1,
    value: 1,
    formatValue: (value) => SPEED_LABELS[value] ?? "1×",
    onInput: (value) => {
      plugin.setSpeedIndex(value);
      sync();
    }
  });
  listeners.push(speed.release);

  const status = document.createElement("p");
  status.className = STATUS_CLASS;
  status.setAttribute("aria-live", "polite");

  anim.append(row, timeline.row, speed.row, status);

  const sync = (currentOverlay = overlay) => {
    const animation = plugin.getAnimationState();
    timeline.range.max = String(Math.max(0, animation.frameCount - 1));
    timeline.range.value = String(animation.frameIndex);
    timeline.range.setAttribute("aria-valuemax", timeline.range.max);
    timeline.range.setAttribute("aria-valuenow", timeline.range.value);
    timeline.output.textContent = animation.frameTime;
    speed.range.value = String(animation.speedIndex);
    speed.output.textContent = SPEED_LABELS[animation.speedIndex] ?? "1×";
    playButton.setAttribute("aria-pressed", String(animation.playing));
    status.textContent = currentOverlay.statusMessage || animation.frameTime;
    layerNode.dataset.enabled = currentOverlay.visible ? "true" : "false";
  };

  return { anim, sync };
};

export const createLayerPanelControl = ({ overlayManager }) => {
  let container = null;
  const listeners = [];
  const layerSyncHandlers = [];

  const render = (snapshot) => {
    if (!container) {
      return;
    }

    layerSyncHandlers.forEach((sync) => sync(snapshot));
  };

  return {
    onAdd: () => {
      container = document.createElement("section");
      container.className = ROOT_CLASS;
      container.setAttribute("role", "group");
      container.setAttribute("aria-label", "Kartlager och överlagringar");

      const header = document.createElement("header");
      header.className = "map-layer-panel__header";

      const title = document.createElement("p");
      title.className = TITLE_CLASS;
      title.textContent = "Lager";

      const collapseButton = document.createElement("button");
      collapseButton.type = "button";
      collapseButton.className = COLLAPSE_CLASS;
      collapseButton.setAttribute("aria-expanded", "true");
      collapseButton.setAttribute("aria-controls", "map-layer-panel-body");
      collapseButton.setAttribute("aria-label", "Minimera lagerpanel");
      collapseButton.textContent = "−";

      const onCollapse = () => {
        const collapsed = container.dataset.state === "collapsed";
        container.dataset.state = collapsed ? "expanded" : "collapsed";
        collapseButton.setAttribute("aria-expanded", String(collapsed));
        collapseButton.textContent = collapsed ? "−" : "+";
        collapseButton.setAttribute(
          "aria-label",
          collapsed ? "Minimera lagerpanel" : "Expandera lagerpanel"
        );
      };

      collapseButton.addEventListener("click", onCollapse);
      listeners.push(() => collapseButton.removeEventListener("click", onCollapse));

      header.append(title, collapseButton);

      const body = document.createElement("div");
      body.id = "map-layer-panel-body";
      body.className = "map-layer-panel__body";

      const hint = document.createElement("p");
      hint.className = HINT_CLASS;
      hint.textContent = "Växla överlagringar och justera genomskinlighet.";

      body.append(hint);

      const initialSnapshot = overlayManager.getState();
      const sections = groupBySection(initialSnapshot.overlays);

      sections.forEach((overlays, sectionName) => {
        const section = document.createElement("div");
        section.className = SECTION_CLASS;

        const sectionLabel = document.createElement("p");
        sectionLabel.className = SECTION_LABEL_CLASS;
        sectionLabel.textContent = sectionName;
        section.append(sectionLabel);

        overlays.forEach((overlay) => {
          const layerNode = document.createElement("div");
          layerNode.className = LAYER_CLASS;
          layerNode.dataset.layerId = overlay.id;
          layerNode.dataset.enabled = overlay.visible ? "true" : "false";

          const head = document.createElement("div");
          head.className = LAYER_HEAD_CLASS;

          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = TOGGLE_CLASS;
          toggle.setAttribute("aria-label", `Visa ${overlay.label}`);
          setToggleState({ button: toggle, visible: overlay.visible });

          const onToggle = async () => {
            await overlayManager.toggleVisible(overlay.id);
          };
          toggle.addEventListener("click", onToggle);
          listeners.push(() => toggle.removeEventListener("click", onToggle));

          const name = document.createElement("span");
          name.className = LAYER_NAME_CLASS;
          name.textContent = overlay.label;
          name.title = overlay.description ?? overlay.label;

          head.append(toggle, name);

          const opacity = createRangeRow({
            id: `opacity-${overlay.id}`,
            label: "Opacitet",
            min: Math.round((overlay.minOpacity ?? 0) * 100),
            max: Math.round((overlay.maxOpacity ?? 1) * 100),
            value: Math.round(overlay.opacity * 100),
            formatValue: (value) => `${value}%`,
            onInput: (value) => {
              overlayManager.setOpacity(overlay.id, value / 100);
            }
          });
          listeners.push(opacity.release);

          layerNode.append(head, opacity.row);

          let radarControls = null;
          if (overlay.controlType === OVERLAY_CONTROL_TYPES.RADAR) {
            radarControls = buildRadarControls({
              overlay,
              overlayManager,
              layerNode,
              listeners
            });
            if (radarControls?.anim) {
              layerNode.append(radarControls.anim);
            }
          }

          const syncLayer = (snapshot) => {
            const current = snapshot.overlays.find((item) => item.id === overlay.id);
            if (!current) {
              return;
            }

            setToggleState({ button: toggle, visible: current.visible });
            opacity.range.value = String(Math.round(current.opacity * 100));
            opacity.output.textContent = `${Math.round(current.opacity * 100)}%`;
            layerNode.dataset.enabled = current.visible ? "true" : "false";
            layerNode.dataset.status = current.status;
            radarControls?.sync?.(current);
          };

          layerSyncHandlers.push(syncLayer);
          section.append(layerNode);
        });

        body.append(section);
      });

      container.append(header, body);

      const unsubscribe = overlayManager.subscribe(render);
      listeners.push(unsubscribe);
      render(initialSnapshot);

      return container;
    },

    onRemove: () => {
      releaseListeners(listeners);
      layerSyncHandlers.length = 0;
      container?.remove();
      container = null;
    }
  };
};
