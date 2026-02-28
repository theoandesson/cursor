const CAMERA_ANIMATION_MS = 220;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getMaxPitch = (map) => {
  if (typeof map.getMaxPitch === "function") {
    return map.getMaxPitch();
  }
  return 85;
};

const withAnimation = (cameraOptions) => ({
  ...cameraOptions,
  duration: CAMERA_ANIMATION_MS,
  essential: true
});

export const createCameraActions = ({ map, mapConfig, controlConfig }) => {
  const panBy = (xOffset, yOffset) => {
    map.panBy([xOffset, yOffset], {
      duration: CAMERA_ANIMATION_MS,
      essential: true
    });
  };

  const rotateBy = (degrees) => {
    map.easeTo(
      withAnimation({
        bearing: map.getBearing() + degrees
      })
    );
  };

  const changePitchBy = (degrees) => {
    const nextPitch = clamp(map.getPitch() + degrees, 0, getMaxPitch(map));
    map.easeTo(
      withAnimation({
        pitch: nextPitch
      })
    );
  };

  return {
    panNorth: () => panBy(0, -controlConfig.panStepPixels),
    panSouth: () => panBy(0, controlConfig.panStepPixels),
    panWest: () => panBy(-controlConfig.panStepPixels, 0),
    panEast: () => panBy(controlConfig.panStepPixels, 0),
    rotateLeft: () => rotateBy(-controlConfig.rotateStepDegrees),
    rotateRight: () => rotateBy(controlConfig.rotateStepDegrees),
    tiltUp: () => changePitchBy(controlConfig.pitchStepDegrees),
    tiltDown: () => changePitchBy(-controlConfig.pitchStepDegrees),
    resetOrientation: () =>
      map.easeTo(
        withAnimation({
          bearing: mapConfig.bearing,
          pitch: mapConfig.pitch
        })
      )
  };
};
