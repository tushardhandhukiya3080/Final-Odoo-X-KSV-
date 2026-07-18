import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

// Animated WebGL gradient tuned to the brand palette (green → deep green → lime).
// Rendered behind hero content; pointer-events are disabled by the parent wrapper.
export default function ShaderHero() {
  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      pixelDensity={1}
      fov={40}
    >
      <ShaderGradient
        control="props"
        animate="on"
        type="waterPlane"
        uSpeed={0.3}
        uStrength={1.6}
        uDensity={1.4}
        uFrequency={5.5}
        uAmplitude={0}
        positionX={0}
        positionY={0}
        positionZ={0}
        rotationX={50}
        rotationY={0}
        rotationZ={-60}
        color1="#1e3a8a"
        color2="#3b82f6"
        color3="#2dd4bf"
        reflection={0.1}
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={3.4}
        cameraZoom={1}
        lightType="3d"
        brightness={1.25}
        envPreset="city"
        grain="on"
        toggleAxis={false}
        zoomOut={false}
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  );
}
