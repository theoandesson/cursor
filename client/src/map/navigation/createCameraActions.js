const CAMERA_ANIMATION_MS = 170;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getMaxPitch = (map) => {
  if (typeof map.getMaxPitch === "function") {
    return map.getMaxPitch();
  }
  return 85;
};

export const createCameraActions = ({
  map,
  mapConfig,
  controlConfig,
  getIsInverted = () => false
}) => {
  const isInverted = () => Boolean(getIsInverted());

  const getMovementDirection = () => (isInverted() ? -1 : 1);

  const getPanStepPixels = () => {
    const zoom = map.getZoom();
    const factor =
      zoom >= controlConfig.nearZoomThreshold
        ? controlConfig.nearZoomPanFactor
        : zoom >= controlConfig.mediumZoomThreshold
          ? controlConfig.mediumZoomPanFactor
          : 1;
    const computed = Math.round(controlConfig.panStepPixels * factor);
    return Math.max(controlConfig.minPanStepPixels, computed);
  };

  const getAnimationDuration = () => {
    const baseDuration = controlConfig.animationMs ?? CAMERA_ANIMATION_MS;
    const nearZoomDuration =
      map.getZoom() >= controlConfig.nearZoomThreshold
        ? Math.round(baseDuration * 0.74)
        : baseDuration;
    return Math.max(90, nearZoomDuration);
  };

  const withAnimation = (cameraOptions) => ({
    ...cameraOptions,
    duration: getAnimationDuration(),
    essential: true
  });

  const panBy = (xOffset, yOffset) => {
    map.stop();
    map.panBy([xOffset, yOffset], {
      duration: getAnimationDuration(),
      essential: true
    });
  };

  const rotateBy = (degrees) => {
    map.stop();
    map.easeTo(
      withAnimation({
        bearing: map.getBearing() + degrees
      })
    );
  };

  const changePitchBy = (degrees) => {
    const nextPitch = clamp(map.getPitch() + degrees, 0, getMaxPitch(map));
    map.stop();
    map.easeTo(
      withAnimation({
        pitch: nextPitch
      })
    );
  };

  return {
    panNorth: () => panBy(0, -getPanStepPixels() * getMovementDirection()),
    panSouth: () => panBy(0, getPanStepPixels() * getMovementDirection()),
    panWest: () => panBy(-getPanStepPixels() * getMovementDirection(), 0),
    panEast: () => panBy(getPanStepPixels() * getMovementDirection(), 0),
    rotateLeft: () => rotateBy(-controlConfig.rotateStepDegrees * getMovementDirection()),
    rotateRight: () => rotateBy(controlConfig.rotateStepDegrees * getMovementDirection()),
    tiltUp: () => changePitchBy(controlConfig.pitchStepDegrees * getMovementDirection()),
    tiltDown: () => changePitchBy(-controlConfig.pitchStepDegrees * getMovementDirection()),
    resetOrientation: () => {
      map.stop();
      map.easeTo(
        withAnimation({
          bearing: mapConfig.bearing,
          pitch: mapConfig.pitch
        })
      );
    }
  };
};
