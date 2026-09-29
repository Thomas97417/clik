import { useMemo } from "react";
import {
  Color,
  CustomBlending,
  DoubleSide,
  OneFactor,
  OneMinusSrcAlphaFactor,
  SrcAlphaFactor,
} from "three";

const vertexShader = /* glsl */ `
  varying vec2 gridPosition;
  void main() {
    vec3 ground = vec3(position.x * 100000.0, 0.0, position.y * 100000.0);
    // Recenter geometry in whole cells, keeping the pattern fixed in world space.
    ground.xz += floor(cameraPosition.xz / 100.0) * 100.0;
    gridPosition = ground.xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(ground, 1.0);
  }
`;
const fragmentShader = /* glsl */ `
  varying vec2 gridPosition;
  uniform float cellSize;
  uniform vec3 cellColor;
  uniform vec3 sectionColor;

  // Integral of a periodic pulse. Integrating across a pixel's footprint avoids
  // sampling a single, rapidly alternating line at grazing viewing angles.
  vec2 pulseIntegral(vec2 p, vec2 width) {
    return floor(p) * width + min(fract(p), width);
  }
  float filteredGrid(float size, float thickness) {
    vec2 uv = gridPosition / size;
    vec2 footprint = max(fwidth(uv), vec2(0.000001));
    vec2 width = min(footprint * thickness, vec2(0.12));
    vec2 center = uv + width * 0.5;
    vec2 coverage = clamp((pulseIntegral(center + footprint * 0.5, width)
      - pulseIntegral(center - footprint * 0.5, width)) / footprint, 0.0, 1.0);
    // Before cells become smaller than two pixels, converge to their average
    // coverage. This removes horizon moiré even during camera damping.
    coverage = mix(coverage, width, smoothstep(vec2(0.25), vec2(0.5), footprint));
    return 1.0 - (1.0 - coverage.x) * (1.0 - coverage.y);
  }
  void main() {
    float cell = filteredGrid(cellSize, 0.75);
    float section = filteredGrid(cellSize * 5.0, 1.2);
    float alpha = section + cell * (1.0 - section);
    if (alpha < 0.0001) discard;
    vec3 color = (sectionColor * section + cellColor * cell * (1.0 - section)) / alpha;
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function GroundGrid({ step }: { step: number }) {
  const uniforms = useMemo(
    () => ({
      cellSize: { value: step },
      cellColor: { value: new Color("#bcc8d8") },
      sectionColor: { value: new Color("#b4c1d4") },
    }),
    [step],
  );
  return (
    <mesh position={[0, -0.025, 0]} renderOrder={-2} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      {/* Opaque queue, alpha blending: draw behind pieces without depth conflicts. */}
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={false}
        blending={CustomBlending}
        blendSrc={SrcAlphaFactor}
        blendDst={OneMinusSrcAlphaFactor}
        blendSrcAlpha={OneFactor}
        blendDstAlpha={OneMinusSrcAlphaFactor}
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
